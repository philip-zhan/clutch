use serde_json::{json, Value};
use std::path::PathBuf;

fn claude_settings_path() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(PathBuf::from(home).join(".claude").join("settings.json"))
}

const NOTIFY_HOOK_COMMAND: &str =
    r#"test -n "$CLUTCH_NOTIFY_DIR" && test -n "$CLUTCH_SESSION_ID" && touch "$CLUTCH_NOTIFY_DIR/notify_$CLUTCH_SESSION_ID""#;

const STOP_HOOK_COMMAND: &str =
    r#"test -n "$CLUTCH_NOTIFY_DIR" && test -n "$CLUTCH_SESSION_ID" && touch "$CLUTCH_NOTIFY_DIR/stop_$CLUTCH_SESSION_ID""#;

/// Legacy command without prefix — used for detection and migration
const LEGACY_HOOK_COMMAND: &str =
    r#"test -n "$CLUTCH_NOTIFY_DIR" && test -n "$CLUTCH_SESSION_ID" && touch "$CLUTCH_NOTIFY_DIR/$CLUTCH_SESSION_ID""#;

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

    // --- Notification hook ---
    ensure_hook_entry(hooks_obj, "Notification", NOTIFY_HOOK_COMMAND);

    // --- Stop hook ---
    ensure_hook_entry(hooks_obj, "Stop", STOP_HOOK_COMMAND);

    if let Ok(formatted) = serde_json::to_string_pretty(&settings) {
        let _ = std::fs::write(&settings_path, formatted);
    }
}

/// Ensure a hook entry exists for the given event type with the given command.
/// Migrates legacy (unprefixed) entries if found.
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

    // Check if the exact command is already present
    let has_current = arr.iter().any(|entry| entry_has_command(entry, command));
    if has_current {
        return;
    }

    // Migrate legacy unprefixed command if present (only relevant for Notification)
    let legacy_idx = arr
        .iter()
        .position(|entry| entry_has_command(entry, LEGACY_HOOK_COMMAND));

    if let Some(idx) = legacy_idx {
        // Replace legacy entry with the new prefixed command
        arr[idx] = json!({
            "matcher": "",
            "hooks": [{ "type": "command", "command": command }]
        });
        return;
    }

    // Check if there's any CLUTCH_NOTIFY_DIR entry (e.g. old prefixed command)
    let clutch_idx = arr.iter().position(|entry| {
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

    if let Some(idx) = clutch_idx {
        // Update existing clutch entry to new command
        arr[idx] = json!({
            "matcher": "",
            "hooks": [{ "type": "command", "command": command }]
        });
        return;
    }

    // No existing entry — add new one
    arr.push(json!({
        "matcher": "",
        "hooks": [{ "type": "command", "command": command }]
    }));
}

fn entry_has_command(entry: &Value, command: &str) -> bool {
    entry
        .get("hooks")
        .and_then(|h| h.as_array())
        .map(|hooks| {
            hooks.iter().any(|hook| {
                hook.get("command")
                    .and_then(|c| c.as_str())
                    .map(|c| c == command)
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}
