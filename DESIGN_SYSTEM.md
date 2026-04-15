# Flow Design System — Steel & Orange (live)

> Light-mode-first. Steel-gray aluminum canvas, white floating cards, orange accent used surgically. JetBrains Mono only for numbers/IDs/labels. Inter everywhere else. Nothing below 11px.

This document reflects what's **actually in the codebase**, not what's aspirational.

**Sources of truth:**

| File | Role |
|---|---|
| `src/styles/ds.js` | Canonical tokens (colors, typography, spacing, radius, shadow, motion) |
| `src/styles/theme.js` | Light/dark theme bridge; exports `c`, `typo`, `layout`, `space`, `motion` |
| `src/styles/global.css` | CSS variables mirror of the tokens, noise texture, focus rings, responsive padding |
| `src/components/shared.jsx` | General chrome primitives (Modal, Btn, Inp, Badge, Tag, Surface, Th, etc.) |
| `src/components/kpi.jsx` | KPI grid system (KpiGrid, KpiCard, HealthGauge, SectionHead, Pill, Sparkline…) |
| `src/components/chart.jsx` | SVG chart primitives (MiniBarChart, SparkLine, StackedBarChart, HealthBar…) |

---

## 1. Color system

### 1.1 Surfaces

| Token | Hex | Usage |
|---|---|---|
| `c.bg` | `#EDEDF0` | Page canvas — the "aluminum chassis." Every view sits on this. |
| `c.surface` | `#FFFFFF` | Floating white card — KPI cards, table wrappers, commit cards, modals. |
| `c.surfaceAlt` | `#F3F3F6` | Recessed inset — input backgrounds, segmented containers, keycap bg. |
| `c.tableHeader` | `#F7F7FA` | Column header rows in data tables. |

**Rule:** Cards always lighter than the page. Never white card directly on white. The page canvas carries a 1.8–5% fractalNoise overlay (`body::before` in `global.css`) — cards never do.

### 1.2 Text

| Token | Hex | Usage |
|---|---|---|
| `c.text` | `#1A1A1E` | Headings, KPI values, project/person names |
| `c.textMid` | `#4A4A52` | Body — table cells, descriptions, form values |
| `c.textDim` | `#7E7E8A` | Labels, section titles, placeholders, nav inactive |
| `c.textGhost` | `#AEAEB8` | Keyboard hints, disabled text, decorative |

### 1.3 Accent (orange, used surgically)

| Token | Value | Where |
|---|---|---|
| `c.accent` | `#E8590C` | Active nav tab, primary CTA, logo dot, live indicator, commitment dots |
| `c.accentDim` | `rgba(232,89,12,0.08)` | Active tab bg, hover wash, focus ring outer |
| `c.accentMid` | `rgba(232,89,12,0.18)` | Accent ring, soft accent border |
| `c.accentGlow` | `rgba(232,89,12,0.25)` | Logo halo, live dot shadow |

**The rule:** count the orange pixels. **>5 distinct orange elements on one screen = wrong.** Orange appears only on active states, primary CTAs, the live indicator, commitment status dots, and the logo mark.

### 1.4 Borders

| Token | Value | Usage |
|---|---|---|
| `c.border` | `rgba(0,0,0,0.07)` | Default card + table + divider border |
| `c.borderHover` / `c.borderMedium` | `rgba(0,0,0,0.12)` | Hover borders, active input borders |

### 1.5 Semantic (data only — never chrome)

| Token | Color | `Dim` variant | Usage |
|---|---|---|---|
| `c.green` | `#059669` | `greenDim` | Success, BUILD, healthy, Alpha/Beta/GA |
| `c.red` | `#DC2626` | `redDim` | Blocked, critical, danger |
| `c.orange` / `c.amber` | `#B45309` | `orangeDim` | Warning, Dev phase, carry, project IDs |
| `c.purple` | `#6D28D9` | `purpleDim` | PRD phase |
| `c.blue` | `#1D4ED8` | `blueDim` | Design phase |
| `c.cyan` | `#0E7490` | `cyanDim` | QA phase, person entity |

