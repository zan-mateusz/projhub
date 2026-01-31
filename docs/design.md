# ProjHub Design Document

ProjHub is a personal web application for managing software projects across their lifecycle, with a strong focus on milestones, progress visibility, GitHub activity, and a central place for artifacts like docs and screenshots. It targets a single user needing clear structure: define milestones, break them into tasks, link GitHub repos, and store artifacts without team-tool overhead.

## Core Principles

ProjHub separates core features (always available) from extras (toggleable). Core handles projects, milestones/tasks (flat structure, no nesting), GitHub events (record only, no auto-linking), and basic artifacts. v1 prioritizes simplicity: fixed task types/statuses, basic visuals, personal use only.

## Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Database**: SQLite via Prisma ORM (file-based, easy backup)
- **UI**: Tailwind CSS + shadcn/ui + Framer Motion
- **Auth**: NextAuth.js with GitHub OAuth
- **File Storage**: Local filesystem (development) → Vercel Blob (production)
- **Deployment**: Vercel (free tier)

## Functional Design

### Projects
- Lifecycle stages: idea, planning, execution, monitoring, done/archived (configurable per project).
- Overview dashboard: current stage, milestones timeline, recent GitHub activity, artifact previews.

### Milestones and Tasks
- Flat milestones with dates, titles, status (color-coded: on track/at risk/overdue).
- Tasks per milestone: fixed types (task, bug, improvement, idea); fixed statuses (todo, in_progress, blocked, done).
- v1 timeline: simple horizontal bar (milestone-level only, basic styling; no task bars).

### GitHub Integration
- GitHub OAuth login for authentication and repository linking.
- Per-project repo selection; webhook for PR/commit events (record, no auto-link to milestones/tasks).
- Views: "Recent activity" (webhook-stored), "Commits/PRs" (on-demand fetch).

### Artifacts
- Upload to projects/milestones/tasks: images (inline view), Markdown (edit with version history), other files.
- Simple versioning (explicit saves); prune old versions by retention period or size.

## Data Model

### User
- `id`: Primary key
- `email`: User's email address
- `name`: Display name
- `github_id`: GitHub user ID
- `github_token`: Encrypted OAuth token for API access
- `avatar_url`: Profile image URL
- `created_at`: Timestamp

### Project
- `id`: Primary key
- `user_id`: Foreign key to User
- `name`: Project name
- `description`: Optional project description
- `stage`: Lifecycle stage (idea, planning, execution, monitoring, done)
- `start_date`: Optional start date
- `end_date`: Optional target end date
- `repo_url`: Linked GitHub repository URL
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Milestone
- `id`: Primary key
- `project_id`: Foreign key to Project
- `title`: Milestone name
- `description`: Optional description
- `start_date`: Start date
- `end_date`: Target end date
- `status`: on_track, at_risk, overdue, completed
- `created_at`: Timestamp

### Task
- `id`: Primary key
- `milestone_id`: Foreign key to Milestone
- `title`: Task name
- `type`: task, bug, improvement, idea
- `status`: todo, in_progress, blocked, done
- `description`: Optional description
- `order`: Sort order within milestone
- `created_at`: Timestamp

### GitHubEvent
- `id`: Primary key
- `project_id`: Foreign key to Project
- `type`: commit, pull_request, issue
- `event_date`: When the event occurred
- `github_id`: GitHub's event ID (for deduplication)
- `author`: Event author
- `title`: Commit message or PR title
- `url`: Link to GitHub
- `details`: JSON blob with additional data
- `created_at`: Timestamp

### Artifact
- `id`: Primary key
- `parent_type`: project, milestone, or task
- `parent_id`: ID of the parent entity
- `filename`: Original filename
- `storage_path`: Path to file in storage
- `mime_type`: File MIME type
- `size_bytes`: File size
- `created_at`: Timestamp

### ArtifactVersion
- `id`: Primary key
- `artifact_id`: Foreign key to Artifact
- `content`: Markdown/text content (for text files)
- `storage_path`: Path to versioned file (for binary files)
- `version_number`: Sequential version number
- `created_at`: Timestamp

## API Routes

