# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Clutch Desktop** is a multi-session terminal UI for Claude Code, built with React + Tauri. Each session runs an independent PTY with xterm.js rendering. Sessions persist across app restarts via `@tauri-apps/plugin-store`.


## Rules

* After you come up with a plan, automatically save the plan in the `/plans` folder.
* Prefer shadcn components over custom components.
* Use inline styles for spacing (padding, margin, gap). Tailwind v4 spacing utilities don't work reliably in this Tauri setup. Example: `style={{ padding: 24, gap: 16 }}` instead of `className="p-6 gap-4"`
