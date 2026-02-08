mod commands;
mod git;
mod hooks_config;
mod notifications;
mod pty;

use commands::{
    cleanup_session_worktree, create_session, destroy_session, get_git_branches, restart_session,
    session_resize, session_write, setup_session_worktree, validate_worktrees, PtyState,
    WorktreeRegistry,
};
use notifications::{poll_session_activity, SessionsDir};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use tauri::tray::TrayIconEvent;
#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;
use tauri::RunEvent;
use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(PtyState(Mutex::new(HashMap::new())))
        .manage(WorktreeRegistry(Mutex::new(HashSet::new())))
        .manage(Arc::new(
            SessionsDir::new().expect("Failed to create sessions directory"),
        ))
        .invoke_handler(tauri::generate_handler![
            create_session,
            destroy_session,
            restart_session,
            session_write,
            session_resize,
            setup_session_worktree,
            cleanup_session_worktree,
            validate_worktrees,
            poll_session_activity,
            get_git_branches,
        ])
        .setup(|app| {
            // Auto-configure Claude Code hooks (UserPromptSubmit + Stop + Notification)
            hooks_config::ensure_hooks();

            // Set up tray icon click handler
            if let Some(tray) = app.tray_by_id("main") {
                tray.on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            #[cfg(target_os = "macos")]
                            let _ = app.set_activation_policy(ActivationPolicy::Regular);
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                });
            }

            // Handle window close event - hide instead of quit
            if let Some(window) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                });
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {
            match &_event {
                // Handle dock icon click on macOS
                #[cfg(target_os = "macos")]
                RunEvent::Reopen { .. } => {
                    if let Some(window) = _app.get_webview_window("main") {
                        let _ = _app.set_activation_policy(ActivationPolicy::Regular);
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                // Clean up all PTYs and session dirs on exit (worktrees persist)
                RunEvent::Exit => {
                    let pty_state = _app.state::<PtyState>();
                    let sessions_dir = _app.state::<Arc<SessionsDir>>();
                    commands::cleanup_all(&pty_state, &sessions_dir);
                }
                _ => {}
            }
        });
}
