# ProjHub Implementation Plan

This document outlines the phased approach for building ProjHub, a personal project tracking web application.

## Project Structure

```
/app
  /layout.tsx                      - Root layout with sidebar
  /page.tsx                        - Dashboard/home
  /login/page.tsx                  - Login page
  /projects/page.tsx               - Projects list
  /projects/new/page.tsx           - New project form
  /projects/[id]/page.tsx          - Project detail (overview)
  /projects/[id]/milestones/page.tsx  - Milestones view
  /projects/[id]/activity/page.tsx    - GitHub activity
  /projects/[id]/artifacts/page.tsx   - Artifacts gallery
  /api/auth/[...nextauth]/route.ts - NextAuth endpoints
  /api/projects/route.ts           - Projects list/create
  /api/projects/[id]/route.ts      - Project CRUD
  /api/projects/[id]/milestones/route.ts
  /api/projects/[id]/github/route.ts
  /api/milestones/[id]/route.ts
  /api/milestones/[id]/tasks/route.ts
  /api/tasks/[id]/route.ts
  /api/artifacts/route.ts
  /api/artifacts/[id]/route.ts
  /api/artifacts/[id]/versions/route.ts
  /api/github/webhook/route.ts

/components
  /ui/                             - shadcn/ui components
    button.tsx
    card.tsx
    dialog.tsx
    dropdown-menu.tsx
    input.tsx
    badge.tsx
    tabs.tsx
    command.tsx                    - Command palette
  /layout/
    sidebar.tsx                    - Navigation sidebar
    header.tsx                     - Top header with breadcrumbs
    page-container.tsx             - Consistent page wrapper
  /projects/
    project-card.tsx               - Project card for grid/list
    project-form.tsx               - Create/edit project form
    stage-selector.tsx             - Project stage dropdown
  /milestones/
    milestone-card.tsx             - Milestone display card
    milestone-form.tsx             - Create/edit milestone
    task-board.tsx                 - Kanban task columns
    task-card.tsx                  - Individual task card
    task-form.tsx                  - Create/edit task
  /timeline/
    timeline.tsx                   - Horizontal timeline
    timeline-item.tsx              - Individual milestone on timeline
  /activity/
    activity-feed.tsx              - GitHub events list
    activity-item.tsx              - Single event display
  /artifacts/
    artifact-gallery.tsx           - Grid of artifacts
    artifact-card.tsx              - Artifact preview card
    markdown-editor.tsx            - Markdown editing with preview
    version-history.tsx            - Version list panel

/lib
  prisma.ts                        - Prisma client singleton
  auth.ts                          - NextAuth configuration
  github.ts                        - GitHub API helpers
  utils.ts                         - Shared utilities (cn, formatDate, etc.)

/prisma
  schema.prisma                    - Database schema
  /migrations                      - Migration files

/public
  /images                          - Static images

/styles
  globals.css                      - Global styles, Tailwind imports
```

---

## Phase 1: Project Foundation

### Goals
- Set up development environment with all tooling
- Implement authentication with GitHub OAuth
- Create basic app shell with navigation

### Tasks

**1.1 Initialize Next.js Project**
- Create Next.js 14 app with App Router: `npx create-next-app@latest projhub --typescript --tailwind --eslint --app`
- Configure TypeScript strict mode
- Set up path aliases (@/components, @/lib, etc.)

**1.2 Configure Development Tools**
- Add Prettier with consistent config
- Configure ESLint rules for React/Next.js
- Set up VS Code settings for team consistency
- Add .env.example with required variables

**1.3 Set Up Prisma with SQLite**
- Install Prisma: `npm install prisma @prisma/client`
- Initialize Prisma: `npx prisma init --datasource-provider sqlite`
- Create complete schema (all models from design doc)
- Run initial migration: `npx prisma migrate dev`
- Create Prisma client singleton in /lib/prisma.ts

