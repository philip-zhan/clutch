use crate::git;
use crate::notifications::SessionsDir;
use crate::pty::PtyManager;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};

pub struct PtyState(pub Mutex<HashMap<String, PtyManager>>);

pub struct WorktreeInfo {
    pub worktree_path: String,
    pub git_repo_path: String,
}

pub struct WorktreeRegistry(pub Mutex<HashMap<String, WorktreeInfo>>);

#[tauri::command]
pub fn create_session(
    state: State<'_, PtyState>,
    sessions_dir: State<'_, Arc<SessionsDir>>,
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

    // Create session directory for status tracking
    sessions_dir.create_session_dir(&session_id);

    let env_vars = vec![
        ("CLUTCH_SESSION_ID".to_string(), session_id.clone()),
    ];

    let pty = PtyManager::new(cols, rows)?;
    pty.spawn_command(working_dir, command, env_vars)?;
    pty.start_reader(app_handle, session_id.clone())?;

    map.insert(session_id, pty);
    Ok(())
}

#[tauri::command]
pub fn destroy_session(
    state: State<'_, PtyState>,
    sessions_dir: State<'_, Arc<SessionsDir>>,
    session_id: String,
) -> Result<(), String> {
    let mut map = state
        .0
        .lock()
        .map_err(|_| "Failed to lock PTY state".to_string())?;

    // Removing from the map drops PtyManager, which closes the PTY
    map.remove(&session_id);

    // Clean up session directory
    sessions_dir.remove_session_dir(&session_id);

    Ok(())
}

#[tauri::command]
pub fn restart_session(
    state: State<'_, PtyState>,
    sessions_dir: State<'_, Arc<SessionsDir>>,
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

    // Note: don't remove session dir here — create_session will reuse it

    // Create new
    create_session(state, sessions_dir, app_handle, session_id, cols, rows, working_dir, command)
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
pub fn setup_session_worktree(
    registry: State<'_, WorktreeRegistry>,
    worktree_id: String,
    branch_name: String,
    working_dir: String,
    location: String,
) -> git::WorktreeSetupResult {
    let result = git::setup_worktree_for_session(&working_dir, &branch_name, &location);
    if let (Some(wt_path), Some(repo_path)) = (&result.worktree_path, &result.git_repo_path) {
        if let Ok(mut map) = registry.0.lock() {
            map.insert(worktree_id, WorktreeInfo {
                worktree_path: wt_path.clone(),
                git_repo_path: repo_path.clone(),
            });
        }
    }
    result
}

#[tauri::command]
pub fn cleanup_session_worktree(
    registry: State<'_, WorktreeRegistry>,
    worktree_id: String,
    worktree_path: String,
    git_repo_path: String,
) -> git::WorktreeRemoveResult {
    let result = git::remove_worktree(&git_repo_path, &worktree_path);
    if result.success {
        if let Ok(mut map) = registry.0.lock() {
            map.remove(&worktree_id);
        }
    }
    result
}

#[tauri::command]
pub fn validate_worktrees(worktree_paths: Vec<String>) -> Vec<bool> {
    worktree_paths
        .iter()
        .map(|path| git::validate_worktree_path(path))
        .collect()
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

#[tauri::command]
pub fn get_git_branches(
    sessions: HashMap<String, String>,
) -> HashMap<String, String> {
    let mut result = HashMap::new();
    for (session_id, working_dir) in sessions {
        if let Some(branch) = git::get_branch(&working_dir) {
            result.insert(session_id, branch);
        }
    }
    result
}

/// Clean up all active PTYs and session dirs — called on app exit.
/// Worktrees are NOT cleaned up here; they persist for restoration on next launch.
pub fn cleanup_all(
    pty_state: &PtyState,
    sessions_dir: &Arc<SessionsDir>,
) {
    if let Ok(mut map) = pty_state.0.lock() {
        let session_ids: Vec<String> = map.keys().cloned().collect();
        map.clear();
        for id in &session_ids {
            sessions_dir.remove_session_dir(id);
        }
    }
}
