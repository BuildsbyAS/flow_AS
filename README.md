# Flow — Team Productivity, Finally Visible

> **The live record of every project, by the people running it.**

Flow is a real-time operating dashboard for engineering teams. Every project has an owner, members, and an activity feed. Updates happen in Flow, not in DMs or slides. Anyone can open any project and see what's happening, who's on it, and whether it needs help.

## Three Surfaces

Flow is organized into three core tabs, navigable with `1` `2` `3`:

| Tab | Key | What it shows |
|-----|-----|---------------|
| **Summary** | `1` | Executive dashboard. KPIs, trends, needs-attention flags, weekly digest. |
| **Projects** | `2` | Every project: registry, deep-dive, tracks, and timeline. Table, Board, and Gantt views. |
| **People** | `3` | Team roster. Workload, active projects, overload indicators, and per-person deep-dive. |

## Parallel Tracks

Real projects don't move through phases one at a time. PRD can overlap with Dev, QA can run alongside Beta. Flow uses **parallel tracks** instead of a single linear phase.

| Track | Purpose |
|-------|---------|
| **PRD** | Requirements and scope |
| **Design** | UX/UI and architecture |
| **Dev** | Implementation and coding |
| **QA** | Testing and validation |
| **Alpha** | Internal team testing |
| **Beta** | Real-user testing and A/B |

Each project can have multiple tracks active simultaneously. Tracks can be started, completed, and reopened independently.

### Track Actions

- **Start** — Begin a new track. Multiple tracks can be active at once.
- **Done** — Mark a track complete. It stays on the timeline as history.
- **Reopen** — Need another pass? Adds a new period to the track.

### Track Timeline (Mini-Gantt)

Every project deep-dive has a track timeline showing all tracks as horizontal bars with a Today marker, Ship Date line, and Shipped line. Hover track rows to start, complete, or reopen tracks.

## Project Statuses

| Status | Meaning |
|--------|---------|
| **In Flight** | Actively being worked on |
| **Shipped** | Delivered and complete (includes Alpha/Beta) |
| **Blocked** | Stuck, needs intervention |
| **Upcoming** | Registered but not started |
| **Deprioritized** | On hold, not active |

## Views

### Projects Tab

Three view modes:

- **Table** — Dense, sortable rows. Active track pills per project. Scope chips filter by In Flight, Shipped, Blocked, Deprioritized, or All.
- **Board** — Kanban columns by track. Projects appear in every column where they have an active track. Drag-and-drop to transition between tracks.
- **Gantt** — Timeline view. See all projects on a horizontal timeline.

KPI cards show **In Flight** (PRD/Design/Dev/QA breakdown), **Shipped** (shipped + alpha + beta), and **At Risk** (blocked + overdue).

### Summary Tab

- **Project KPIs** — In-flight, shipped, at-risk counts with week-over-week deltas
- **Needs Attention** — Overdue, blocked, frozen, and stale projects sorted by urgency
- **Weekly Digest** — Auto-generated summary of phase transitions, new projects, blockers, and squad activity
- **Recently Shipped** — Quick-access chips for all recently shipped projects
- **Squad Breakdown** — Per-squad metrics table

### People Tab

Each person shows their active project count. When someone is on more than **5 active projects**, the count turns red and shows **Overloaded** — a signal for managers to re-balance work.

Click any person for a full deep-dive: project list, activity timeline, and role details.

## Power Features

### My Lens

Toggle from the header bar to filter the project registry to **your squad's projects** and **projects you follow**. Announcements and mentions are always visible regardless of lens.

Follow any project from its deep-dive page — followed projects appear in your lens even if they belong to another squad.

### Board View (Kanban)

The board view shows six track columns: PRD, Design, Dev, QA, Alpha, and Beta. A project with multiple active tracks appears in every matching column. Upcoming projects sit in a horizontal strip at the bottom.

**Drag-and-drop actions:**

