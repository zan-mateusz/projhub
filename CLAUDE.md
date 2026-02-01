# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProjHub is a personal project tracking web app for managing software projects across their lifecycle. It focuses on milestones, task management, GitHub activity tracking, and artifact storage. Single-user, no team features.

## Commands

```bash
npm run dev      # Start development server at localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
npx prisma migrate dev --name <name>  # Create new migration
npx prisma generate                    # Regenerate Prisma client
```

## Architecture

### Tech Stack
- **Next.js 14+** with App Router and TypeScript
- **Prisma 7** with SQLite (uses `@prisma/adapter-libsql`)
- **NextAuth.js** for GitHub OAuth
- **shadcn/ui** + Tailwind CSS for UI components

### Route Structure

```
src/app/
├── (app)/              # Authenticated routes (protected by layout)
│   ├── page.tsx        # Dashboard
│   └── projects/       # Project pages
├── login/              # Public login page
└── api/                # API routes
```

The `(app)` route group wraps authenticated pages with a layout that checks session and renders sidebar/header.

### Data Model Hierarchy

```
User → Project → Milestone → Task
                    ↓
              GitHubEvent
                    ↓
               Artifact → ArtifactVersion
```

Artifacts can attach to Project, Milestone, or Task (polymorphic via `parentType` + foreign keys).

### Key Patterns

**Authentication**: NextAuth with GitHub OAuth. User records created/updated on sign-in via `signIn` callback in `src/lib/auth.ts`. GitHub token stored for API access.

**API Routes**: All routes verify session and user ownership before operations. Use Zod for validation (note: Zod 4 uses `.issues` not `.errors`).

**Prisma Client**: Configured in `src/lib/prisma.ts` using `PrismaLibSql` adapter (required for Prisma 7).

**GitHub Integration**: `src/lib/github.ts` contains helpers for fetching repos, commits, PRs. Sync stores events in `GitHubEvent` table with deduplication via `projectId_githubId` unique constraint.

**File Uploads**: Stored in `/uploads` directory (gitignored). Served via `/api/uploads/[...path]` route with auth check.

### Component Organization

```
src/components/
├── ui/           # shadcn/ui primitives
├── layout/       # Sidebar, Header
├── projects/     # Project cards, forms, repo selector
├── milestones/   # Milestone list, task board (Kanban)
├── artifacts/    # Upload, gallery, markdown editor
├── activity/     # GitHub activity feed
└── timeline/     # Milestone timeline visualization
```

## Environment Variables

Required in `.env`:
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<secret>"
GITHUB_CLIENT_ID="<from github oauth app>"
GITHUB_CLIENT_SECRET="<from github oauth app>"
```

## Domain Concepts

- **Project stages**: idea, planning, execution, monitoring, done
- **Milestone status**: on_track, at_risk, overdue, completed
- **Task types**: task, bug, improvement, idea
- **Task status**: todo, in_progress, blocked, done
