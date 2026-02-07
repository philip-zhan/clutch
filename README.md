# Clutch

Clutch is a terminal app optimized for running multiple Claude Code sessions.

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
