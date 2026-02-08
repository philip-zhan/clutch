use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;

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

        // Clean up any stale session dirs from previous runs (crash recovery)
        if let Ok(entries) = std::fs::read_dir(&path) {
            for entry in entries.flatten() {
                let _ = std::fs::remove_dir_all(entry.path());
            }
        }

        Ok(Self { path })
    }

    pub fn create_session_dir(&self, session_id: &str) {
        let session_dir = self.path.join(session_id);
        let _ = std::fs::create_dir_all(&session_dir);
        // Write empty status file
        let _ = std::fs::write(session_dir.join("status"), "");
    }

    pub fn remove_session_dir(&self, session_id: &str) {
        let session_dir = self.path.join(session_id);
        let _ = std::fs::remove_dir_all(&session_dir);
    }
}

/// Called from frontend on an interval. Reads status files for the given session IDs
/// and returns a map of session_id -> status content (trimmed).
/// Only includes sessions whose status file exists and is non-empty.
#[tauri::command]
pub fn poll_session_activity(
    sessions_dir: State<'_, Arc<SessionsDir>>,
    session_ids: Vec<String>,
) -> HashMap<String, String> {
    let mut result = HashMap::new();
    for id in session_ids {
        let status_path = sessions_dir.path.join(&id).join("status");
        if let Ok(content) = std::fs::read_to_string(&status_path) {
            if let Some(first_line) = content.lines().next() {
                let trimmed = first_line.trim().to_string();
                if !trimmed.is_empty() {
                    result.insert(id, trimmed);
                }
            }
        }
    }
    result
}
