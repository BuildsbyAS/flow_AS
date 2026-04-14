# Flow — Weekly 3-commitment team productivity dashboard for Noon Group

## Stack
| Layer | Tech |
|-------|------|
| Framework | React 18 + Vite 6 (JSX, no TypeScript) |
| Styling | Inline styles via `theme.js` tokens + Tailwind v4 (utility only in `global.css`) |
| Backend | Supabase (Postgres + Auth + Realtime) |
| Auth | Google OAuth via Supabase; skipped on localhost |
| Deploy | Docker + Cloud Run + nginx |

## Structure
```
src/
  App.jsx            # Root: auth gates, tab routing, global state
  components/        # AppShell (header/nav), shared.jsx (20+ primitives), CommandPalette
  views/             # One per tab: PulseView, HumansView, ProjectsView, PeopleDeepDive, SummaryView...
  hooks/             # useSupabaseData (fetch), useSyncedSetters (2-tier persist), useAuth, useKeyboard
  styles/theme.js    # ALL design tokens (colors, typo, spacing, motion, semantic configs)
  lib/               # mutations.js (DB writes), activityLog.js, supabase.js (client)
  data/seed.js       # Dev seed (30 people, 100+ projects)
supabase/migrations/ # Postgres schema
```

## Design System — "Steel & Orange" (see DESIGN_SYSTEM.md for full spec)

**Light-mode-first.** Steel-gray aluminum canvas (#EDEDF0). White floating cards. Orange accent (#E8590C) used surgically.

| Token | Value | Usage |
|-------|-------|-------|
| page bg | `#EDEDF0` | Steel-gray canvas (the "aluminum chassis") |
| card bg | `#FFFFFF` | Floating card surfaces |
| inset bg | `#F3F3F6` | Recessed areas (inputs, table headers, segmented bg) |
| accent | `#E8590C` | Active states, primary CTA, live dot, logo mark |
| green | `#059669` | Success, done outcomes, Ship phases, positive deltas |
| red | `#DC2626` | Critical, blocked outcomes, negative deltas |
| amber | `#B45309` | Warning, Dev phase, project IDs, carry outcomes |
| purple | `#6D28D9` | PRD phase |
| blue | `#1D4ED8` | Design phase |
| cyan | `#0E7490` | QA phase, person entity |
| Fonts | Inter (body) + JetBrains Mono (data/numbers only) | Mono for KPIs, IDs, labels, tags. Inter for everything else. |
| Min font | 11px | Hard floor — nothing below 11px anywhere |
| Spacing | 4px base (`space1-8`: 4-40px) | `radiusLg=14, radiusSm=8, radiusXs=5` |
| Shadows | 4 tiers: sm, card, elevated, float | Cards on page = shadowCard. Modals = shadowElevated. |
| Motion | instant=100ms, fast=150ms, normal=250ms, slow=400ms | All use cubic-bezier(0.22,1,0.36,1) except instant |
| Terminal | EXCEPTION: stays dark theme | TerminalView/Rant/Admin keep themes.dark |

## Vocabulary (strict — no synonyms)
| Term | Meaning |
|------|---------|
| BUILD | Commitment type: DRI ownership work |
| JAM | Commitment type: time-capped collaboration |
| Phases | PRD, Design, Dev, QA, Alpha, Beta, GA |
| Outcomes | done, partial, carry, blocked (Friday close) |
| Statuses | active, deprioritized (project-level) |
| Risk | healthy, warning, critical |
| Cycle stages | declare, lock, pulse, close |

## Conventions
- **Components**: PascalCase files (`AppShell.jsx`). All shared primitives in `shared.jsx`.
- **Hooks**: `use` prefix, camelCase (`useSupabaseData.js`).
- **Imports**: React first, then theme/styles, components, hooks, lib.
- **Colors**: Always from `ds.*` tokens (new) or `c.*` tokens (legacy). Entity colors: project=amber, person=cyan. Accent=orange (#E8590C).
- **No tests exist.** Use `/review`, `/iterate`, `/test` agents for QA.
- **Glass is legacy** — alias to Surface. Use `Surface` for new code.
- **Design system spec**: Full spec in `DESIGN_SYSTEM.md`. All new UI must follow Steel & Orange direction.
- **Fonts**: JetBrains Mono ONLY for numbers, IDs, labels, section titles. Inter for body, nav, buttons, descriptions.
- **Shadows not glows**: Light mode uses multi-layer box-shadows for depth, never border-glow or neon effects.
- **Terminal exception**: TerminalView, RantView, AdminSettingsView stay dark-themed. Everything else is light.

## Gotchas
- Auth skipped on localhost. Set `VITE_SKIP_AUTH=true` for deployed dev.
- Terminal gates Settings/Logs/Rant behind unlock (`sessionStorage`).
- Always call `flushDirtyToDB()` before navigation — `useSyncedSetters` handles this on tab switch + `beforeunload`.
- Commitment items always padded to 3 slots. Buffer is optional slot 4.
- `weekOffset` 0=current, negative=past. Historical weeks are read-only.
- Actual outcomes include `done_carry` and `blocked` beyond what `outcomeConfig()` defines.
