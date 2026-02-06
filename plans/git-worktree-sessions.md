# Plan: Auto-create git worktrees for new session tabs

## Behavior
- When a new session is created, check if the working directory is inside a git repo
- If yes: create a git worktree as a sibling directory, auto-generate a branch, and open the terminal there
- If no (or git unavailable): fall back to normal session behavior
- On tab close: safely remove the worktree (`git worktree remove`). If uncommitted changes exist, warn the user and keep it.

## Files to change

| File | Action |
|------|--------|
| `src-tauri/src/git.rs` | **Create** — git worktree helpers |
| `src-tauri/src/commands.rs` | **Modify** — add 2 new Tauri commands |
| `src-tauri/src/lib.rs` | **Modify** — register `mod git` + new commands |
| `src/lib/sessions.ts` | **Modify** — extend `Session` type, update `sessionDisplayName` |
| `src/App.tsx` | **Modify** — integrate worktree setup/cleanup into session create/close/restart |

## Step 1: Create `src-tauri/src/git.rs`

New Rust module with these functions:

- **`find_git_root(dir) -> Option<String>`** — runs `git rev-parse --show-toplevel` to check if a dir is in a git repo
- **`create_worktree(repo_root, session_id) -> Result<String, String>`** — runs `git worktree add -b session/{session_id} {repo}-{session_id}` as a sibling directory. Returns the worktree path.
- **`setup_worktree_for_session(working_dir, session_id) -> WorktreeSetupResult`** — orchestrates the above. Never errors; always returns an `effective_dir` to use (worktree path on success, original dir on fallback).
- **`remove_worktree(repo_root, worktree_path) -> WorktreeRemoveResult`** — runs `git worktree remove`, then best-effort `git branch -d` to clean up the branch. Returns `{ success, error }`.

Structs:
```rust
struct WorktreeSetupResult {
    effective_dir: String,        // dir the PTY should use
    worktree_path: Option<String>,
    git_repo_path: Option<String>,
}

struct WorktreeRemoveResult {
    success: bool,
    error: Option<String>,
}
```

## Step 2: Add Tauri commands in `src-tauri/src/commands.rs`

Two new commands (no new state needed — frontend passes paths):

- **`setup_session_worktree(session_id, working_dir) -> WorktreeSetupResult`** — calls `git::setup_worktree_for_session`
- **`cleanup_session_worktree(worktree_path, git_repo_path) -> WorktreeRemoveResult`** — calls `git::remove_worktree`. Accepts paths as params so it works even after app restart.

## Step 3: Register in `src-tauri/src/lib.rs`

- Add `mod git;`
- Import and register `setup_session_worktree` and `cleanup_session_worktree` in the invoke handler

## Step 4: Extend Session type in `src/lib/sessions.ts`

Add three optional fields to `Session`:
```typescript
worktreePath?: string;        // absolute path to worktree dir (if created)
gitRepoPath?: string;         // absolute path to original git repo root
originalWorkingDir?: string;  // user's original dir (before worktree redirect)
```

Update `sessionDisplayName` to prefer `originalWorkingDir` over `workingDir` so the sidebar shows the repo name, not the worktree dirname.

## Step 5: Integrate in `src/App.tsx`

### `handleCreateSession` (make async)
Before creating the session:
1. Call `invoke("setup_session_worktree", { sessionId, workingDir })`
2. Use `result.effective_dir` as the session's `workingDir`
3. Store `result.worktree_path`, `result.git_repo_path`, and the original `workingDir` on the Session

### `handleCloseSession`
After destroying the PTY, if `session.worktreePath` exists:
1. Call `invoke("cleanup_session_worktree", { worktreePath, gitRepoPath })`
2. If `!result.success`, show a warning dialog via `@tauri-apps/plugin-dialog`

### `handleRestartSession`
Use `session.originalWorkingDir ?? session.workingDir` as the directory for the new session, so it re-creates a fresh worktree from the original repo (not from the old worktree).

## Verification

1. `cargo check --manifest-path src-tauri/Cargo.toml` — Rust compiles
2. `npx tsc --noEmit` — TypeScript compiles
3. Create session in a git repo dir → verify sibling worktree directory exists, terminal `pwd` shows worktree, `git branch` shows `session/ses_*`
4. Create session in a non-git dir → verify normal behavior, no worktree created
5. Close a worktree session → verify worktree dir removed, branch deleted
6. Close a worktree session with uncommitted changes → verify warning dialog, worktree kept
7. Restart a worktree session → old worktree cleaned, new one created
8. Quit app, relaunch, close a restored worktree session → verify cleanup still works (uses persisted session fields)
