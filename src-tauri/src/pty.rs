use portable_pty::{native_pty_system, CommandBuilder, PtyPair, PtySize};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
pub struct PtyDataPayload {
    pub session_id: String,
    pub data: String,
}

#[derive(Clone, serde::Serialize)]
pub struct PtyExitPayload {
    pub session_id: String,
}

pub struct PtyManager {
    pair: PtyPair,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
}

impl PtyManager {
    pub fn new(cols: u16, rows: u16) -> Result<Self, String> {
        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

        Ok(Self {
            pair,
            writer: Arc::new(Mutex::new(writer)),
        })
    }

    pub fn spawn_command(
        &self,
        working_dir: Option<String>,
        command: Option<String>,
        env_vars: Vec<(String, String)>,
    ) -> Result<(), String> {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());

        match command {
            Some(cmd) if !cmd.is_empty() => {
                // Run the specified command via login shell
                let mut shell_cmd = CommandBuilder::new(&shell);
                shell_cmd.arg("-l");
                shell_cmd.arg("-c");

                let cwd_cmd = working_dir
                    .map(|d| format!("cd '{}' && ", d.replace("'", "'\\''")))
                    .unwrap_or_default();
                let full_cmd = format!("{}{}; exec \"$SHELL\"", cwd_cmd, cmd);
                shell_cmd.arg(&full_cmd);

                shell_cmd.env("TERM", "xterm-256color");
                shell_cmd.env("COLORTERM", "truecolor");
                shell_cmd.env("LANG", "en_US.UTF-8");
                for (key, value) in &env_vars {
                    shell_cmd.env(key, value);
                }

                self.pair
                    .slave
                    .spawn_command(shell_cmd)
                    .map_err(|e| format!("Failed to spawn command: {}", e))?;
            }
            _ => {
                // Plain login shell
                let mut cmd = CommandBuilder::new(&shell);
                cmd.arg("-l");

                if let Some(dir) = working_dir {
                    cmd.cwd(dir);
                }

                cmd.env("TERM", "xterm-256color");
                cmd.env("COLORTERM", "truecolor");
                cmd.env("LANG", "en_US.UTF-8");
                for (key, value) in &env_vars {
                    cmd.env(key, value);
                }

                self.pair
                    .slave
                    .spawn_command(cmd)
                    .map_err(|e| format!("Failed to spawn shell: {}", e))?;
            }
        }

        Ok(())
    }

    pub fn start_reader(&self, app_handle: AppHandle, session_id: String) -> Result<(), String> {
        let mut reader = self
            .pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to get PTY reader: {}", e))?;

        thread::spawn(move || {
            let mut buf = [0u8; 8192];
            let mut incomplete_utf8: Vec<u8> = Vec::new();

            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        let _ = app_handle.emit(
                            "pty-exit",
                            PtyExitPayload {
                                session_id: session_id.clone(),
                            },
                        );
                        break;
                    }
                    Ok(n) => {
                        let data_bytes = if incomplete_utf8.is_empty() {
                            buf[..n].to_vec()
                        } else {
                            let mut combined = std::mem::take(&mut incomplete_utf8);
                            combined.extend_from_slice(&buf[..n]);
                            combined
                        };

                        let valid_len = find_valid_utf8_boundary(&data_bytes);

                        if valid_len < data_bytes.len() {
                            incomplete_utf8 = data_bytes[valid_len..].to_vec();
                        }

                        if valid_len > 0 {
                            let data =
                                String::from_utf8_lossy(&data_bytes[..valid_len]).to_string();
                            let _ = app_handle.emit(
                                "pty-data",
                                PtyDataPayload {
                                    session_id: session_id.clone(),
                                    data,
                                },
                            );
                        }
                    }
                    Err(e) => {
                        eprintln!("PTY read error: {}", e);
                        break;
                    }
                }
            }
        });

        Ok(())
    }

    pub fn write(&self, data: &str) -> Result<(), String> {
        let mut writer = self
            .writer
            .lock()
            .map_err(|_| "Failed to lock writer".to_string())?;
        writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write to PTY: {}", e))?;
        writer
            .flush()
            .map_err(|e| format!("Failed to flush PTY: {}", e))?;
        Ok(())
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        self.pair
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize PTY: {}", e))?;
        Ok(())
    }
}

/// Find the last valid UTF-8 boundary in a byte slice.
fn find_valid_utf8_boundary(bytes: &[u8]) -> usize {
    if std::str::from_utf8(bytes).is_ok() {
        return bytes.len();
    }

    let len = bytes.len();

    for i in 1..=4.min(len) {
        let pos = len - i;
        let byte = bytes[pos];

        if (byte & 0xC0) != 0x80 {
            let remaining = len - pos;
            let expected_len = if byte < 0x80 {
                1
            } else if (byte & 0xE0) == 0xC0 {
                2
            } else if (byte & 0xF0) == 0xE0 {
                3
            } else if (byte & 0xF8) == 0xF0 {
                4
            } else {
                1
            };

            if remaining < expected_len {
                return pos;
            }
            if std::str::from_utf8(&bytes[pos..]).is_ok() {
                return len;
            }
        }
    }

    for i in (0..len).rev() {
        if std::str::from_utf8(&bytes[..=i]).is_ok() {
            return i + 1;
        }
    }

    0
}