**Phase color map** (`phaseColors()` in `theme.js`):

```
PRD     → purple   Design  → blue    Dev     → amber    QA      → cyan
Alpha   → green    Beta    → green   GA      → green
```

**Health thresholds:**

```
≥70  → green (Good)
≥40  → amber (Fair)
<40  → red   (Poor)
```

### 1.6 Entity reference colors

| Entity | Color | Token |
|---|---|---|
| Project (IDs, chips) | `c.amber` | `entityColors().project` |
| Person (names, avatars) | `c.cyan` | `entityColors().person` |

---

## 2. Typography

Two fonts. **Mono is data-only.** **Nothing below 11px.**

### 2.1 Font stack

| Role | Family |
|---|---|
| Sans (body, UI) | `'Inter', system-ui, -apple-system, sans-serif` |
| Mono (data) | `'JetBrains Mono', 'Menlo', monospace` |

Mono is used only for: KPI hero numbers, project IDs, health numbers, KPI deltas, phase commitment tags (1B, 2J), BUILD/JAM type labels, section titles (uppercase), table counts, kbd hints, the FLOW wordmark, and Terminal (the whole view).

Everything else uses Inter — body, nav, buttons, badge labels, descriptions, names.

### 2.2 Type scale (`typo.*`)

| Token | Font | Size | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| `displayHero` | Mono | 36 | 700 | -0.03em | KPI hero numbers |
| `displayLg` | Inter | 24 | 700 | -0.02em | Page titles, detail hero name |
| `displayMd` | Inter | 20 | 700 | -0.02em | Detail view names |
| `displaySm` | Inter | 16 | 700 | -0.01em | Card headers, modal titles |
| `bodyLg` | Inter | 15 | 500 | 0 | Prominent body, context messages |
| `bodyMd` | Inter | 14 | 500 | 0 | Table cells, button labels, descriptions |
| `bodySm` | Inter | 13 | 500 | 0 | Sub-text, helper text |
| `bodyXs` | Inter | 12 | 500 | 0 | Smallest body |
| `monoLg` | Mono | 13 | 700 | 0 | Inline metric values |
| `monoMd` | Mono | 12 | 700 | 0.02em | KPI deltas, project IDs |
| `monoSm` | Mono | 11 | 700 | 0.04em | Phase tags, smallest allowed size |

Every numeric display includes `fontVariantNumeric: "tabular-nums"` so digits don't jitter.

### 2.3 Uppercase label conventions

- **Section titles** (sec-head): mono 12 / 700 / 0.08em / uppercase
- **KPI card labels**: Inter 12 / 600 / 0.04em / uppercase
- **Table column headers**: Inter 12 / 600 / 0.03em / uppercase

---

## 3. Spacing

4-px base (`space.*`):

| Token | Value | Common use |
|---|---|---|
| `space[1]` | 4 | Icon-to-text gap inside badges |
| `space[2]` | 8 | Inline element gap |
| `space[3]` | 12 | Tight card padding, KPI row gap |
| `space[4]` | 16 | Standard card-grid gap, cell padding |
| `space[5]` | 20 | Commit card internal padding |
| `space[6]` | 24 | KPI card padding, generous card padding |
| `space[7]` | 32 | Page body side padding, section gap |
| `space[8]` | 40 | Major vertical section gap |

**Page layout:** `main` max-width 1440, centered, padding `28px 32px 60px`. Responsive tiers at 900 → 16 and 640 → 12 (defined in `global.css`).

---

## 4. Radius (`layout.*`)

| Token | Value | Usage |
|---|---|---|
| `radiusXs` / `radiusTag` | 5 | Tags, phase pills, status badges |
| `radiusSm` | 8 | Buttons, inputs, small cards |
| `radiusMd` | 12 | Segmented control, dropdowns |
| `radiusLg` / `radius` | 14 | KPI cards, tables, commit cards, modals |
| `radiusPill` | 100 | Pill buttons, avatar badges |

---

## 5. Elevation / shadow

**Shadows, not glows.** Border-glow is explicitly retired.

