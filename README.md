# Flow — Weekly Team Commitment Dashboard

**Kill vague work. Ship with clarity.**

Flow is a weekly commitment system where every person declares 3 things they'll deliver this week. No vague updates, no hiding. Just clarity.

## Architecture

```
flow-app/
├── src/
│   ├── App.jsx              # Main app shell (nav, routing, state)
│   ├── components/
│   │   └── ui.jsx           # Glass UI components (Badge, Card, Input, etc.)
│   ├── data/
│   │   └── seed.js          # Seed data (squads, roles, people, projects, commitments)
│   ├── lib/
│   │   └── theme.js         # Design system (themes, fonts, type/phase configs)
│   ├── styles/
│   │   └── animations.jsx   # CSS-in-JS animations (glassmorphism, transitions)
│   └── views/
│       ├── FocusView.jsx    # Weekly 3+1 commitment input per person
│       ├── PeopleView.jsx   # People deep dive (history, metrics)
│       ├── ProjectsView.jsx # Projects deep dive (timeline, status)
│       ├── PulseView.jsx    # Project matrix overview (phase × squad)
│       └── SettingsView.jsx # CRUD for projects, people, squads, roles
├── package.json
└── README.md
```

## Concepts

### Vocabulary System
- **BUILD 🔨** (green) — DRI ownership, making it
- **JAM 🎸** (blue) — supporting/enabling, time-capped
- **COMMIT 🔀** (purple) — quality gate, sign-off
- **BLOCKED 🚧** (red) — waiting on dependency, auto-escalates >48h

### Phase Pipeline
PRD → Design → Engineering → QA

### Weekly Rhythm
Declare (Friday) → Lock (Monday) → Pulse (Wednesday) → Close (Friday)

### 3+1 Model
Each person commits to 3 things. If they deselect one, a buffer slot activates for a replacement.

## Tabs

| Tab | Purpose |
|-----|---------|
| **Pulse** | Project matrix — phase tiles, sortable table, ship flags |
| **Focus** | Weekly input — person directory, 3+1 cards, lock-in, mark done |
| **Projects** | Deep dive — phase progression, metrics, timeline history |
| **People** | Deep dive — role/squad, type breakdown, commitment history |
| **Settings** | CRUD — manage projects, people, squads, roles |

## Design System

- **Glassmorphism** — `backdrop-filter: blur()`, translucent surfaces, ambient gradient background
- **Fonts** — Figtree (display/body), JetBrains Mono (data/IDs)
- **Dark/Light** themes with deep navy gradient (dark) or soft lavender (light)
- **Status colors** — green (#4ADE80), blue (#60A5FA), purple (#C084FC), red (#FB7185), orange (#FF9F43)

## Getting Started

```bash
npm install
npm run dev
```

> **Note**: Currently a prototype with inline styles. Production path:
> 1. Move to Tailwind CSS or CSS modules
> 2. Add Supabase/Postgres for persistence
> 3. Add auth (Clerk/NextAuth)
> 4. Add real-time sync (Supabase Realtime or WebSockets)
> 5. Add Slack/Teams integration for weekly reminders

## Data Model (for DB migration)

```sql
-- Core tables
squads (id, name, created_at)
roles (id, name, created_at)
people (id, name, role_id, squad_id, avatar_url)
projects (id, xid, name, owner_id, squad_id, phase, ship, start_date, end_date)

-- Weekly commitments
weeks (id, start_date, end_date, status)
commitments (id, person_id, week_id, locked_at)
commitment_items (id, commitment_id, slot, project_id, type, stage, title, done_at)
commitment_buffer (id, commitment_id, project_id, type, stage, title)

-- History (denormalized for speed)
project_history (id, project_id, week_id, entries_json)
```
