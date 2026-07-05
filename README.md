# Collaborative Code Editor

A real-time collaborative code editor built with Next.js, Socket.IO, and Monaco Editor. Multiple users can join rooms and edit code together with live cursor tracking and presence indicators.

## Features

- **Real-time collaboration** — changes appear instantly for all room participants
- **Room-based sessions** — create or join rooms with a unique ID
- **Live cursors** — see where other users are editing in real time
- **Presence indicators** — see who's connected to your room
- **Monaco Editor** — the same engine that powers VS Code
- **Dark theme** — comfortable editing experience

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| UI Components | shadcn/ui (Radix primitives), Lucide icons |
| Real-time | Socket.IO (WebSocket with polling fallback) |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Database | Prisma + SQLite (schema scaffolding) |
| Reverse Proxy | Caddy |
| Runtime | Bun |

## Quick Start

**Prerequisites:** [Bun](https://bun.sh) >= 1.0

```bash
# One-command setup (installs deps, starts both services)
chmod +x setup.sh
./setup.sh
```

Or manually:

```bash
# Terminal 1 — WebSocket service
cd mini-services/code-editor-service
bun install
bun run dev            # starts on port 3004

# Terminal 2 — Next.js app
bun install
bun run dev            # starts on port 3000
```

Open **http://localhost:3000** and you're ready to collaborate.

## Commands

### Main project (`package.json`)

| Command | Description |
|---|---|
| `bun run dev` | Start Next.js dev server (port 3000, logs to `dev.log`) |
| `bun run build` | Standalone production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to SQLite |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:reset` | Reset database |

### Mini-service (`mini-services/code-editor-service/`)

| Command | Description |
|---|---|
| `bun run dev` | Hot-reload dev mode (port 3004) |
| `bun run start` | Run compiled JS |
| `bun run build` | TypeScript compile |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Browser     │────▶│  Caddy       │────▶│  Next.js (3000)  │
│  (Monaco)    │     │  (port 81)   │     └──────────────────┘
│  Socket.IO   │     │              │     ┌──────────────────┐
│  Client      │────▶│  XTransform  │────▶│  WS Service      │
└─────────────┘     │  Port=3004   │     │  (port 3004)     │
                    └──────────────┘     └──────────────────┘
```

The frontend (Next.js) serves the UI. The WebSocket service (Socket.IO) handles real-time document sync. Caddy reverse-proxies both — the WebSocket connection uses a `?XTransformPort=3004` query parameter so Caddy routes it to the right backend.

### Key patterns

- **State machine**: `room-selection` → `connecting` → `editor` / `error`
- **Full-document sync**: each keystroke broadcasts the complete document to other users (simplified approach; OT functions are available but unused)
- **Room state is in-memory** — rooms are ephemeral and vanish on service restart
- **Caddy protocol**: always use `io('/?XTransformPort=3004')` — never embed port numbers in the URL path

## Project Structure

```
├── setup.sh                          # One-command dev startup
├── Caddyfile                         # Reverse proxy config
├── prisma/schema.prisma              # Database schema (SQLite)
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Main UI (state machine)
│   │   ├── layout.tsx                # Root layout
│   │   └── api/route.ts              # API route
│   ├── components/
│   │   ├── CollaborativeEditor.tsx   # Monaco + Socket.IO integration
│   │   ├── RoomSelector.tsx          # Create/join room UI
│   │   └── ui/                       # shadcn/ui components
│   ├── hooks/
│   ├── lib/
│   └── app/globals.css
├── mini-services/
│   └── code-editor-service/
│       ├── index.ts                  # Socket.IO server
│       ├── simple-server.js          # Minimal Socket.IO server
│       └── deploy.sh                 # Production deployment
├── examples/websocket/               # Reference Socket.IO examples
├── .zscripts/                        # Build/deploy scripts (CI)
└── AGENTS.md                         # LLM-friendly project guide
```

## Configuration Gotchas

- `next.config.ts`: `reactStrictMode: false`, `ignoreBuildErrors: true` — intentional for rapid development
- `tsconfig.json`: `noImplicitAny: false` — prefer explicit types but `any` is allowed freely
- ESLint disables nearly every rule (no warnings for unused vars, `any`, missing deps, etc.)
- All Socket.IO connections must use path `/` — Caddy depends on this for routing
- The `.zscripts/` build scripts reference hardcoded paths (`/home/z/my-project`) — originally for a CI pipeline

## License

GNU General Public License v2.0 — see [LICENSE](./LICENSE).