| Token | Value | Usage |
|---|---|---|
| `c.shadowSm` | `0 1px 2px rgba(0,0,0,0.04)` | Header bar, active segmented button |
| `c.shadowCard` | `0 1px 3px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05)` | Every card on the page canvas |
| `c.shadowElevated` | `0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.07)` | Modals, filter drawer, side panel, command palette |
| `c.shadowFloat` | `0 8px 30px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)` | Toasts, tooltips, popovers |

Tables and inputs and badges get no shadow.

---

## 6. Motion (`motion.*`)

| Tier | Duration | Easing | Usage |
|---|---|---|---|
| `instant` | 100ms | `ease-out` | Color hover, focus ring |
| `fast` | 150ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Button hover, tab switch, toggle, segmented |
| `normal` | 250ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Card entrance, panel slide, modal open |
| `slow` | 400ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Page transition, KPI counter |

Legacy aliases `interaction` / `critical` / `ambient` still resolve (map into the tiers above) for compatibility.

**Enforcement:**
- JSX inline styles use **explicit property lists** only — no `transition: all`
- Infinite decorative loops on functional UI are neutered (`components/AnimStyles.jsx` override block)
- `@media (prefers-reduced-motion: reduce)` rules in `global.css` and `AnimStyles.jsx`

---

## 7. Components

### 7.1 Header (52px × 2, sticky)

Two-layer app header: nav bar (52px) + context bar (52px) = 104px total. `position: sticky; top: 0`. Scroll-aware collapse slides the header up on scroll-down, reveals on scroll-up. CSS var `--flow-sticky-top` exposes current offset (104 or 0) so table headers can pin under it.

When collapsed, a floating pill appears top-center showing logo + current page label + search.

### 7.2 Context bar

52px. `c.surface` bg, `1px c.border` bottom, `space[7]` side padding. Contains week navigator (WK pill, left/right arrows), tab help text, active filter chips, filter drawer trigger, day-rhythm pill.

### 7.3 KPI cards (`kpi.jsx`)

The core 4-card pattern. `1.5fr 1fr 1fr 1fr` grid by default, 16px gap.

**`<KpiCard>`:**
- `c.surface` bg, `1px c.border`, `radiusLg`, `shadowCard`, `space[6]` padding
- Top row: uppercase label (12px Inter 600 0.04em `c.textDim`) + optional delta pill (12px mono 700, green `+`, red `-`)
- Value: `displayHero` (36px mono 700 -0.03em tabular-nums)
- Optional sub caption: 13px Inter 500 `c.textDim`
- Optional children slot: `PillRow`, `Sparkline`, custom
- Clickable: `active` prop adds accent border ring

**`<HealthGauge>`** — the only inverted card:
- `#1A1A1E` bg, 36px mono value `#F0F0F4`
- Gradient track `#DC2626 → #F59E0B → #10B981`
- Tick marks at 0/25/50/75/100 in 11px mono `#4A4A52`
- Always the 4th card in a KPI grid

### 7.4 Tables

Wrapper card: `c.surface` + `c.border` + `radiusLg` + `shadowCard` + **`overflow: clip`** (not `hidden` — `clip` clips rounded corners but does **not** create a containing block for `position: sticky`, so sticky `<thead>` still pins to the viewport).

