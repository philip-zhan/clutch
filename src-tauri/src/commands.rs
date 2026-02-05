use crate::pty::PtyManager;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, State};

pub struct PtyState(pub Mutex<HashMap<String, PtyManager>>);

#[tauri::command]
pub fn create_session(
    state: State<'_, PtyState>,
    app_handle: AppHandle,
    session_id: String,
    cols: u16,
    rows: u16,
    working_dir: Option<String>,
    command: Option<String>,
) -> Result<(), String> {
    let mut map = state
        .0
        .lock()
        .map_err(|_| "Failed to lock PTY state".to_string())?;

    // Don't create if already exists
    if map.contains_key(&session_id) {
        return Ok(());
    }

    let pty = PtyManager::new(cols, rows)?;
    pty.spawn_command(working_dir, command)?;
    pty.start_reader(app_handle, session_id.clone())?;

    map.insert(session_id, pty);
    Ok(())
}

#[tauri::command]
pub fn destroy_session(state: State<'_, PtyState>, session_id: String) -> Result<(), String> {
    let mut map = state
        .0
        .lock()
        .map_err(|_| "Failed to lock PTY state".to_string())?;

    // Removing from the map drops PtyManager, which closes the PTY
    map.remove(&session_id);
    Ok(())
}

#[tauri::command]
pub fn restart_session(
    state: State<'_, PtyState>,
    app_handle: AppHandle,
    session_id: String,
    cols: u16,
    rows: u16,
    working_dir: Option<String>,
    command: Option<String>,
) -> Result<(), String> {
    // Destroy existing
    {
        let mut map = state
            .0
            .lock()
            .map_err(|_| "Failed to lock PTY state".to_string())?;
        map.remove(&session_id);
    }

    // Create new
    create_session(state, app_handle, session_id, cols, rows, working_dir, command)
}

#[tauri::command]
pub fn session_write(
    state: State<'_, PtyState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let map = state
        .0
        .lock()
        .map_err(|_| "Failed to lock PTY state".to_string())?;

    if let Some(pty) = map.get(&session_id) {
        pty.write(&data)?;
    } else {
        return Err(format!("Session '{}' not found", session_id));
    }

    Ok(())
}

#[tauri::command]
pub fn session_resize(
    state: State<'_, PtyState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let map = state
        .0
        .lock()
        .map_err(|_| "Failed to lock PTY state".to_string())?;

    if let Some(pty) = map.get(&session_id) {
        pty.resize(cols, rows)?;
    } else {
        return Err(format!("Session '{}' not found", session_id));
    }

    Ok(())
}
