# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Clutch Desktop** is a multi-session terminal UI for Claude Code, built with React + Tauri. Each session runs an independent PTY with xterm.js rendering. Worktrees persist across app restarts via `@tauri-apps/plugin-store` and drive session restoration on startup.

## Architecture

### Session vs Worktree

- **Session** — ephemeral runtime object (nanoid). Represents a running PTY + terminal UI. Destroyed on app quit. Never persisted.
- **Worktree** — persistent across restarts (nanoid). Represents a git worktree + branch. Stored in `@tauri-apps/plugin-store`. Cleaned up when a tab is explicitly closed, but NOT when the app quits.
- On startup, one session is created per persisted worktree. The first session (main branch) has no worktree.
- Branch names use `unique-names-generator` (adjective-color-animal), decoupled from session IDs.

## Rules

* After you come up with a plan, automatically save the plan in the `/plans` folder.
* Prefer shadcn components over custom components.
* Use inline styles for spacing (padding, margin, gap). Tailwind v4 spacing utilities don't work reliably in this Tauri setup. Example: `style={{ padding: 24, gap: 16 }}` instead of `className="p-6 gap-4"`