**1.4 Database Schema**
```prisma
model User {
  id          String    @id @default(cuid())
  email       String    @unique
  name        String?
  githubId    String    @unique
  githubToken String?
  avatarUrl   String?
  createdAt   DateTime  @default(now())
  projects    Project[]
}

model Project {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  name        String
  description String?
  stage       String        @default("idea")
  startDate   DateTime?
  endDate     DateTime?
  repoUrl     String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  milestones  Milestone[]
  events      GitHubEvent[]
  artifacts   Artifact[]    @relation("ProjectArtifacts")
}

model Milestone {
  id          String     @id @default(cuid())
  projectId   String
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title       String
  description String?
  startDate   DateTime?
  endDate     DateTime?
  status      String     @default("on_track")
  createdAt   DateTime   @default(now())
  tasks       Task[]
  artifacts   Artifact[] @relation("MilestoneArtifacts")
}

model Task {
  id          String     @id @default(cuid())
  milestoneId String
  milestone   Milestone  @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
  title       String
  type        String     @default("task")
  status      String     @default("todo")
  description String?
  order       Int        @default(0)
  createdAt   DateTime   @default(now())
  artifacts   Artifact[] @relation("TaskArtifacts")
}

model GitHubEvent {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  type      String
  eventDate DateTime
  githubId  String
  author    String
  title     String
  url       String
  details   Json?
  createdAt DateTime @default(now())

  @@unique([projectId, githubId])
}

model Artifact {
  id          String            @id @default(cuid())
  parentType  String
  projectId   String?
  project     Project?          @relation("ProjectArtifacts", fields: [projectId], references: [id], onDelete: Cascade)
  milestoneId String?
  milestone   Milestone?        @relation("MilestoneArtifacts", fields: [milestoneId], references: [id], onDelete: Cascade)
  taskId      String?
  task        Task?             @relation("TaskArtifacts", fields: [taskId], references: [id], onDelete: Cascade)
  filename    String
  storagePath String
  mimeType    String
  sizeBytes   Int
  createdAt   DateTime          @default(now())
  versions    ArtifactVersion[]
}

model ArtifactVersion {
  id            String   @id @default(cuid())
  artifactId    String
  artifact      Artifact @relation(fields: [artifactId], references: [id], onDelete: Cascade)
  content       String?
  storagePath   String?
  versionNumber Int
  createdAt     DateTime @default(now())
}
```

**1.5 Implement NextAuth with GitHub**
- Install NextAuth: `npm install next-auth @auth/prisma-adapter`
- Create GitHub OAuth app in GitHub settings
- Configure NextAuth in /lib/auth.ts
- Create /api/auth/[...nextauth]/route.ts
- Store GitHub token for API access

**1.6 Create Base Layout**
- Install shadcn/ui: `npx shadcn-ui@latest init`
- Add core components: button, card, input, dialog
- Create sidebar component with navigation links
- Create header component with user menu
- Implement root layout with auth check
- Create login page with GitHub sign-in button

### Verification
- [ ] `npm run dev` starts without errors
- [ ] Can sign in with GitHub OAuth
- [ ] User record created in database
- [ ] Sidebar and header render correctly
- [ ] Protected routes redirect to login

---

## Phase 2: Projects & Dashboard

### Goals
- Full project CRUD functionality
- Dashboard with project overview
- Project detail page structure

### Tasks

**2.1 Projects API**
- GET /api/projects - List user's projects with counts
- POST /api/projects - Create new project
- GET /api/projects/[id] - Get project with milestones
- PATCH /api/projects/[id] - Update project
- DELETE /api/projects/[id] - Delete project (cascade)

**2.2 Projects List Page**
- Project cards in responsive grid
- Stage filter tabs (All, Active, Archived)
- Sort by: recent activity, name, created date
- Empty state with create prompt
- "New Project" button → modal or page

**2.3 Project Creation/Edit**
- Form fields: name, description, stage, dates, repo URL
- Stage selector with visual indicators
- Date pickers for start/end dates
- Form validation with error messages
- Optimistic UI update on save

**2.4 Project Detail Page**
- Tabbed navigation: Overview, Milestones, Activity, Artifacts
- Overview tab: summary card, milestone timeline preview, recent activity
- Breadcrumb navigation
- Edit project inline or via modal
- Delete with confirmation

**2.5 Dashboard**
- Welcome message with user name
- Quick stats: total projects, active milestones, tasks due soon
- Project cards grid (recently updated)
- "Create Project" call-to-action
- Recent activity feed (across all projects)

### Verification
- [ ] Can create a new project
- [ ] Projects list shows all user projects
- [ ] Can edit project details inline
- [ ] Can delete project with confirmation
- [ ] Dashboard displays accurate stats
- [ ] Stage changes persist correctly

---

## Phase 3: Milestones & Tasks

