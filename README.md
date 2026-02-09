# Clutch

A desktop app for running multiple [Claude Code](https://docs.anthropic.com/en/docs/claude-code) sessions side by side. Built with React and Tauri.

![Clutch Screenshot](assets/screenshot.png)

## Download

[**macOS (Apple Silicon)**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_darwin_aarch64.dmg) | [**Linux (.deb)**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_linux_amd64.deb) | [**Linux (.AppImage)**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_linux_amd64.AppImage) | [**Linux (.rpm)**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_linux_x86_64.rpm) | [**Windows**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_windows_x64.exe)

## Features

- 🧠 **Multi-session** — Run parallel Claude Code sessions in tabs that persist across restarts
- 🌳 **Auto worktrees** — Each session gets its own git worktree and branch, auto-created and cleaned up
- 🔴 **Live status** — Color-coded indicators show if Claude is working, finished, waiting for input, or idle
- 🔔 **Notifications** — Audio alerts when Claude needs your attention, with multiple sound options
- ⚙️ **Configurable** — Default command, working directory, sidebar position, branch prefixes, and more

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