```
Authentication
  /api/auth/*                     - NextAuth.js endpoints (signin, signout, callback)

Projects
  GET    /api/projects            - List all user's projects
  POST   /api/projects            - Create new project
  GET    /api/projects/[id]       - Get project details
  PATCH  /api/projects/[id]       - Update project
  DELETE /api/projects/[id]       - Delete project

Milestones
  GET    /api/projects/[id]/milestones      - List milestones for project
  POST   /api/projects/[id]/milestones      - Create milestone
  PATCH  /api/milestones/[id]               - Update milestone
  DELETE /api/milestones/[id]               - Delete milestone

Tasks
  GET    /api/milestones/[id]/tasks         - List tasks for milestone
  POST   /api/milestones/[id]/tasks         - Create task
  PATCH  /api/tasks/[id]                    - Update task
  DELETE /api/tasks/[id]                    - Delete task

GitHub Integration
  GET    /api/projects/[id]/github          - Get GitHub activity for project
  POST   /api/projects/[id]/github/sync     - Manually sync recent activity
  POST   /api/github/webhook                - Receive webhook events

Artifacts
  GET    /api/artifacts                     - List artifacts (with parent filter)
  POST   /api/artifacts                     - Upload new artifact
  GET    /api/artifacts/[id]                - Get artifact details
  DELETE /api/artifacts/[id]                - Delete artifact
  GET    /api/artifacts/[id]/versions       - List version history
  POST   /api/artifacts/[id]/versions       - Save new version
```

## UI/UX Design

### Design Tokens
- **Colors**: Neutral grays for backgrounds and text, single accent color (blue or purple) for actions and highlights
- **Spacing**: Generous whitespace, 8px base grid
- **Borders**: Subtle, rounded corners (6-8px radius)
- **Shadows**: Light, layered shadows for depth on cards and modals

### Typography
- **Font**: Inter or system font stack for performance
- **Hierarchy**: Clear distinction between headings (semibold), body text (regular), and captions (muted)
- **Sizes**: 14px base, 12px small, 16-24px headings

### Component Patterns
- **Cards**: Subtle shadows, hover states, clear visual boundaries
- **Inline Editing**: Click-to-edit for titles and descriptions
- **Command Palette**: ⌘K for quick navigation and actions
- **Status Indicators**: Color-coded badges (green/yellow/red/gray)
- **Empty States**: Helpful illustrations and clear calls-to-action

### Layout
- **Sidebar**: Fixed left sidebar with navigation (collapsible on smaller screens)
- **Header**: Breadcrumbs, search, user menu
- **Main Content**: Flexible content area with consistent padding
- **Responsive**: Desktop-first design, mobile-friendly views for key pages

### Key Views
1. **Dashboard**: Project cards grid, quick stats, recent activity
2. **Project List**: Filterable/sortable table or card view
3. **Project Detail**: Tabbed interface (Overview, Milestones, Activity, Artifacts)
4. **Milestone Board**: Kanban-style task columns
5. **Timeline**: Horizontal milestone visualization
6. **Artifact Gallery**: Grid view with previews, version history panel

## Deployment

### Hosting
- **Platform**: Vercel (connects directly to GitHub repository)
- **Build**: Automatic deployments on push to main branch
- **Preview**: Branch deployments for testing

### Environment Variables
```
DATABASE_URL          - Prisma database connection string
GITHUB_CLIENT_ID      - GitHub OAuth app client ID
GITHUB_CLIENT_SECRET  - GitHub OAuth app client secret
NEXTAUTH_SECRET       - Secret for NextAuth.js session encryption
NEXTAUTH_URL          - Base URL for auth callbacks
BLOB_READ_WRITE_TOKEN - Vercel Blob storage token (production)
```

### Database Considerations
- **Development**: SQLite file stored locally
- **Production Options**:
  - Vercel Postgres (recommended for persistence)
  - PlanetScale (MySQL-compatible, generous free tier)
  - Turso (SQLite-compatible, edge-native)

### Performance
- Server-side rendering for initial page loads
- Client-side navigation with Next.js router
- Optimistic UI updates for better perceived performance
- Image optimization via Next.js Image component

## Out of Scope for v1

- AI Kickstart/LLM planning
- Auto-linking events to milestones/tasks
- Multi-user/sharing, advanced analytics, custom workflows, rich image annotation

## Future Considerations

- Expand timeline to task-level; configurable types/statuses (per-project or global)
- Event pruning: retention by age/size
- Backend /ai/kickstart endpoint if added later (LLM-agnostic)
- Mobile app or PWA support
- Export/import functionality for backup and migration
