use std::path::PathBuf;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
pub struct NeedsAttentionPayload {
    pub session_id: String,
}

#[derive(Clone, serde::Serialize)]
pub struct SessionStoppedPayload {
    pub session_id: String,
}

pub struct NotifyDir {
    pub path: PathBuf,
}

impl NotifyDir {
    pub fn new() -> Result<Self, String> {
        let pid = std::process::id();
        let path = std::env::temp_dir().join(format!("clutch-notifications-{}", pid));
        std::fs::create_dir_all(&path)
            .map_err(|e| format!("Failed to create notification dir: {}", e))?;
        Ok(Self { path })
    }

    pub fn path_str(&self) -> String {
        self.path.to_string_lossy().to_string()
    }
}

impl Drop for NotifyDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

pub fn start_notification_poller(app_handle: AppHandle, notify_dir: Arc<NotifyDir>) {
    eprintln!("[clutch:poller] watching dir: {:?}", notify_dir.path);
    thread::spawn(move || loop {
        thread::sleep(Duration::from_millis(500));

        let entries = match std::fs::read_dir(&notify_dir.path) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let file_name = entry.file_name();
            let name = file_name.to_string_lossy().to_string();
            eprintln!("[clutch:poller] found file: {}", name);

            let _ = std::fs::remove_file(entry.path());

            if let Some(session_id) = name.strip_prefix("stop_") {
                eprintln!("[clutch:poller] emitting session-stopped for {}", session_id);
                let _ = app_handle.emit(
                    "session-stopped",
                    SessionStoppedPayload {
                        session_id: session_id.to_string(),
                    },
                );
            } else if let Some(session_id) = name.strip_prefix("notify_") {
                eprintln!("[clutch:poller] emitting session-needs-attention for {}", session_id);
                let _ = app_handle.emit(
                    "session-needs-attention",
                    NeedsAttentionPayload {
                        session_id: session_id.to_string(),
                    },
                );
            } else {
                // Legacy: bare session_id without prefix → treat as notification
                eprintln!("[clutch:poller] emitting session-needs-attention (legacy) for {}", name);
                let _ = app_handle.emit(
                    "session-needs-attention",
                    NeedsAttentionPayload {
                        session_id: name,
                    },
                );
            }
        }
    });
}
