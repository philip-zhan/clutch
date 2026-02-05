mod commands;
mod pty;

use commands::{create_session, destroy_session, restart_session, session_resize, session_write, PtyState};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::tray::TrayIconEvent;
use tauri::{ActivationPolicy, Manager, RunEvent, WindowEvent};

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
        .invoke_handler(tauri::generate_handler![
            create_session,
            destroy_session,
            restart_session,
            session_write,
            session_resize,
        ])
        .setup(|app| {
            // Set up tray icon click handler
            if let Some(tray) = app.tray_by_id("main") {
                tray.on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
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
        .run(|app, event| {
            // Handle dock icon click on macOS
            if let RunEvent::Reopen { .. } = event {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = app.set_activation_policy(ActivationPolicy::Regular);
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });
}
