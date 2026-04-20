# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

莲花书院 (Lotus Academy) — a Chinese book community platform. Users can browse a public bookshelf, manage a personal library, read PDFs online with annotations, and send messages.

## Commands

```bash
# Frontend development (runs on port 3004)
cd frontend && npm run dev

# Build
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# Start production backend (Supabase stack)
cd docker && docker compose up -d

# Start backend only (local dev)
cd backend && docker compose up -d
```

No test suite is configured.

## Architecture

**Serverless-first**: There is no traditional backend. All business logic lives in PostgreSQL RLS policies and PostgREST. The frontend talks directly to Supabase via `@supabase/ssr` and `@supabase/supabase-js`.

```
Browser → Next.js (port 3004) → Supabase JS SDK
                                      ↓
Nginx (port 80) → Kong API Gateway (port 8003)
                      ├── /auth/v1/   → GoTrue (auth)
                      ├── /rest/v1/   → PostgREST (CRUD)
                      ├── /realtime/  → Realtime (WebSocket)
                      └── /storage/  → Storage API (PDFs/images)
```

**Frontend**: Next.js 15 App Router with Turbopack. Pages are in `frontend/src/app/`. Data fetching uses custom hooks in `frontend/src/hooks/`. Supabase clients (browser/server) are initialized in `frontend/src/lib/supabase.ts`.

**Backend**: Supabase stack managed via Docker Compose (`docker/docker-compose.yml`). Schema and RLS policies are in `backend/supabase/migrations/`. Kong routing is in `backend/kong.yml`.

**Auth**: Handled by `frontend/src/middleware.ts` which refreshes sessions on every request. Auth state flows through Supabase SSR helpers.

## Key Routes

| Path | Purpose |
|------|---------|
| `/` | Welcome/landing |
| `/auth` | Login/signup |
| `/bookshelf` | Public bookshelf |
| `/bookshelf/private` | Personal library |
| `/read/[id]` | PDF reader with annotations |
| `/profile` | User profile |
| `/messages` | Messaging |
| `/admin` | Admin panel |

## Environment Variables

Copy `docker/.env.example` to `docker/.env` for production. For local frontend dev, copy `frontend/.env.local.example` to `frontend/.env.local`. Key vars:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase API URL (via Kong)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side admin key

## Database

8 core tables with RLS enabled: `profiles`, `books`, `annotations`, `categories`, `book_categories`, `book_group_tags`, `messages`, `user_messages`. Schema is in `backend/supabase/migrations/`. Apply migrations via Supabase CLI or directly against the Docker PostgreSQL instance.

## Deployment

Production uses `docker/docker-compose.yml` (Supabase stack) + systemd for the Next.js frontend + Nginx as reverse proxy. See `script/deploy.sh` and `script/nginx.conf`.
