# Fix: Windows app doesn't open after installation

## Root Cause

The app panics on startup on Windows because `std::env::var("HOME")` fails — Windows uses `USERPROFILE` instead. The panic is silent because the release binary has `windows_subsystem = "windows"` (no console).

The crash chain: `lib.rs` -> `SessionsDir::new().expect(...)` -> `notifications.rs` -> `std::env::var("HOME")` -> panic.

## Changes

1. **`config.rs`** — Added `home_dir()` helper that uses `USERPROFILE` on Windows, `HOME` on Unix
2. **`notifications.rs`** — Use `config::home_dir()` instead of `std::env::var("HOME")`
3. **`git.rs`** — Same fix for worktree "home" location
4. **`hooks_config.rs`** — Use `config::home_dir()` + add PowerShell hook commands for Windows
5. **`tauri.conf.json`** — Add `embedBootstrapper` WebView2 install mode so the installer doesn't rely on downloading WebView2 separately