**Header row:**
- `background: c.tableHeader` (#F7F7FA)
- 12px Inter 600 uppercase 0.03em `c.textDim`
- `1px c.borderMedium` bottom
- 12px / 16px padding
- Sort indicator: accent-colored arrow
- `position: sticky; top: var(--flow-sticky-top, 0px)`

**Body rows:**
- 14px Inter 500 `c.textMid`, 13px / 16px padding
- `1px rgba(0,0,0,0.03)` bottom divider
- Hover: `rgba(0,0,0,0.012)` background
- Last row: no bottom divider

**Shared `<Th>`** primitive in `shared.jsx` handles sticky top, sort state, and column widths via `colWidths`.

### 7.5 Badges & Tags (`shared.jsx`)

**`<Badge>`** — status pill (GA, Dev, PRD, Beta, Design):
- `radiusXs`, 3×10 padding, 12px Inter 700
- Semantic bg + color per phase

**`<Tag>`** — compact mono metadata (1B, 2J phase commit tags):
- `radiusXs`, 3×8 padding, 11px mono 700 0.04em
- Semantic bg + color

**`<FilterChip>`** — applied filter indicator in context bar.

### 7.6 Buttons (`<Btn>`)

| Variant | Background | Text | Border |
|---|---|---|---|
| `primary` | `c.accent` | `#FFFFFF` | none |
| `secondary` | `c.surface` | `c.textMid` | `1px c.border` |
| `ghost` | transparent | `c.textDim` | `1px transparent` |
| `danger` | `c.redDim` | `c.red` | `1px c.red30%` |
| `command` | `c.surface` | `c.accent` | `1px c.border` |
| `success` | `c.greenDim` | `c.green` | `1px c.green30%` |

Size: default 7×16 padding, sm 5×12. Radius `radiusSm` (8). Font 13px Inter 600. Disabled = opacity 0.4.

### 7.7 Inputs (`<Inp>`, `<TextArea>`, `<Sel>`)

- 40px height (Inp/Sel), min 72px (TextArea)
- `c.surfaceAlt` inset bg, `1px c.border`, `radiusSm`
- 14px Inter 500
- Focus: accent border + `3px c.accentDim` ring (no 12px glow)

### 7.8 Segmented control (`<SegmentedToggle>` in `kpi.jsx`)

- Container: `c.surfaceAlt` inset bg, `1px c.border`, `radiusMd`, 3px padding
- Button: 6×16 padding, `radiusSm`, 13px Inter 600
- **Active**: `c.surface` bg + `c.text` color + `shadowSm`
- Inactive: transparent + `c.textDim`
- **Not** accent-fill active — that violates "count the orange pixels"

### 7.9 Modal (`<Modal>` in `shared.jsx`)

- Backdrop: `rgba(0,0,0,0.4)` + `blur(4px)`
- Panel: `c.surface`, `radiusLg`, `shadowElevated`, max-width 460, `space[6]` padding
- Optional accent left border (3px)
- Focus trap, Escape closes

### 7.10 Side panel / drawer

- Width: 360–380px, fixed right, full height
- `c.surface` bg, `1px c.border` left, `shadowElevated`
- Enter: translateX(100%) → 0 at `motion.normal`
- Backdrop: `rgba(0,0,0,0.3)` (no blur)

### 7.11 Command palette

- Overlay: `rgba(0,0,0,0.4)` + `blur(6px)`
- Box: 600 wide, max-height 540, `c.surface` + `1px c.border` + `radiusLg` + `shadowElevated`
- Top accent bar: static 2px `c.accent` (not a gradient pulse)
- Search: transparent, `bodyLg` (15px Inter 500)
- Category pills: `radiusSm`, inset bg, mono 11/700 uppercase; active = `c.accentDim` bg + `c.accent` text
- Active result: `rgba(0,0,0,0.03)` bg + 2px `c.accent` left border

### 7.12 Commit cards

- `c.surface`, `1px c.border`, `radiusLg`, `shadowCard`, `space[5]` padding
- Avatar 36×36, `radiusSm+2` (10), inset bg, mono 12/700 initials
- Name 14/Inter 700 `c.text`; role 12/Inter 400 `c.textDim`
- Item rows: 9px dot with 2px accent border (filled = accent bg) + 13/Inter 500 text
- Type label: mono 11/700 (BUILD green, JAM accent)
- Project ref: mono 11/600 `c.textGhost`

### 7.13 Empty states (`<EmptyState>`)

- `c.surface` bg, `1px dashed c.border`, `radiusLg`, centered
- Max-width 420, 40px vertical padding
- Icon: 32px, `c.textGhost`
- Title: `displaySm` (16px Inter 700)
- Message: `bodySm` (13px) `c.textDim`
- Optional action: `<Btn variant="command" size="sm">`

### 7.14 Sync toast (`SyncToast`)

- Fixed bottom-right, `c.surface` + `radiusSm` + `shadowFloat` + 10×16 padding
- Mono 12/600 `c.textMid`
- Status dot: 8×8 flat solid, no `boxShadow` glow
- Syncing uses `c.accent` (not cyan), done = green, error = red
- Enter 250ms token cubic-bezier, exit 200ms ease-in

### 7.15 Login screen

- Page bg: `c.bg`
- Center card: `c.surface`, `radiusLg`, `shadowElevated`, max-width 400, 40px padding
- Logo: static orange dot (`FlowLogo`) + FLOW wordmark in JetBrains Mono 15/700 0.04em
- Title: `displayLg` (24/Inter 700)
- Sub-hero: cycle words "Declare · Lock · Pulse · Close" (mono 11)
- Primary CTA: `<Btn variant="primary">`, 44px height, full width — no drop-shadow glow

### 7.16 Charts (`chart.jsx`)

Shared rules across all charts:
- White card wrapper (`ChartCard` or surrounding `KpiCard`/`Surface`) with `shadowCard` + `radiusLg`
- Flat semantic colors at 80% opacity, hover/current at 100%
- Grid hairlines: `rgba(0,0,0,0.04)` (`GRID_HAIRLINE` constant)
- All axis + value labels: mono 11/600 `c.textDim`, tabular-nums
- No drop-shadow / glow / rainbow gradient
- Transitions: opacity / radius / width only, via `motion.fast` tokens

**`<MiniBarChart>`** — N-bar weekly trend with full-column hit areas. Bars `rx: 3`.

**`<SparkLine>`** — line + 8% area fill + dots (`r: 3` unlit, `r: 5` lit, hollow on `c.surface`). Hit zones span midpoints between points.

**`<StackedBarChart>`** — multi-series vertical stacks. Y-axis gridlines at 0/25/50/75/100%, dashed above the baseline. Segment `rx: 3`. Native `<title>` tooltip with per-series breakdown. `<ChartLegend>` underneath by default.

**`<Sparkline>`** (in `kpi.jsx`, distinct from `SparkLine`) — compact 6-bar sparkline that lives inside a `KpiCard`. Current week is the full-opacity last bar; others at 0.25. Optional `muted` variant uses inset bg for non-current bars. 40px tall, 3px gap.

**`<HealthBar>`** — inline progress bar (`chart.jsx`):
- Default: 48×5 bar + semantic-colored number + "Good / Fair / Poor" word (used in Pulse matrix, Projects registry)
- `compact` variant: 24×4 bar + number, no word (used on Board cards)

**`<HealthGauge>`** — inverted dark KPI card (`kpi.jsx`) with gradient track and tick marks (the 4th card of a KPI grid).

### 7.17 Gantt chart (`GanttChart.jsx`)

- Wrapper: `c.surface`, `radiusLg`, `shadowCard`
- Left pane: 280px, inset bg, `1px c.border` right
- Column headers: mono 11/600 `c.textDim`
- Today marker: 1px `#DC2626` vertical line
- Phase bars: phase-colored (`phaseColors()`), `radiusXs`, mono 11 project ID inside
- Hover card: `c.surface`, `radiusLg`, `shadowFloat`, portal-rendered

### 7.18 Terminal view (exception — stays dark)

Terminal (`TerminalView`), Rant (`RantView`), Admin (`AdminSettingsView`) are intentionally dark-themed. AppShell is hidden when `activeTab === "terminal"` to avoid a light/dark seam. CRT scanlines + block cursor are scoped to `.flow-terminal-root` via a `:not(.flow-terminal-root)` override so they never leak into light views.

```
Background:  #0D0F0D dark
Text:        #00ff41 (terminal green), #C8E6C9 for content
Font:        'JetBrains Mono' (was SF Mono — purged)
Height:      100vh (full viewport, no header visible)
```

---

## 8. Layout patterns

### 8.1 Standard view

```
[Header — 52px sticky, shadowSm]
[Context bar — 52px sticky, borderSubtle bottom]
[Page canvas — c.bg with noise texture]
  [main — max-w 1440, space[7] side padding]
    [KpiGrid — 4 cards, 16px gap]
    [SectionHead — mono title + right slot]
    [Table card — radiusLg shadowCard overflow:clip]
    [Optional: secondary cards]
```

### 8.2 Detail view

```
[Header — breadcrumb replaces nav tabs]
[Context bar — week label only]
[Page canvas]
  [main]
    [Hero card — c.surface shadowCard radiusLg]
    [KpiGrid — 2–4 compact cards with project/person telemetry]
    [SectionHead + content cards — stacked]
```

### 8.3 Responsive breakpoints

| Width | Behavior |
|---|---|
| 1440+ | Full layout |
| 900 | Header/main padding drops to 16px |
| 640 | Header/main padding drops to 12px; nav rail scrolls horizontally |

---

## 9. Accessibility

- **Contrast:** All text tokens meet WCAG AA against `c.surface` and `c.bg`
- **Focus rings:** All interactive primitives use `box-shadow: 0 0 0 3px c.accentDim` or `outline: 2px solid c.accent`
- **Keyboard:** Full keyboard nav preserved — 1–6 tabs, T terminal, Cmd+K palette, arrows in tables, Escape to go back
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables decorative animations; structural transitions remain
- **Screen reader:** Modals have `role="dialog"`, `aria-modal="true"`, `aria-label`. Tables use proper `<thead>`/`<tbody>`. Focus trap on modals

---

## 10. What's explicitly excluded

The following patterns existed in the pre-migration dark theme and were deliberately removed. Do not bring them back:

- Rainbow gradients (`purple → cyan → red`, multi-color progress bars)
- Ambient blob / texture-grid / texture-noise layers
- Infinite decorative loops (momentum-bob, timeline-marker-bob, phase-node-glow, severity-wave-*, overdue-blink, escalation-bounce, command-card-shimmer, cmd-search-glow)
- Border-glow / neon effects (`0 0 Xpx colorYY` shadows on any non-live element)
- CRT scanlines outside Terminal
- Glassmorphism (`backdrop-filter: blur(Xpx) saturate(Yx)`) on light canvas
- `transition: all` in JSX inline styles
- Fonts outside the stack: Space Grotesk, SF Mono, Fira Code, Cascadia Code, Press Start 2P
- Drop-shadow glows on buttons (`0 4px 16px accent40`)

---

## 11. File map

| File | Role |
|---|---|
| `src/styles/ds.js` | Token source of truth (color, space, radius, shadow, typography, motionTier, fonts, phaseColorMap) |
| `src/styles/theme.js` | Light/dark themes + `c`, `typo`, `layout`, `space`, `motion` exports; legacy aliases for compat |
| `src/styles/global.css` | CSS vars, noise texture, focus rings, scrollbar, responsive padding, reduced-motion |
| `src/components/AnimStyles.jsx` | Keyframes + overrides killing dark-era effects |
| `src/components/shared.jsx` | Modal, Surface, Badge, Tag, Btn, Inp, Sel, Th, EmptyState, KbdHint, FilterChip, DeltaIndicator |
| `src/components/kpi.jsx` | KpiGrid, KpiCard, HealthGauge, SectionHead, SegmentedToggle, Pill, PillRow, Sparkline |
| `src/components/chart.jsx` | HealthBar, ChartCard, ChartLegend, MiniBarChart, SparkLine, StackedBarChart, GRID_HAIRLINE |
| `src/components/AppShell.jsx` | Header + context bar + filter drawer + notification bell + floating pill |
| `src/components/FlowLogo.jsx` | Static orange dot + halo |
| `src/components/SyncToast.jsx` | Bottom-right sync notification (light Steel & Orange, no neon) |
| `src/components/CommandPalette.jsx` | Cmd+K palette (Steel & Orange, single-accent signaling) |
| `src/components/LoginScreen.jsx` | Sign-in screen (center card, primary CTA) |
| `src/components/OnboardingScreen.jsx` | Profile setup (center card, primary CTA) |
| `src/views/{Summary,Pulse,Projects,Humans,PeopleDeepDive,Guide,Settings}View.jsx` | All light Steel & Orange |
| `src/views/{Terminal,Rant,AdminSettings}View.jsx` | Dark Terminal exception |
