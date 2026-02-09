use crate::config;
use serde_json::{json, Value};
use std::path::PathBuf;

fn claude_settings_path() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(PathBuf::from(home).join(".claude").join("settings.json"))
}

fn hook_command(event_name: &str) -> String {
    let base = config::base_dir_name();
    format!(
        r#"f="$HOME/{base}/sessions/$CLUTCH_SESSION_ID/status"; t="$f.tmp.$$"; { echo "{event_name}"; cat "$f" 2>/dev/null; } > "$t" && mv "$t" "$f""#
    )
}

pub fn ensure_hooks() {
    eprintln!("[clutch:hooks] ensuring hooks are configured");
    let Some(settings_path) = claude_settings_path() else {
        eprintln!("[clutch:hooks] could not determine settings path");
        return;
    };
    eprintln!("[clutch:hooks] settings path: {:?}", settings_path);

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

    let events = [
        "UserPromptSubmit",
        "Stop",
        "Notification",
        "PreToolUse",
        "PermissionRequest",
        "TaskCompleted",
    ];
    for event in events {
        ensure_hook_entry(hooks_obj, event, &hook_command(event));
    }

    if let Ok(formatted) = serde_json::to_string_pretty(&settings) {
        let _ = std::fs::write(&settings_path, formatted);
    }
}

/// Ensure exactly one hook entry exists for the given event type with the given command.
/// Removes any stale Clutch entries and adds the current one if missing.
fn ensure_hook_entry(
    hooks_obj: &mut serde_json::Map<String, Value>,
    event_type: &str,
    command: &str,
) {
    let arr = hooks_obj
        .entry(event_type)
        .or_insert(json!([]))
        .as_array_mut();

    let arr = match arr {
        Some(a) => a,
        None => return,
    };

    // Remove any stale Clutch entries that don't match the current command
    arr.retain(|entry| {
        let is_clutch = entry
            .get("hooks")
            .and_then(|h| h.as_array())
            .map(|hooks| {
                hooks.iter().any(|hook| {
                    hook.get("command")
                        .and_then(|c| c.as_str())
                        .map(|c| c.contains("CLUTCH_SESSION_ID") || c.contains("CLUTCH_NOTIFY_DIR"))
                        .unwrap_or(false)
                })
            })
            .unwrap_or(false);
        !is_clutch
    });

    // Add the current command
    arr.push(json!({
        "matcher": "",
        "hooks": [{ "type": "command", "command": command }]
    }));
}
