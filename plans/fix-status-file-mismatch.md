# Fix: Status files empty due to session ID mismatch

## Root Cause

Session IDs (nanoid) are regenerated on every app restart/hot-reload. But old Claude Code
processes survive with their original `CLUTCH_SESSION_ID`. The hooks write to directories
keyed by the old ID, which have been cleaned up and recreated under new IDs.

## Fix

Use `persistedTabId` (stable across restarts) for `CLUTCH_SESSION_ID` and session directories.
Keep ephemeral `sessionId` for PTY management (event routing, PtyState key).

## Changes

### Backend

1. **`commands.rs`** — `create_session`, `destroy_session`, `restart_session`:
   Add `status_id: Option<String>`. Use for session dir + `CLUTCH_SESSION_ID` env var.
   Fall back to `session_id` when `status_id` is None (panels).

### Frontend

2. **`usePty.ts`** — `spawn`/`destroy`: Accept `statusId`, pass as `status_id` to backend.
3. **`Terminal.tsx`** — Add `statusId?: string` prop, forward to `usePty`.
4. **`SessionContent.tsx`** — Pass `session.persistedTabId` as `statusId` to main Terminal.
5. **`usePolling.ts`** — Poll using `persistedTabId`, map results back to `sessionId`.
6. **`useSessionHandlers.ts`** — Pass `persistedTabId` to destroy.
