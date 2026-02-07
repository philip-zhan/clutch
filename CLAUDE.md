# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

* After you come up with a plan, automatically save the plan in the `/plans` folder.

## Project Overview

**Clutch Desktop** is a multi-session terminal UI for Claude Code, built with React + Tauri. Each session runs an independent PTY with xterm.js rendering. Sessions persist across app restarts via `@tauri-apps/plugin-store`.

## Development Commands

- **Dev mode** (frontend + Rust): `bun run tauri:dev`
- **Frontend only**: `bun run dev` (Vite on `localhost:1420`)
- **Type-check**: `bun run check`
- **Production build**: `bun run tauri:build` (unsigned, app bundle only)
- **Package manager**: `bun`

## Architecture

```
React Frontend (Vite + TypeScript)
├── useSessionStore  — session CRUD + persistence (Tauri plugin-store → sessions.json)
├── usePty           — IPC bridge to Rust PTY commands
├── Terminal          — xterm.js rendering + resize + lifecycle
└── App              — keyboard shortcuts, session orchestration, layout
        ↕ Tauri IPC (invoke / listen)
Rust Backend (src-tauri/)
├── commands.rs      — Tauri command handlers (create/destroy/restart/write/resize)
├── pty.rs           — PTY lifecycle via portable-pty, reader thread → emit events
└── lib.rs           — Plugin registration, tray icon, window hide-on-close
```

**IPC flow**: Frontend calls `invoke("create_session", ...)` → Rust spawns PTY → reader thread emits `pty-data` events → Frontend listens via `listen<PtyDataPayload>("pty-data")` → writes to xterm.js.

**Session lifecycle**: Create (`create_session`) → PTY spawns login shell with optional command → reader thread streams output → on exit emits `pty-exit` → destroy (`destroy_session`) drops the `PtyManager`.

## Styling

- **Tailwind CSS v4** with `@theme` directive in `src/index.css` (no config file).
- **Use inline styles for spacing** (padding, margin, gap). Tailwind v4 spacing utilities don't work reliably in this Tauri setup.
- Tailwind classes work for colors, borders, typography, and other non-spacing properties.
- Example: `style={{ padding: 24, gap: 16 }}` instead of `className="p-6 gap-4"`
- Path alias: `@/*` → `./src/*`

## Key Patterns

- **Session IDs**: `ses_` + 12 random alphanumeric characters (generated in `src/lib/sessions.ts`).
- **State persistence**: `useSessionStore` hook syncs all state changes to Tauri's `plugin-store` (`sessions.json`). On load, all sessions are restored with `status: "exited"`.
- **PTY shell**: Uses `$SHELL -l` (login shell). When a command is given, runs `$SHELL -l -c "cd 'dir' && command; exec $SHELL"`. Sets `TERM=xterm-256color`.
- **Window behavior**: Close hides window to tray (not quit). Tray/dock click shows window.