- **Track to track** — Drag a card from one column to another. The source track is completed and the target track is started automatically.
- **Upcoming to track** — Drag an upcoming project onto any track column to kick it off. The project moves to In Flight and the selected track starts.
- **Reopen a completed track** — If the target track was previously completed, a modal asks for an optional reason before reopening it.
- **Already active** — Dropping onto a track the project already has open shows a warning instead of duplicating.

**Hover actions:**

- Hover any card to reveal a green **Done** button in the top-right corner. Click it to complete that track instantly.
- Each card shows an "also:" row listing the project's other active tracks, so you always know what else is running.

### Pin Projects

Pin your most important projects to keep them at the top of the list. Pinned projects always appear first, regardless of sort order or filters.

### Project Timeline

Every project has a central activity feed: track changes, status flips, member additions, and team updates. Post updates to share progress, flag blockers, or celebrate wins.

### Announcements

When a project ships, it appears in the Announcements feed (bell icon in the header). Visible to everyone regardless of squad or lens. Give shoutouts and feedback from the shipped project banner.

### Global Filters

Filter by **squad** or **track** across all views. Filters support multi-select and persist as you navigate between tabs.

### Command Palette

Press `Cmd+K` (or `Ctrl+K`) to search across projects (by name or ID), people, tabs, and actions — all from one place.

### Terminal

Press `T` to enter the terminal, the gateway to: **Settings** (squads, roles, people), **Logs** (live activity ledger), **Rant** (feature requests and feedback), and **Admin** (app-wide controls).

## Weekly Rhythm

| Day | Mode | Purpose |
|-----|------|---------|
| Sunday | Focus | Deep work and planning |
| Monday | Focus | Kick off the week |
| Tuesday | Sprint | Heads-down building |
| Wednesday | Sprint | Continue momentum, unblock |
| Thursday | Release | Ship what's ready |
| Friday | Review | Close the week, update feeds |
| Saturday | Rest | Recharge |

## Creating a Project

1. Click **+ Add Project**. Your squad and name are pre-filled.
2. Give it a name, set priority, and add an optional ship date.
3. Toggle **Start Now** to select which tracks to begin immediately. Pick multiple tracks to run them in parallel from day one.
4. Projects without Start Now are saved as **Upcoming**.

## How to Ship

1. Open the project deep-dive.
2. Click **Ship Project**. All active tracks are marked complete.
3. The project moves to the Shipped tab and appears in Announcements.

## Permissions (RBAC)

Flow uses role-based access control with three permission tiers per project. Non-permitted controls are hidden (not disabled).

### Roles

| Role | Scope | How assigned |
|------|-------|-------------|
| **Admin** | Full control everywhere | `isAdmin` flag on person record |
| **Project Owner** | Full control over owned projects | Assigned as project owner |
| **Team Member** | Limited actions on assigned projects | Added to project team |
| **Viewer** | Read-only + create + comment | Default for everyone else |

### Permission Matrix

| Action | Admin | Owner | Member | Viewer |
|--------|:-----:|:-----:|:------:|:------:|
| Edit project (name, dates, priority) | ✅ | ✅ | | |
| Change project status (ship, block, deprioritize) | ✅ | ✅ | | |
| Delete project | ✅ | ✅ | | |
| Manage tracks (start, complete, reopen) | ✅ | ✅ | | |
| Board drag-and-drop | ✅ | ✅ | | |
| Add/remove resources | ✅ | ✅ | ✅ | |
| Add team members | ✅ | ✅ | ✅ | |
| Remove team members | ✅ | ✅ | | |
| Delete any comment | ✅ | ✅ | | |
| Create project | ✅ | ✅ | ✅ | ✅ |
| Post comments and updates | ✅ | ✅ | ✅ | ✅ |
| Give shoutouts and feedback | ✅ | ✅ | ✅ | ✅ |
| View, filter, search, sort | ✅ | ✅ | ✅ | ✅ |
| Edit own comment (15 min window) | ✅ | ✅ | ✅ | ✅ |

### Implementation

Permissions are defined in `src/lib/permissions.js`:

