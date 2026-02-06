# Session Attention Indicator

## Context

When Claude Code is running in a Clutch session and needs user input (permission prompt, idle/waiting for input, asking a question via elicitation), there's no visual indicator in the sidebar. Users have to manually check each session to see if it needs attention. This feature adds a pulsing amber dot in the sidebar for sessions that need attention, using Claude Code's `Notification` hook to detect the state.

## Architecture

```
Claude Code (in PTY)
  → fires Notification hook (permission_prompt, idle_prompt, elicitation_dialog)
  → hook runs: touch "$CLUTCH_NOTIFY_DIR/$CLUTCH_SESSION_ID"

Rust backend (std::thread poller)
  → polls /tmp/clutch-notifications-{PID}/ every 500ms
  → reads filenames as session IDs, deletes files
  → emits "session-needs-attention" Tauri event

React frontend
  → listens for event, sets needsAttention=true on session
  → clears needsAttention when user switches to session
  → sidebar renders pulsing amber dot
```

## Implementation Steps

### 1. Add `needsAttention` to Session type
**File:** `src/lib/sessions.ts`

Add `needsAttention?: boolean` to the `Session` interface. Optional so existing persisted sessions work.

### 2. Update session store
**File:** `src/hooks/useSessionStore.ts`

- Reset `needsAttention: false` on load (alongside existing `status: "exited"` reset)
- Add `setNeedsAttention(sessionId, boolean)` callback
- Strip `needsAttention` from persistence (it's transient runtime state)

### 3. Create notification poller module
**File:** `src-tauri/src/notifications.rs` (new)

- `NotifyDir` struct: creates `/tmp/clutch-notifications-{PID}/` on init, removes on drop
- `start_notification_poller()`: spawns a `std::thread` that polls the directory every 500ms, reads filenames as session IDs, emits `"session-needs-attention"` Tauri events, deletes processed files
- Uses `std::thread` (consistent with PTY reader pattern in `pty.rs`, no extra tokio features needed)

### 4. Auto-configure Claude Code hook
**File:** `src-tauri/src/hooks_config.rs` (new)

On app startup, read `~/.claude/settings.json`, merge a `Notification` hook if not already present:

```json
{
  "hooks": {
    "Notification": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "test -n \"$CLUTCH_NOTIFY_DIR\" && test -n \"$CLUTCH_SESSION_ID\" && touch \"$CLUTCH_NOTIFY_DIR/$CLUTCH_SESSION_ID\""
      }]
    }]
  }
}
```

The `test -n "$CLUTCH_NOTIFY_DIR"` guard makes the hook a no-op when Claude Code runs outside of Clutch. Detection of existing hook: checks if any Notification hook command contains `CLUTCH_NOTIFY_DIR`.

### 5. Pass env vars to PTY
**File:** `src-tauri/src/pty.rs`

Add `env_vars: Vec<(String, String)>` parameter to `spawn_command()`. Apply them in both command branches alongside existing `TERM`/`COLORTERM`/`LANG` env vars.

### 6. Wire up env vars in commands
**File:** `src-tauri/src/commands.rs`

- In `create_session()`: access `NotifyDir` state, build env vars vec with `CLUTCH_SESSION_ID` and `CLUTCH_NOTIFY_DIR`, pass to `spawn_command()`
- Update `restart_session()` accordingly

### 7. Register modules and start services
**File:** `src-tauri/src/lib.rs`

- Add `mod notifications; mod hooks_config;`
- In `.setup()`: call `hooks_config::ensure_notification_hook()`, create `NotifyDir`, `.manage()` it as state, start poller
- `NotifyDir` wrapped in `Arc` for shared ownership between managed state and poller thread

### 8. Add pulse animation
**File:** `src/index.css`

```css
@keyframes pulse-attention {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
  50% { opacity: 0.7; box-shadow: 0 0 6px 2px rgba(245, 158, 11, 0.3); }
}
```

Uses existing `--color-warning: #f59e0b` (amber) from the theme.

### 9. Update sidebar dots
**File:** `src/components/Sidebar.tsx`

Both vertical and horizontal sidebars: when `session.needsAttention` is true, render the dot with `bg-warning` class and the `pulse-attention` animation instead of the normal green/gray dot.

### 10. Listen for events and clear attention
**File:** `src/App.tsx`

- Listen for `"session-needs-attention"` events, set `needsAttention: true` (only if session is not the active one)
- Wrap `setActiveSession` to also clear `needsAttention` on the selected session
- Use a ref for `activeSessionId` in the listener to avoid stale closures

## Files Changed

| File | Action |
|------|--------|
| `src/lib/sessions.ts` | modify |
| `src/hooks/useSessionStore.ts` | modify |
| `src-tauri/src/notifications.rs` | create |
| `src-tauri/src/hooks_config.rs` | create |
| `src-tauri/src/pty.rs` | modify |
| `src-tauri/src/commands.rs` | modify |
| `src-tauri/src/lib.rs` | modify |
| `src/index.css` | modify |
| `src/components/Sidebar.tsx` | modify |
| `src/App.tsx` | modify |

## Verification

1. Build the Rust backend: `cd src-tauri && cargo build`
2. Run the app: `bun run tauri:dev`
3. Create a session running `claude`
4. In the Claude Code session, trigger a permission prompt (e.g. ask Claude to edit a file)
5. Switch to a different session — the first session's dot should turn amber and pulse
6. Switch back to the first session — the amber dot should clear
7. Verify the hook was added to `~/.claude/settings.json`
8. Verify running `claude` outside Clutch doesn't produce errors (hook is a no-op)
