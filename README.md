# Clutch

A desktop app for running multiple [Claude Code](https://docs.anthropic.com/en/docs/claude-code) sessions side by side. Built with React and Tauri.

![Clutch Screenshot](assets/screenshot.png)

## Download

[**macOS (Apple Silicon)**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_darwin_aarch64.dmg) | [**Linux (.deb)**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_linux_amd64.deb) | [**Linux (.AppImage)**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_linux_amd64.AppImage) | [**Linux (.rpm)**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_linux_x86_64.rpm) | [**Windows**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_windows_x64.exe)

## Features

### Multi-Session Workflow

Run as many Claude Code sessions as you need, each in its own tab with a full terminal. Switch between them instantly. Sessions persist across app restarts so you never lose your place.

### Automatic Git Worktree Management

Every new session can get its own isolated git worktree and branch, so parallel tasks never collide. Worktrees are created automatically and cleaned up when you close a tab. Branch names are auto-generated (e.g. `brave-blue-falcon`) with optional custom prefixes.

### Live Activity Indicators

See at a glance what each session is doing:

- **Blue (pulsing)** -- Claude is working
- **Green** -- Task finished
- **Orange (pulsing)** -- Claude needs your input
- **Gray** -- Idle

### Notifications

Get audio alerts when Claude needs attention. Choose from multiple notification sounds (chime, bell, pulse, soft) or turn them off entirely.

### Terminal Search

Search terminal output with `Cmd+F`. Supports regex and case-sensitive matching with highlighted results.

### Customizable Settings

Configure the default command, working directory, sidebar position, worktree behavior, branch prefixes, and notification sounds.

## Keyboard Shortcuts

| Action | macOS | Linux / Windows |
| --- | --- | --- |
| New session | `Cmd+T` | `Ctrl+T` |
| Close session | `Cmd+W` | `Ctrl+W` |
| Switch to session 1-9 | `Cmd+1-9` | `Ctrl+1-9` |
| Previous session | `Cmd+Shift+[` | `Ctrl+Shift+[` |
| Next session | `Cmd+Shift+]` | `Ctrl+Shift+]` |
| Toggle sidebar | `Cmd+B` | `Ctrl+B` |
| Toggle terminal panel | `Cmd+J` | `Ctrl+J` |
| Open settings | `Cmd+,` | `Ctrl+,` |
| Find in terminal | `Cmd+F` | `Ctrl+F` |
| Find next | `Enter` / `Cmd+G` | `Enter` / `Ctrl+G` |
| Find previous | `Shift+Enter` / `Cmd+Shift+G` | `Shift+Enter` / `Ctrl+Shift+G` |

## Development

### Prerequisites

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri CLI prerequisites](https://v2.tauri.app/start/prerequisites/)

### Getting Started

```bash
# Install dependencies
bun install

# Start the dev server + Rust backend
bun run tauri:dev
```

### Build

```bash
bun run tauri:build
```

Produces platform-specific bundles in `src-tauri/target/release/bundle/`.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
