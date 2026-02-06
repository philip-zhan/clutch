use serde_json::{json, Value};
use std::path::PathBuf;

fn claude_settings_path() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(PathBuf::from(home).join(".claude").join("settings.json"))
}

const CLUTCH_HOOK_COMMAND: &str =
    r#"test -n "$CLUTCH_NOTIFY_DIR" && test -n "$CLUTCH_SESSION_ID" && touch "$CLUTCH_NOTIFY_DIR/$CLUTCH_SESSION_ID""#;

pub fn ensure_notification_hook() {
    let Some(settings_path) = claude_settings_path() else {
        return;
    };

    let mut settings: Value = if settings_path.exists() {
        match std::fs::read_to_string(&settings_path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or(json!({})),
            Err(_) => return,
        }
    } else {
        json!({})
    };

    if let Some(parent) = settings_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let hooks = settings
        .as_object_mut()
        .unwrap()
        .entry("hooks")
        .or_insert(json!({}));

    let hooks_obj = match hooks.as_object_mut() {
        Some(obj) => obj,
        None => return,
    };

    let notification = hooks_obj.entry("Notification").or_insert(json!([]));

    let notification_arr = match notification.as_array_mut() {
        Some(arr) => arr,
        None => return,
    };

    let already_configured = notification_arr.iter().any(|entry| {
        entry
            .get("hooks")
            .and_then(|h| h.as_array())
            .map(|hooks| {
                hooks.iter().any(|hook| {
                    hook.get("command")
                        .and_then(|c| c.as_str())
                        .map(|c| c.contains("CLUTCH_NOTIFY_DIR"))
                        .unwrap_or(false)
                })
            })
            .unwrap_or(false)
    });

    if already_configured {
        return;
    }

    notification_arr.push(json!({
        "matcher": "",
        "hooks": [
            {
                "type": "command",
                "command": CLUTCH_HOOK_COMMAND
            }
        ]
    }));

    if let Ok(formatted) = serde_json::to_string_pretty(&settings) {
        let _ = std::fs::write(&settings_path, formatted);
    }
}