### Goals
- Milestone management within projects
- Task CRUD with Kanban board
- Status tracking and inline editing

### Tasks

**3.1 Milestones API**
- GET /api/projects/[id]/milestones - List with task counts
- POST /api/projects/[id]/milestones - Create milestone
- PATCH /api/milestones/[id] - Update milestone
- DELETE /api/milestones/[id] - Delete (cascade tasks)

**3.2 Tasks API**
- GET /api/milestones/[id]/tasks - List tasks
- POST /api/milestones/[id]/tasks - Create task
- PATCH /api/tasks/[id] - Update task (status, details)
- DELETE /api/tasks/[id] - Delete task
- PATCH /api/tasks/reorder - Reorder tasks (drag-drop)

**3.3 Milestone List View**
- Cards showing: title, date range, status badge, task progress
- Color-coded status: green (on track), yellow (at risk), red (overdue)
- Click to expand → show tasks
- Add milestone button
- Milestone form modal

**3.4 Task Board (Kanban)**
- Columns: Todo, In Progress, Blocked, Done
- Task cards with: title, type badge, quick actions
- Drag-and-drop between columns (update status)
- Click card → expand for details/edit
- Inline title editing
- Add task button per column

**3.5 Task Details**
- Expandable card or slide-out panel
- Fields: title, type, status, description
- Type selector: task, bug, improvement, idea
- Rich text description (basic markdown)
- Delete with confirmation

**3.6 Status Automation**
- Auto-calculate milestone status based on:
  - All tasks done → completed
  - End date passed with incomplete tasks → overdue
  - Tasks blocked or approaching deadline → at_risk

### Verification
- [ ] Can create milestones within a project
- [ ] Can add tasks to milestones
- [ ] Drag-drop changes task status
- [ ] Milestone status updates based on tasks
- [ ] Inline editing works for titles
- [ ] Delete cascades correctly

---

## Phase 4: GitHub Integration

### Goals
- Connect GitHub repositories to projects
- Display commits and PRs
- Real-time updates via webhooks

### Tasks

**4.1 GitHub API Helpers**
- Create /lib/github.ts with:
  - fetchUserRepos() - List user's repositories
  - fetchRepoCommits(owner, repo) - Recent commits
  - fetchRepoPullRequests(owner, repo) - Recent PRs
  - fetchRepoActivity(owner, repo) - Combined activity
- Handle rate limiting and errors
- Cache responses where appropriate

**4.2 Repository Selector**
- Dropdown/modal to select from user's repos
- Search/filter repositories
- Show repo stats (stars, last updated)
- Save selection to project.repoUrl
- Clear/change repo option

**4.3 Activity Feed Component**
- Display GitHubEvents for project
- Event types: commit, pull_request, issue
- Show: author avatar, title, timestamp, link
- "Load more" pagination
- Empty state when no activity

**4.4 Manual Sync**
- "Sync" button to fetch recent activity
- POST /api/projects/[id]/github/sync
- Fetch last 30 days of commits/PRs
- Deduplicate by githubId
- Show sync progress/status

**4.5 Webhook Endpoint**
- POST /api/github/webhook
- Verify webhook signature
- Handle events: push, pull_request, issues
- Create GitHubEvent records
- Associate with correct project by repo URL

**4.6 Webhook Setup Instructions**
- In-app instructions for setting up webhook
- Webhook URL with project-specific token
- Required events to subscribe

### Verification
- [ ] Can select a GitHub repo for project
- [ ] Manual sync fetches recent activity
- [ ] Activity feed displays commits and PRs
- [ ] Webhook creates events in real-time
- [ ] Events link to GitHub correctly

---

## Phase 5: Artifacts & Markdown

### Goals
- File upload for images and documents
- Markdown editor with live preview
- Version history for text files

### Tasks

**5.1 File Upload API**
- POST /api/artifacts - Upload file
- Handle multipart form data
- Store in local filesystem (dev) / Vercel Blob (prod)
- Generate unique storage paths
- Create Artifact record with metadata

**5.2 Artifact Management**
- GET /api/artifacts?parentType=X&parentId=Y - List artifacts
- GET /api/artifacts/[id] - Get artifact details
- DELETE /api/artifacts/[id] - Delete artifact and file

**5.3 Upload Component**
- Drag-and-drop zone
- File type validation (images, markdown, common docs)
- Upload progress indicator
- Preview after upload
- Attach to project/milestone/task

