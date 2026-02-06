# Clutch

Clutch is a desktop terminal that lets you run multiple Claude Code sessions side-by-side, with voice control coming soon.

**Website:** https://clutch.computer

## Features

- **Multi-session terminal** — Run multiple Claude Code instances in tabs with independent PTYs
- **Session persistence** — Sessions restore across app restarts
- **Keyboard-driven** — `Cmd+T` new session, `Cmd+W` close, `Cmd+1-9` switch, `Cmd+Shift+[/]` navigate
- **Configurable** — Sidebar position, default command, default working directory
- **Auto-updates** — Built-in update system with download and relaunch
- **Tray icon** — Runs in background, close hides to tray

## Getting Started

### Prerequisites

- [Bun](https://bun.sh)
- [Rust](https://rustup.rs)
- Tauri v2 prerequisites — see [Tauri docs](https://v2.tauri.app/start/prerequisites/)

### Development

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
