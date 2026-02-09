# Contributing to Clutch

Thanks for your interest in contributing to Clutch! This guide will help you get started.

## Getting Started

1. **Fork the repo** and clone your fork locally
2. **Install dependencies:**
   ```bash
   bun install
   ```
3. **Start the dev environment:**
   ```bash
   bun run tauri:dev
   ```
   This starts both the Vite dev server (React frontend) and compiles/runs the Rust backend.

## Project Structure

```
clutch/
├── src/                  # React frontend (TypeScript)
│   ├── components/       # UI components
│   ├── hooks/            # React hooks
│   ├── lib/              # Utilities and helpers
│   └── App.tsx           # Root component
├── src-tauri/            # Rust backend
│   └── src/
│       ├── lib.rs        # Plugin registration and app setup
│       ├── commands.rs   # Tauri IPC command handlers
│       └── pty.rs        # PTY lifecycle management
├── assets/               # Static assets (screenshots, etc.)
└── CLAUDE.md             # AI assistant instructions
```

## Development Guidelines

- **Package manager:** Use `bun` (not npm/yarn/pnpm)
- **UI components:** Prefer [shadcn/ui](https://ui.shadcn.com/) components over custom ones
- **Spacing:** Use inline styles for padding, margin, and gap (Tailwind v4 spacing utilities don't work reliably in this Tauri setup)
- **File size:** Try to keep each file under 200 lines of code
- **Type checking:** Run `bun run check` to verify TypeScript types

## Making Changes

1. Create a branch from `main`
2. Make your changes
3. Test locally with `bun run tauri:dev`
4. Run type checking: `bun run check`
5. Commit with a clear, descriptive message
6. Open a pull request against `main`

## Pull Requests

- Keep PRs focused on a single change
- Describe **what** you changed and **why**
- Include screenshots for UI changes
- Make sure the app builds: `bun run tauri:build`

## Reporting Issues

Found a bug or have a feature request? [Open an issue](https://github.com/philip-zhan/clutch/issues) with:

- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Your OS and app version
- Screenshots if applicable

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