**5.4 Artifact Gallery**
- Grid view with thumbnails
- Filter by type (images, documents, other)
- Click to preview/download
- Delete option
- Link to parent (project/milestone/task)

**5.5 Markdown Editor**
- Install markdown library: `npm install @uiw/react-md-editor`
- Split view: editor + preview
- Basic toolbar: headers, bold, italic, lists, links
- Auto-save draft to localStorage
- Explicit save creates new version

**5.6 Version History**
- GET /api/artifacts/[id]/versions - List versions
- POST /api/artifacts/[id]/versions - Save new version
- Version list with timestamps
- Click to view old version
- Restore previous version option

### Verification
- [ ] Can upload images and files
- [ ] Gallery displays uploaded artifacts
- [ ] Markdown editor saves content
- [ ] Version history tracks changes
- [ ] Can view and restore old versions
- [ ] Files persist correctly in storage

---

## Phase 6: Timeline & Polish

### Goals
- Visual timeline for milestones
- Responsive design refinements
- Production-ready error handling

### Tasks

**6.1 Timeline Component**
- Horizontal scrollable timeline
- Milestones as markers with date labels
- Color-coded by status
- Click milestone → navigate to detail
- Today marker line

**6.2 Timeline Integration**
- Add to project overview tab
- Zoom controls (month/quarter/year view)
- Responsive: stack vertically on mobile

**6.3 Loading States**
- Skeleton loaders for cards and lists
- Loading spinners for actions
- Optimistic updates with rollback on error

**6.4 Error Handling**
- Global error boundary
- API error responses with user-friendly messages
- Toast notifications for success/error
- Retry logic for failed requests

**6.5 Responsive Refinements**
- Test all pages on mobile/tablet
- Collapsible sidebar on small screens
- Touch-friendly tap targets
- Responsive typography scale

**6.6 Performance Optimization**
- Implement React Query for data fetching
- Add request deduplication
- Lazy load heavy components
- Optimize images with next/image

**6.7 Final Testing**
- Cross-browser testing (Chrome, Firefox, Safari)
- Accessibility audit (keyboard nav, screen readers)
- Fix any outstanding bugs

### Verification
- [ ] Timeline renders milestones correctly
- [ ] Loading states appear during data fetch
- [ ] Errors display user-friendly messages
- [ ] App works well on mobile devices
- [ ] No console errors in production

---

## Deployment

### Initial Setup
1. Create Vercel account and link GitHub repo
2. Create GitHub OAuth App:
   - Homepage URL: `https://your-app.vercel.app`
   - Callback URL: `https://your-app.vercel.app/api/auth/callback/github`
3. Configure environment variables in Vercel dashboard

### Database Migration
For production persistence, migrate from SQLite to Vercel Postgres:
1. Create Vercel Postgres database
2. Update DATABASE_URL in environment variables
3. Update Prisma schema: `provider = "postgresql"`
4. Run `npx prisma migrate deploy`

### Deployment Checklist
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] GitHub OAuth app configured for production URL
- [ ] Webhook URL updated for production
- [ ] Vercel Blob storage configured
- [ ] Build succeeds without errors
- [ ] Authentication flow works end-to-end
- [ ] Create test project and verify all features

### Monitoring
- Enable Vercel Analytics for performance monitoring
- Set up error tracking (Sentry or similar)
- Monitor GitHub API rate limits

---

## Dependencies

### Core
```json
{
  "next": "^14.0.0",
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "@prisma/client": "^5.0.0",
  "next-auth": "^4.24.0",
  "@auth/prisma-adapter": "^1.0.0"
}
```

### UI
```json
{
  "tailwindcss": "^3.4.0",
  "framer-motion": "^10.0.0",
  "@radix-ui/react-*": "latest",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.0.0",
  "lucide-react": "^0.300.0"
}
```

### Utilities
```json
{
  "@tanstack/react-query": "^5.0.0",
  "@uiw/react-md-editor": "^4.0.0",
  "date-fns": "^3.0.0",
  "zod": "^3.22.0"
}
```

### Development
```json
{
  "prisma": "^5.0.0",
  "prettier": "^3.0.0",
  "eslint": "^8.0.0",
  "@types/node": "^20.0.0",
  "@types/react": "^18.2.0"
}
```
