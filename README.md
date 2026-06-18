# DevFlow

DevFlow is a local-first dashboard for software development work. It tracks local and GitHub-oriented projects, repo status, commits, notes, tasks, and source files in one focused workspace.

The app started as a single-file browser prototype and is being moved toward a Tauri desktop app so it can safely work with local repositories without needing a hosted backend.

## Features

- Project dashboard for local and remote repositories
- Agenda with project-linked tasks and priorities
- Notes workspace for implementation notes, bugs, ideas, research, and meeting notes
- Commit browser with manual commits and local `git log` sync
- File browser for selected local project roots
- Local-first persistence
- Tauri native command bridge for desktop builds

## Current Architecture

- `devflow.html` contains the current UI.
- `server.js` is the browser-development local API.
- `src-tauri/` contains the Tauri 2 desktop shell and Rust commands.
- `scripts/build-frontend.mjs` copies `devflow.html` into `dist/index.html` for Tauri packaging.

## Browser Development

Install dependencies:

```bash
npm install
```

Run the browser development server:

```bash
npm run dev
```

Open http://127.0.0.1:4177.

The browser development server stores data at `.devflow/data.json`.

## Tauri Desktop

Install prerequisites first:

- Rust/Cargo
- Node.js 20+
- Tauri system prerequisites for your OS

Run the desktop app in development:

```bash
npm install
npm run tauri:dev
```

Build a distributable desktop app:

```bash
npm run tauri:build
```

The Tauri build uses `devflow.html` as the source UI, copies it to `dist/index.html`, and calls native Rust commands for state, git, and file access.

## Project Status

This is early-stage software. The browser development path works without Rust, while the desktop build requires a working Rust/Cargo toolchain.

## Notes

The Tauri version stores desktop app data in the OS app-data directory. The browser development server stores data in `.devflow/data.json`.
