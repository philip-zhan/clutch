# Clutch

Clutch is a desktop terminal that lets you run multiple Claude Code sessions side-by-side.

**Website:** https://clutch.computer

## Features

- **Auto worktree management** — Automatically creates and manages git worktrees for each session, keeping your work isolated
- **Attention notifications** — Get notified when Claude needs your attention, with optional auto-switch to the relevant tab
- **Session persistence** — Sessions restore across app restarts
- **Keyboard-driven** — `Cmd+T` new session, `Cmd+W` close, `Cmd+1-9` switch, `Cmd+Shift+[/]` navigate

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