- `getProjectRole(viewerId, project, memberIds, isAdmin)` returns the viewer's role for a specific project
- `can.editProject(role)`, `can.changeStatus(role)`, `can.manageTracks(role)`, etc. return boolean

Admin status is configured per person in Settings > Permissions.

## Architecture

```
flow/
├── src/
│   ├── App.jsx                    # Root: auth gates, tab routing, global state
│   ├── components/
│   │   ├── AppShell.jsx           # Header, navigation, filter drawer, announcements
│   │   ├── CommandPalette.jsx     # Universal search overlay
│   │   ├── FlowLogo.jsx          # Animated logo
│   │   ├── GanttChart.jsx        # Project timeline visualization
│   │   ├── TrackGantt.jsx         # Mini-Gantt for project detail (parallel tracks)
│   │   ├── ProjectTimeline.jsx    # Activity timeline component
│   │   ├── ProjectActivity.jsx    # Activity feed entries
│   │   ├── PersonProjects.jsx     # Person's project list
│   │   ├── LoginScreen.jsx        # OAuth login
│   │   └── shared.jsx             # Reusable UI primitives (Surface, Btn, Th, Tag, etc.)
│   ├── data/
│   │   ├── devSeed.js             # Dev seed (30 people, 100+ projects, tracks model)
│   │   └── seed.js                # Production seed
│   ├── hooks/
│   │   ├── useAuth.js             # Supabase Google OAuth
│   │   ├── useKeyboard.js         # Keyboard shortcut system
│   │   ├── useAlerts.js           # Risk and overstay alerts
│   │   ├── useSupabaseData.js     # Real-time data sync
│   │   └── useSyncedSetters.js    # Optimistic state updates
│   ├── lib/
│   │   ├── tracks.js              # Track utilities (start, complete, reopen, migrate)
│   │   ├── mutations.js           # DB write operations (track CRUD, status mutations)
│   │   ├── permissions.js         # RBAC: getProjectRole(), can.* permission checks
│   │   ├── supabase.js            # Supabase client
│   │   └── activityLog.js         # Activity tracking
│   ├── styles/
│   │   ├── theme.js               # Design system tokens (Obsidian theme)
│   │   ├── ds.js                  # Extended design system
│   │   └── global.css             # Global styles, glassmorphism, animations
│   └── views/
│       ├── SummaryView.jsx        # Executive KPI dashboard
│       ├── ProjectsView.jsx       # Projects: registry, deep-dive, board, table
│       ├── PeopleDeepDive.jsx     # People analytics + overload detection
│       ├── GuideView.jsx          # In-app comprehensive guide
│       ├── TerminalView.jsx       # Terminal gate
│       ├── SettingsView.jsx       # CRUD management
│       ├── RantView.jsx           # Feature requests & bug reports
│       └── LogsView.jsx           # Activity logs
├── supabase/                       # DB migrations & seed scripts
├── Dockerfile                      # Cloud Run deployment
└── nginx.conf                      # Production static serving
```

## Tech Stack

- **Frontend**: React 18 + Vite 6 (JSX, inline styles via theme tokens)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Auth**: Google OAuth via Supabase (skipped on localhost)
- **Deployment**: Docker + Google Cloud Run + nginx
- **Design**: Obsidian theme — dark header, frosted glass cards, warm grey canvas, glassmorphism

## Getting Started

```bash
npm install
npm run dev
```

The app runs on `localhost:5174`. Auth is skipped on localhost for development.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` - `3` | Navigate tabs: Summary, Projects, People |
| `4` | Open Guide |
| `T` | Open Terminal (Settings, Logs, Rant, Admin) |
| `Cmd+K` / `Ctrl+K` | Command palette / universal search |
| `/` | Focus in-tab search bar |
| `↑` `↓` | Move focus through rows; Enter to open |
| `?` | Toggle keyboard shortcut hints |
| `Esc` | Go back / close palette / exit detail |

---

*vibe coded by AJ, Opus, Codex, Wispr, Vosk, and Red Bull!*
