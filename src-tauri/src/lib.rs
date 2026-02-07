mod commands;
mod git;
mod hooks_config;
mod notifications;
mod pty;

use commands::{
    cleanup_session_worktree, create_session, destroy_session, restart_session, session_resize,
    session_write, setup_session_worktree, PtyState,
};
use notifications::{poll_session_activity, SessionsDir};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::tray::TrayIconEvent;
#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;
#[cfg(target_os = "macos")]
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
            poll_session_activity,
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
            // Handle dock icon click on macOS
            #[cfg(target_os = "macos")]
            if let RunEvent::Reopen { .. } = _event {
                if let Some(window) = _app.get_webview_window("main") {
                    let _ = _app.set_activation_policy(ActivationPolicy::Regular);
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });
}
