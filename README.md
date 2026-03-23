# Flow — Team Productivity, Finally Visible

> **Commit. Lock. Ship.**

Flow is a weekly commitment system for engineering teams. Every person declares what they'll deliver this week, locks it in, and reports outcomes. No vague updates, no hiding — just clarity.

## What Flow Does

Flow gives engineering leaders a real-time operating view of their team. It's built around two layers:

### The Execution Layer — *What's happening this week*
- **Pulse** (`2`) — Real-time command center. See every project across all squads — what's active, who's working on it, and the health of each project for the current week.
- **Commit** (`3`) — Where each person declares their 3 weekly deliverables. Fill in project, description, stage, and type (Build or Jam). Lock them in Monday, close them Friday.

### The Deep-Dive Layer — *The full picture across weeks*
- **Summary** (`1`) — Executive dashboard with team-wide KPIs: commit count, lock rate, completion rate, carry-forward, and health scores.
- **Projects** (`4`) — Project deep dive with phase progression, Gantt chart timeline, board view, and per-project metrics. Table, Board, and Gantt views.
- **People** (`5`) — People deep dive with role/squad breakdown, type distribution, commitment history, and velocity trends.

### Power Features
- **Command Palette** (`F`) — Universal search across projects, people, squads, and IDs. Works everywhere.
- **Week Navigation** — Time-travel through weeks with arrow keys. Filter by squad, owner, phase, or status.
- **Terminal** (`T`) — Settings, Logs, Rant (feature requests/bug reports), and Admin — gated behind a terminal unlock.
- **Keyboard Shortcuts** — Navigate tabs with `1`–`6`, toggle hints with `?`, press `Esc` to go back.

## Weekly Rhythm

| Day | Action |
|-----|--------|
| **Sunday** | Plan — fill in your 3 commits |
| **Monday** | Lock — commits are locked, no more changes |
| **Wednesday** | Pulse — midweek check-in, flag blockers |
| **Friday** | Close — mark outcomes (done, partial, carry, blocked) |

## The 3+1 Model

Each person gets **3 commit slots** + **1 buffer**. The buffer activates if a commit is dropped. This forces prioritization while allowing flexibility.

## Commit Types

- **Build** — DRI ownership, you're making it
- **Jam** — Supporting/enabling, time-capped collaboration

## Project Phases

`PRD → Design → Dev → QA → Alpha → Beta → GA`

## Architecture

```
flow/
├── src/
│   ├── App.jsx                    # Main app shell, routing, state
│   ├── components/
│   │   ├── AppShell.jsx           # Navigation, layout, toolbar
│   │   ├── CommandPalette.jsx     # Universal search overlay
│   │   ├── FlowLogo.jsx          # Animated gravity well logo
│   │   ├── GanttChart.jsx        # Project timeline visualization
│   │   ├── LoginScreen.jsx       # OAuth login with calendar grid
│   │   ├── OnboardingScreen.jsx  # New user setup
│   │   └── shared.jsx            # Reusable UI primitives
│   ├── data/
│   │   └── seed.js               # Seed data (squads, roles, people, projects)
│   ├── hooks/
│   │   ├── useAuth.js            # Supabase Google OAuth
│   │   ├── useKeyboard.js        # Keyboard shortcut system
│   │   ├── useSupabaseData.js    # Real-time data sync
│   │   └── useSyncedSetters.js   # Optimistic state updates
│   ├── lib/
│   │   ├── supabase.js           # Supabase client
│   │   ├── mutations.js          # DB write operations
│   │   └── activityLog.js        # Activity tracking
│   ├── styles/
│   │   ├── theme.js              # Design system tokens
│   │   └── global.css            # Global styles
│   └── views/
│       ├── SummaryView.jsx       # Executive KPI dashboard
│       ├── PulseView.jsx         # Weekly project matrix
│       ├── HumansView.jsx        # Commit planning interface
│       ├── ProjectsView.jsx      # Projects deep dive + Gantt + Board
│       ├── PeopleDeepDive.jsx    # People analytics
│       ├── GuideView.jsx         # In-app playbook
│       ├── TerminalView.jsx      # Terminal gate
│       ├── SettingsView.jsx      # CRUD management
│       ├── RantView.jsx          # Feature requests & bug reports
│       └── LogsView.jsx          # Activity logs
├── supabase/                      # DB migrations & seed scripts
├── Dockerfile                     # Cloud Run deployment
└── nginx.conf                     # Production static serving
```

## Tech Stack

- **Frontend**: React + Vite (inline styles, no CSS framework)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Auth**: Google OAuth via Supabase
- **Deployment**: Docker + Google Cloud Run
- **Design**: Custom dark theme, Inter font, glassmorphism

## Getting Started

```bash
npm install
npm run dev
```

The app runs on `localhost:5173`. Auth is skipped on localhost for development.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1`–`5` | Navigate tabs (Summary, Pulse, Commit, Projects, People) |
| `6` | Open Guide |
| `T` | Open Terminal |
| `F` | Command palette / universal search |
| `?` | Toggle keyboard shortcut hints |
| `Esc` | Go back / close palette |

---

*vibe coded by AJ, Opus, Codex, Wispr, Vosk, and Red Bull!*
