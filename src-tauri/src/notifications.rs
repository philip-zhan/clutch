use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
pub struct SessionActivityPayload {
    pub session_id: String,
    pub activity: String, // "running" | "finished" | "needs_input"
}

pub struct SessionsDir {
    pub path: PathBuf,
}

impl SessionsDir {
    pub fn new() -> Result<Self, String> {
        let home = std::env::var("HOME")
            .map_err(|_| "HOME environment variable not set".to_string())?;
        let path = PathBuf::from(home).join(".clutch").join("sessions");
        std::fs::create_dir_all(&path)
            .map_err(|e| format!("Failed to create sessions dir: {}", e))?;
        Ok(Self { path })
    }

    pub fn create_session_dir(&self, session_id: &str) {
        let session_dir = self.path.join(session_id);
        let _ = std::fs::create_dir_all(&session_dir);
        // Write empty status file so the poller can seed it
        let _ = std::fs::write(session_dir.join("status"), "");
    }

    pub fn remove_session_dir(&self, session_id: &str) {
        let session_dir = self.path.join(session_id);
        let _ = std::fs::remove_dir_all(&session_dir);
    }
}

pub fn start_session_activity_poller(app_handle: AppHandle, sessions_dir: Arc<SessionsDir>) {
    eprintln!(
        "[clutch:poller] watching sessions dir: {:?}",
        sessions_dir.path
    );
    thread::spawn(move || {
        // Seed last-seen content from existing status files
        let mut last_seen: HashMap<String, String> = HashMap::new();
        if let Ok(entries) = std::fs::read_dir(&sessions_dir.path) {
            for entry in entries.flatten() {
                if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                    let session_id = entry.file_name().to_string_lossy().to_string();
                    let status_path = entry.path().join("status");
                    if let Ok(content) = std::fs::read_to_string(&status_path) {
                        let trimmed = content.trim().to_string();
                        last_seen.insert(session_id, trimmed);
                    }
                }
            }
        }
        eprintln!("[clutch:poller] seeded {} sessions", last_seen.len());

        loop {
            thread::sleep(Duration::from_millis(500));

            let entries = match std::fs::read_dir(&sessions_dir.path) {
                Ok(entries) => entries,
                Err(_) => continue,
            };

            // Track which session IDs we see this cycle (to clean up stale map entries)
            let mut seen_ids: Vec<String> = Vec::new();

            for entry in entries.flatten() {
                if !entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                    continue;
                }

                let session_id = entry.file_name().to_string_lossy().to_string();
                seen_ids.push(session_id.clone());

                let status_path = entry.path().join("status");
                let content = match std::fs::read_to_string(&status_path) {
                    Ok(c) => c.trim().to_string(),
                    Err(_) => continue,
                };

                // Skip empty content (initial state)
                if content.is_empty() {
                    last_seen.entry(session_id).or_default();
                    continue;
                }

                let prev = last_seen.get(&session_id).map(|s| s.as_str()).unwrap_or("");
                if content != prev {
                    let activity = match content.as_str() {
                        "UserPromptSubmit" => "running",
                        "Stop" => "finished",
                        "Notification" => "needs_input",
                        other => {
                            eprintln!(
                                "[clutch:poller] unknown status content '{}' for {}",
                                other, session_id
                            );
                            continue;
                        }
                    };

                    eprintln!(
                        "[clutch:poller] session {} activity changed: {} -> {} ({})",
                        session_id, prev, content, activity
                    );

                    let _ = app_handle.emit(
                        "session-activity-changed",
                        SessionActivityPayload {
                            session_id: session_id.clone(),
                            activity: activity.to_string(),
                        },
                    );

                    last_seen.insert(session_id, content);
                }
            }

            // Clean up map entries for deleted session dirs
            last_seen.retain(|id, _| seen_ids.contains(id));
        }
    });
}
