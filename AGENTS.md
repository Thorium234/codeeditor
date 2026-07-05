# AGENTS.md — Collaborative Code Editor

## Project Overview

A collaborative, real-time code editor with room-based multi-user editing. Users create/join rooms and edit code together in a Monaco-based editor with live cursors, presence indicators, and Operational Transformation (OT) for conflict resolution.

**Stack**: Next.js 16 (standalone output) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + Socket.IO + Prisma (SQLite) + Caddy + Bun

---

## Essential Commands

| Command | What it does |
|---|---|
| `bun install` | Install main app dependencies |
| `bun run dev` | Start Next.js dev on port 3000, logs to `dev.log` |
| `bun run build` | Next.js standalone build + copies `.next/static` and `public` into `.next/standalone/` |
| `bun run start` | Production start: `NODE_ENV=production bun .next/standalone/server.js` |
| `bun run lint` | ESLint (mostly disables all rules) |
| `bun run db:push` | Prisma push SQLite schema |
| `bun run db:generate` | Prisma generate client |
| `bun run db:migrate` | Prisma migrate dev |
| `bun run db:reset` | Prisma migrate reset |

**Mini-service commands** (in `mini-services/code-editor-service/`):

| Command | What it does |
|---|---|
| `bun run dev` | Hot-reload via `bun --hot index.ts` |
| `bun run start` | Run compiled `index.js` |
| `bun run build` | `tsc --outDir dist index.ts` |

---

## Application Architecture

### Two-Service Model

1. **Next.js App** (port 3000) — Frontend + API routes
2. **Code Editor WebSocket Service** (port 3004) — Socket.IO server for real-time editing

Both sit behind a **Caddy reverse proxy** that reads `XTransformPort` from the query string to route the WebSocket connection to the correct backend port.

### Caddy Routing (critical!)

The `Caddyfile` on port 81 uses a special mechanism: the client passes `?XTransformPort=3004` in the WebSocket URL, and Caddy reads `{query.XTransformPort}` to reverse-proxy to that port. **Never use a port number directly in the WebSocket URL**. Always use:

```js
io('/?XTransformPort=3004', { transports: ['websocket', 'polling'] })
```

The Socket.IO **path must always be `/`** — Caddy depends on this.

### Frontend State Machine

The `Home` component in `page.tsx` has 4 states: `room-selection` → `connecting` → `editor` / `error`. The `CollaborativeEditor` component connects via Socket.IO, manages versioned document state, and tracks remote users' cursors.

### Mini-Services Structure

Each mini-service lives in `mini-services/<name>/` with its own `package.json`. The `code-editor-service` runs on port 3004 and manages:
- **Rooms** (in-memory `Map<string, Room>`) — no persistence
- **Users** with assigned colors from a fixed 8-color palette
- **Operational Transformation** — simplified implementation for conflict resolution
- **Cursor broadcasting** to all users in a room
- Room auto-cleanup when last user leaves

---

## Non-Obvious Project Conventions

### Code Patterns

- **Client components** use `'use client'` directive at top
- **Path alias**: `@/` maps to `src/`
- **`any` is used freely** — `noImplicitAny: false` in tsconfig, `@typescript-eslint/no-explicit-any: off` in ESLint
- **`useRef` for socket and editor refs** — `socketRef.current`, `editorRef.current` pattern
- **`isLocalChange` ref** gates re-applying remote operations back to local editor

### Configuration Gotchas

- `next.config.ts`: `reactStrictMode: false`, `ignoreBuildErrors: true`
- `tsconfig.json`: `noImplicitAny: false`, `strict: true` but with exceptions
- ESLint effectively disables almost every rule — don't expect lint to catch issues
- Tailwind config uses `tailwindcss-animate` plugin, dark mode via `class` strategy
- shadcn/ui style: `new-york`, base color: `neutral`, CSS variables enabled

### Build Pipeline

The `.zscripts/build.sh` builds for **deployment on a different machine** (`/home/z/my-project` is hardcoded as the source path). It:
1. Runs `bun install` + `bun run build`
2. Builds mini-services via `bun build --target bun`
3. Copies everything (standalone output, static files, db, Caddyfile, start scripts) into `/tmp/build_fullstack_$BUILD_ID`
4. Tars it all up

The `.zscripts/dev.sh` starts everything locally: `bun install` → `db:push` → Next.js dev → mini-services.

### Database

Prisma with SQLite (`db/custom.db`). The schema has `User` and `Post` models but these are template artifacts — the collaborative editor stores all state in-memory on the WebSocket server. The DB is not used by the editor logic.

---

## Important Gotchas

1. **Socket.IO path is always `/`** — never change it. Caddy depends on this for port routing.
2. **Ports go in `XTransformPort` query param**, never in the URL path or hostname.
3. **Room state is in-memory only** — rooms disappear when the WebSocket service restarts.
4. **OT is simplified** — `transformOperation` reuses the operation as both args (`transformOperation(operation, operation)`), which is a placeholder. Real OT would track pending operations per user.
5. **The `.zscripts/` scripts have hardcoded paths** (e.g., `/home/z/my-project`) — they were originally for a CI/deployment pipeline on a specific machine. They won't work out of the box on a fresh clone.
6. **`bun run dev` logs to `dev.log`** via tee. Check that file for server output.
7. **mini-services directory has a `.gitkeep`** — the `code-editor-service` is the only current service.
8. **No test framework** exists in the project dependencies.

---

## Deployment Flow

1. `.zscripts/build.sh` produces a tarball
2. Extract on target, run `start.sh` (which starts Next.js standalone, mini-services, and Caddy as the foreground process)
3. Caddy listens on port 81 by default
4. `start.sh` has graceful shutdown handling with SIGTERM/SIGINT for all child processes
