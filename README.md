# Clutch

Clutch is a terminal app optimized for running multiple Claude Code sessions.

## Download

[**macOS (Apple Silicon)**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_darwin_aarch64.dmg) | [**Linux (.deb)**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_linux_amd64.deb) | [**Linux (.AppImage)**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_linux_amd64.AppImage) | [**Linux (.rpm)**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_linux_x86_64.rpm) | [**Windows**](https://github.com/philip-zhan/clutch/releases/latest/download/Clutch_windows_x64.exe)

## Features

- **Auto worktree management** — Automatically creates and manages git worktrees for each session, keeping your work isolated
- **Notifications** — Get notified when Claude needs your attention
- **Session persistence** — Sessions restore across app restarts
- **Keyboard shortcuts** — `Cmd+T` new session, `Cmd+W` close, `Cmd+1-9` switch, `Cmd+Shift+[/]` navigate

## Development

```bash
bun install
bun run tauri:dev
```

This starts both the Vite dev server and compiles/runs the Rust backend.

### Build

```bash
bun run tauri:build
```

Produces an unsigned `.app` bundle in `src-tauri/target/release/bundle/`.

## License

MIT
