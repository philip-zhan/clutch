# Terminal Search Functionality

## Context

The terminal currently has no way to search through scrollback buffer content. Adding Cmd+F search is a standard terminal feature that lets users find text in terminal output. This uses xterm.js's official `SearchAddon`.

## Files to Change

| File | Action |
|------|--------|
| `package.json` | Add `@xterm/addon-search` dependency |
| `src/components/TerminalSearchBar.tsx` | **New** — search bar overlay component |
| `src/components/Terminal.tsx` | Load SearchAddon, add Cmd+F handler, render search bar |
| `src/index.css` | Add slide-in animation for search bar |

No changes to App.tsx, Rust backend, or hooks.

## Step 1: Install dependency

```
bun add @xterm/addon-search
```

## Step 2: Create `TerminalSearchBar.tsx`

A floating search bar positioned absolute top-right of the terminal container (z-index 10, above the gradient overlay at z-index 1).

**Layout:**
```
[Search input______]  [Aa] [.*]  │  3 of 12  │  [↑] [↓]  [✕]
```

**Props:**
- `searchAddon: SearchAddon` — the addon instance from Terminal
- `onClose: () => void` — called on Escape or X click
- `onSearchChange: (query: string, options: ISearchOptions) => void` — keeps parent in sync for Cmd+G

**Local state:** `query`, `caseSensitive`, `regex`, `resultIndex`, `resultCount`

**Behavior:**
- Auto-focus input on mount
- Live search on every keystroke via `searchAddon.findNext(query, { incremental: true, ... })`
- Enter → `findNext`, Shift+Enter → `findPrevious`
- Cmd+G / Cmd+Shift+G → next/previous
- `e.stopPropagation()` on all keydown to prevent xterm/global shortcut capture
- Subscribe to `searchAddon.onDidChangeResults` for match count display
- On unmount, call `searchAddon.clearDecorations()`

**Styling:** Inline styles for spacing, Tailwind for colors/borders. Uses theme variables (`--color-surface-elevated`, `--color-border`, etc.). Toggle buttons use "Aa" and ".*" text labels (active state: primary color tint).

**Decoration colors** (match highlighting in terminal):
- Match: semi-transparent blue `#3b82f633` (consistent with existing selection color)
- Active match: more opaque blue `#3b82f699` with solid border

## Step 3: Modify `Terminal.tsx`

1. **Add imports:** `SearchAddon`, `TerminalSearchBar`, `useState`
2. **Add refs/state:** `searchAddonRef`, `isSearchOpen` state, `searchQueryRef`, `searchOptionsRef`
3. **Load addon** in the init useEffect alongside FitAddon/WebLinksAddon:
   ```ts
   const searchAddon = new SearchAddon();
   terminal.loadAddon(searchAddon);
   searchAddonRef.current = searchAddon;
   ```
4. **Add Cmd+F/G keyboard handler** via `useEffect` with capture-phase listener:
   - Cmd+F → `setIsSearchOpen(true)`, `preventDefault` (blocks browser find dialog)
   - Cmd+G / Cmd+Shift+G → call `findNext`/`findPrevious` using stored query ref (works even when focus is in terminal, not search bar)
5. **Wrap return JSX** — add a relative-positioned parent div containing both the terminal div and the conditionally-rendered `TerminalSearchBar`
6. **On search close:** clear decorations, focus terminal

## Step 4: Add CSS animation

In `index.css`, add a subtle slide-in animation:

```css
@keyframes search-bar-slide-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## Verification

1. Run `bun run tauri:dev`
2. Open a terminal session, generate some output (e.g. `ls -la` or run a command)
3. Press Cmd+F — search bar should appear top-right with slide-in animation
4. Type a search query — matches highlight in the terminal, count shows "X of Y"
5. Press Enter to cycle forward, Shift+Enter to cycle backward
6. Toggle case sensitivity (Aa) and regex (.*) — search updates
7. Press Escape — search bar closes, highlights clear, terminal re-focuses
8. Verify Cmd+G / Cmd+Shift+G cycle matches when focus is in the terminal
9. Switch sessions — each has independent search state
10. Verify existing shortcuts (Cmd+T/W/,/1-9) still work
