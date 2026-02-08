# Memorable Branch Names

## Context

Git branches created by Clutch worktrees use session IDs like `ses_mHAGnSuj1Pp0`, which are hard to identify at a glance. Replace these with memorable 3-word combinations (no prefix) like `brave-golden-falcon` or `gentle-red-panda` using the `unique-names-generator` package (275K weekly downloads, most popular option).

## Changes

### 1. Install `unique-names-generator`

```
bun add unique-names-generator
```

### 2. Update `generateSessionId()` in `src/lib/sessions.ts`

Replace the random alphanumeric generation with `unique-names-generator`:

```ts
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";

export function generateSessionId(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    separator: "-",
    length: 3,
  });
}
```

This produces 3-word IDs like `brave-golden-falcon`, `gentle-red-panda`. Using adjectives (1,500+) x colors (50+) x animals (350+) = 26M+ combinations. No prefix — the memorable name is the ID.

Branch names will then become e.g. `clutch/brave-golden-falcon` (with prefix) or `brave-golden-falcon` (without).

### 3. Update Settings preview text in `src/components/Settings.tsx`

Change the example text from `ses_abc123` to a memorable example like `brave-golden-falcon`.

## Files to modify

- `package.json` — add `unique-names-generator` dependency
- `src/lib/sessions.ts` — update `generateSessionId()`
- `src/components/Settings.tsx` — update preview text

## No changes needed

- `src-tauri/src/git.rs` — branch naming logic (`{prefix}{sessionId}`) works as-is
- `src/App.tsx` — consumes `generateSessionId()` unchanged
- Worktree cleanup in Rust — `try_delete_worktree_branch` matches by folder name suffix, still works

## Verification

1. `bun run check` — TypeScript compiles
2. Create a new session with worktree enabled — verify branch name is memorable
3. Close session — verify worktree cleanup still works
