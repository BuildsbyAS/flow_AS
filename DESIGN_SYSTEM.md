# Flow Design System v2 — Steel & Orange

> Light-mode-first. Steel-gray aluminum canvas. White floating cards. Orange accent used like a status LED on industrial equipment. JetBrains Mono for data. Inter for everything else. Nothing below 11px. Built for 400 daily users at a $5B company.

---

## 1. Color System

### 1.1 Background Surfaces

| Token | Hex | Usage |
|-------|-----|-------|
| `page` | `#EDEDF0` | Page canvas — the "aluminum chassis." Every view sits on this. |
| `card` | `#FFFFFF` | Card surfaces — KPI cards, table wrappers, commit cards, modals. White panels floating on the steel canvas. |
| `inset` | `#F3F3F6` | Recessed areas — input backgrounds, segmented control containers, table header rows, search boxes. Feels "pressed in" relative to cards. |
| `tableHeader` | `#F7F7FA` | Column header row background. Slightly lighter than inset to separate from data rows. |

**Rule:** Cards are always lighter than the page. The page-to-card contrast creates the "floating panel on aluminum" feel. Never put a card directly on white — always on the steel-gray page.

**Noise texture:** Apply a subtle SVG fractalNoise overlay on the page background at 1.8% opacity. This gives the aluminum surface micro-grain and breaks digital flatness. Cards do NOT get the noise — only the page canvas.

### 1.2 Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `textPrimary` | `#1A1A1E` | Headings, KPI values, project names, person names. The darkest text. Never pure black. |
| `textSecondary` | `#4A4A52` | Body text — table cells, descriptions, owner names, form values. |
| `textTertiary` | `#7E7E8A` | Labels — column headers, KPI labels, section titles, placeholders, nav inactive items. |
| `textGhost` | `#AEAEB8` | Decorative — keyboard shortcut hints, disabled text, empty-state project IDs, week navigation arrows. |

### 1.3 Accent Color

| Token | Value | Usage |
|-------|-------|-------|
| `accent` | `#E8590C` | Active nav tab text + underline, live indicator dot, primary CTA button fill, commitment dots (filled), logo mark, active filter chips. |
| `accentSoft` | `rgba(232,89,12,0.08)` | Active tab background tint, hover backgrounds on interactive elements, focus ring outer glow. |
| `accentGlow` | `rgba(232,89,12,0.25)` | Logo dot box-shadow, live indicator dot box-shadow. Subtle glow, not neon. |

**Rule:** Accent appears ONLY on: active states, primary CTAs, the live indicator, commitment status dots, and the logo mark. Everything else is grayscale. If everything is highlighted, nothing is highlighted. Count the orange pixels on any screen — if there are more than 5 distinct orange elements visible, something is wrong.

### 1.4 Borders

| Token | Value | Usage |
|-------|-------|-------|
| `borderSubtle` | `rgba(0,0,0,0.07)` | Card borders, table row dividers, input borders (default), nav dividers. Barely visible. |
| `borderMedium` | `rgba(0,0,0,0.12)` | Hover-state borders on cards/buttons, active input borders, table header bottom border. |

### 1.5 Semantic Colors (Data Only)

These colors appear ONLY inside data content — badges, health indicators, phase tags, chart elements. Never in UI chrome.

| Token | Color | Background | Usage |
|-------|-------|------------|-------|
| `green` | `#059669` | `#ECFDF5` | Success, "Good" health, done outcomes, BUILD type, Ship phase, positive deltas |
| `red` | `#DC2626` | `#FEF2F2` | Critical, "Poor" health, blocked outcomes, negative deltas, danger buttons |
| `amber` | `#B45309` | `#FFFBEB` | Warning, "Fair" health, Dev phase, carry outcomes, project IDs, "No commitments" tag |
| `purple` | `#6D28D9` | `#F5F3FF` | PRD phase, planning indicators |
| `blue` | `#1D4ED8` | `#EFF6FF` | Design phase, info indicators |
| `cyan` | `#0E7490` | `#ECFEFF` | QA phase, person entity references |

**Phase color map:**
```
PRD     → purple (#6D28D9)
Design  → blue (#1D4ED8)
Dev     → amber (#B45309)
QA      → cyan (#0E7490)
Alpha   → green (#059669)
Beta    → green (#059669)
GA      → green (#059669)
```

**Health thresholds:**
```
75-100  → green (#059669)  label: "Good"
40-74   → amber (#D97706)  label: "Fair"    (note: #D97706 for the bar/number, slightly brighter than token amber)
0-39    → red (#DC2626)    label: "Low"
```

---

## 2. Typography

### 2.1 Font Stack

| Role | Family | Fallbacks |
|------|--------|-----------|
| Sans (body) | `'Inter'` | `system-ui, -apple-system, sans-serif` |
| Mono (data) | `'JetBrains Mono'` | `monospace` |

**Rule:** Mono is used ONLY for:
- KPI hero numbers
- Project IDs (X08, X104)
- Health numbers
- KPI delta indicators (+5, -4)
- Phase commitment tags (1B, 2J)
- Commit type labels (BUILD, JAM)
- Section titles (e.g., "PROJECT MATRIX")
- Terminal view (all text)
- Search box placeholder
- Logo wordmark

Everything else uses Inter. Body text, nav items, table cells, button labels, badge text, descriptions, names — all Inter.

### 2.2 Type Scale

**Hard rule: Nothing below 11px in the entire application.**

| Token | Font | Size | Weight | Tracking | Transform | Usage |
|-------|------|------|--------|----------|-----------|-------|
| `kpiHero` | Mono | 36px | 700 | -0.03em | — | KPI card primary values |
| `displayLg` | Sans | 24px | 700 | -0.02em | — | Page titles (Guide, Terminal boot text) |
| `displayMd` | Sans | 20px | 700 | -0.02em | — | Detail view person/project names |
| `displaySm` | Sans | 16px | 700 | -0.01em | — | Card headers, modal titles |
| `nav` | Sans | 13px | 600 | 0 | — | Navigation tab labels |
| `bodyLg` | Sans | 15px | 500 | 0 | — | Prominent body text, context bar messages |
| `body` | Sans | 14px | 500 | 0 | — | Table cells, form text, descriptions, owner names |
| `bodySm` | Sans | 13px | 500 | 0 | — | Sub-text, commitment descriptions, helper text |
| `sectionTitle` | Mono | 12px | 700 | 0.08em | uppercase | Section headers ("PROJECT MATRIX", "THIS WEEK'S COMMITMENTS") |
| `tableHeader` | Sans | 12px | 600 | 0.03em | uppercase | Table column headers |
| `kpiLabel` | Sans | 12px | 600 | 0.04em | uppercase | KPI card labels ("ACTIVE PROJECTS", "SHIPPED THIS WEEK") |
| `monoData` | Mono | 13px | 700 | 0 | — | Health numbers, inline metric values |
| `monoSm` | Mono | 12px | 700 | 0.02em | — | KPI deltas, commit types (BUILD/JAM), project IDs in context |
| `badge` | Sans | 12px | 700 | 0 | — | Status badges (GA, Dev, PRD, Beta) |
| `tag` | Mono | 11px | 700 | 0.04em | — | Phase commitment tags (1B, 2J), smallest allowed size |
| `micro` | Sans | 11px | 600 | 0 | — | Health words ("Fair", "Good"), keyboard hint labels, timestamps |

### 2.3 Font Loading

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

Load weights 400-800 for Inter, 400-800 for JetBrains Mono. Use `font-display: swap` to prevent invisible text during load.

---

## 3. Spacing

### 3.1 Scale (4px base)

| Token | Value | Common usage |
|-------|-------|-------------|
| `space1` | 4px | Icon-to-text gap inside badges |
| `space2` | 8px | Gap between inline elements (badge + divider + badge) |
| `space3` | 12px | Tight card padding, gap between KPI rows |
| `space4` | 16px | Standard gap between cards in a grid, table cell padding |
| `space5` | 20px | Card internal padding (commit cards), section margin |
| `space6` | 24px | KPI card padding, generous card padding |
| `space7` | 32px | Page body side padding, spacing between major sections |
| `space8` | 40px | Large vertical spacing between page sections |

### 3.2 Page Layout

```
Max content width:    1440px (centered)
Page side padding:    32px
Section gap:          32px (between KPI grid and table)
Card grid gap:        16px
```

---

## 4. Elevation & Shadows

Shadows are the primary depth cue. They replace the border-glow approach of the old dark theme.

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `shadowNone` | `none` | Flat elements — inset areas, table rows, inactive tabs |
| `shadowSm` | `0 1px 2px rgba(0,0,0,0.04)` | Header bar, active segmented button, subtle lift |
| `shadowCard` | `0 1px 3px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05)` | KPI cards, table wrapper, commit cards, standard floating panels |
| `shadowElevated` | `0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.07)` | Modals, command palette, filter drawer, side panels |
| `shadowFloat` | `0 8px 30px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)` | Tooltips, popovers, Gantt hover cards |

**Rule:** Every card that sits on the page canvas gets `shadowCard`. Modals and overlays get `shadowElevated`. Tooltips get `shadowFloat`. Nothing else gets a shadow. Table rows, inputs, badges — no shadows.

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radiusXs` | 5px | Tags, badges, small status pills, phase tags |
| `radiusSm` | 8px | Buttons, inputs, small cards, search box, segmented buttons |
| `radiusMd` | 12px | Segmented control container, dropdown menus |
| `radiusLg` | 14px | KPI cards, table wrapper, commit cards, modals, all primary cards |
| `radiusPill` | 100px | Pill buttons (if needed), avatar badges |

---

## 6. Motion & Animation

### 6.1 Timing Tiers

| Tier | Duration | Easing | Usage |
|------|----------|--------|-------|
| `instant` | 100ms | `ease-out` | Color changes on hover, focus ring appearance, border color transitions |
| `fast` | 150ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Button hover lift, tab switch, toggle flip, input focus |
| `normal` | 250ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Card entrance (fadeInUp), row slide-in, panel slide, modal open |
| `slow` | 400ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Page transition (fadeIn), KPI counter animation |

### 6.2 Animation Patterns

**Page transition:**
```css
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
/* 250ms, applied to .flow-page on tab switch */
```

**Card / row entrance:**
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
/* 250ms per element, stagger 30ms between siblings */
```

**KPI counter:**
```css
/* JS-driven: count from 0 to value over 400ms, ease-out cubic */
```

**Live indicator pulse:**
```css
@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1); }
}
/* 2s infinite ease-in-out, on the accent-colored dot */
```

**Side panel / filter drawer:**
```css
/* Enter: translateX(100%) → translateX(0), 250ms normal easing */
/* Exit: translateX(0) → translateX(100%), 200ms ease-in */
/* Backdrop: opacity 0 → 0.5, 250ms */
```

**Modal:**
```css
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
/* 250ms normal easing */
```

### 6.3 Interactive Micro-Motion

| Element | Hover | Active/Press | Focus |
|---------|-------|-------------|-------|
| Button (Btn) | `translateY(-1px)`, border → borderMedium | `scale(0.97)`, no shadow | `box-shadow: 0 0 0 3px accentSoft` |
| Card (clickable) | `translateY(-1px)`, shadow → shadowElevated, border → borderMedium | `scale(0.995)` | `outline: 2px solid accent at 30%` |
| Card (static) | No change | — | — |
| Table row | `background: rgba(0,0,0,0.012)` | — | `outline: 2px inset accent at 20%` |
| Nav tab | `color: textTertiary` | — | `color: accent` (active) |
| Input | — | — | `border-color: accent at 40%`, `box-shadow: 0 0 0 3px accentSoft` |
| Badge / tag | No hover effect | — | — |

### 6.4 What Is Removed (from old dark theme)

- Glassmorphism background blobs (`.flow-texture-blob`, `.flow-texture-grid`)
- Particle animations in FlowLogo
- Neon glow effects on cards and rows
- CRT scanlines (KEPT only inside Terminal view)
- Gradient text clips
- Ambient blob breathing animations
- `pulseGlow` and `radarPulse` on non-live elements
- `commitLockGlow` breathe effect (replace with static green border)
- Audio micro-tones (keep useTactile but make optional / off by default)

---

## 7. Component Specifications

### 7.1 Header Bar (56px, sticky top)

```
Background:  card (#FFFFFF)
Border:      1px solid borderSubtle (bottom)
Shadow:      shadowSm
Height:      56px
Padding:     0 32px

Logo:        orange dot (9px circle, accent color, accentGlow shadow) + "FLOW" text (mono 15px/700, 0.04em tracking)
Nav tabs:    13px Inter 600, ghost color default, accent color + 2px bottom border when active
Search:      inset background, borderSubtle, mono 13px placeholder
Terminal:    36x36 icon button, inset background
```

### 7.2 Context Bar (sticky, below header)

```
Background:  card (#FFFFFF)
Border:      1px solid borderSubtle (bottom)
Padding:     10px 32px

Week nav:    28x28 arrow buttons (inset bg, borderSubtle), week label (13px Inter 600)
Live dot:    7px circle, accent color, pulse animation, accentGlow shadow
Live text:   13px Inter 500, textTertiary
Filter/Rest: pill buttons (8px radius, borderSubtle, 13px Inter 500)
```

### 7.3 KPI Cards

```
Layout:      4-column grid (1.5fr 1fr 1fr 1fr), 16px gap
Card:        24px padding, radiusLg, card bg, borderSubtle, shadowCard

Label:       kpiLabel token (12px Inter 600, uppercase, 0.04em, textTertiary)
Delta:       monoSm token (12px Mono 700), green for +, red for -, ghost for flat
Value:       kpiHero token (36px Mono 700, -0.03em, textPrimary)
Sub-text:    bodySm token (13px Inter 500, textTertiary)

First card (wide):   contains phase pills row below value
Phase pills:         12px Inter 700, semantic bg+color per phase, 6px radius, 5px 11px padding
Sparkline cards:     flex bar chart, 40px height, 3px gap, accent color for current bar
Health card:         INVERTED — bg #1A1A1E, text #F0F0F4, gradient health bar, tick marks
```

### 7.4 Table (inside card wrapper)

```
Wrapper:     radiusLg, card bg, borderSubtle, shadowCard, overflow hidden

Header row:  tableHeader bg (#F7F7FA), 12px Inter 600 uppercase 0.03em, textTertiary
             1px borderSubtle bottom, 12px 16px padding
             Sort indicator: accent color arrow

Body rows:   14px Inter 500, textSecondary, 13px 16px padding
             1px rgba(0,0,0,0.03) bottom border
             Last row: no bottom border
             Hover: rgba(0,0,0,0.012) background

Project cell:  project ID (mono 12px/700 amber) + name (14px Inter 600 textPrimary) + optional "No commitments" tag
Owner cell:    14px Inter 500, textSecondary
Status badge:  12px Inter 700, semantic bg+color, radiusXs, 3px 10px padding
Health cell:   48x5px bar (radiusXs, inset bg) + mono 13px/700 number (semantic color) + micro "Fair"/"Good" label
Phase cells:   mono 11px/700 tag (semantic bg+color, radiusXs, 3px 8px padding) showing "1B", "2J" etc.
Ship cell:     same as status badge but green only (GA, Beta, Alpha)
```

### 7.5 Badges & Tags

**Status Badge** (for phase display: GA, Dev, PRD, QA, Beta, Design):
```
Font:        badge token (12px Inter 700)
Padding:     3px 10px
Radius:      radiusXs (5px)
Colors:      semantic bg + semantic color per phase
```

**Phase Commitment Tag** (for matrix cells: 1B, 2J):
```
Font:        tag token (11px Mono 700, 0.04em tracking)
Padding:     3px 8px
Radius:      radiusXs (5px)
Colors:      semantic bg + semantic color per phase
```

**"No Commitments" Tag:**
```
Font:        11px Inter 600
Padding:     3px 8px
Radius:      radiusXs (5px)
Color:       amber text on amber-bg, 1px amber-bg border
```

### 7.6 Buttons (Btn)

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| Default | card (#FFF) | textSecondary | 1px borderSubtle |
| Primary | accent (#E8590C) | #FFFFFF | none |
| Ghost | transparent | textTertiary | none |
| Danger | red-bg | red | 1px red at 20% |
| Success | green-bg | green | 1px green at 20% |

```
Padding:     7px 16px (default), 5px 12px (sm)
Radius:      radiusSm (8px)
Font:        13px Inter 600
Hover:       translateY(-1px), border → borderMedium (except primary: brightness 1.1)
Active:      scale(0.97)
Disabled:    opacity 0.4, cursor not-allowed
Focus:       box-shadow 0 0 0 3px accentSoft
```

### 7.7 Inputs (Inp, TextArea, Sel)

```
Background:  inset (#F3F3F6)
Border:      1px borderSubtle
Radius:      radiusSm (8px)
Height:      40px (Inp/Sel), min-height 72px (TextArea)
Font:        body token (14px Inter 500)
Color:       textPrimary (value), textTertiary (placeholder)

Focus:       border-color accent at 40%, box-shadow 0 0 0 3px accentSoft
Disabled:    opacity 0.4
```

### 7.8 Segmented Control

```
Container:   inset bg, 1px borderSubtle, 3px padding, radiusMd (12px)
Button:      7px 28px padding, radiusSm (8px), 13px Inter 600
Inactive:    textTertiary, no background
Active:      card bg (#FFF), textPrimary, shadowSm
```

### 7.9 Modal

```
Backdrop:    rgba(0,0,0,0.4), backdrop-filter blur(4px)
Panel:       card bg, radiusLg, shadowElevated, max-width 460px
             modalIn animation (scale 0.96→1, opacity 0→1, 250ms)
Header:      displaySm (16px Inter 700), optional accent left border
Body:        16px padding
Footer:      borderSubtle top, 16px padding, right-aligned buttons
Close:       ghost button, top-right
Focus trap:  yes
Escape:      closes
```

### 7.10 Side Panel (Pulse project detail, filter drawer)

```
Width:       380px (project detail), 360px (filter drawer)
Position:    fixed right, full height below header
Background:  card bg
Border:      1px borderSubtle (left)
Shadow:      shadowElevated
Enter:       translateX(100%) → 0, 250ms
Exit:        translateX(0) → 100%, 200ms
Backdrop:    rgba(0,0,0,0.3), 250ms fade
```

### 7.11 Command Palette

```
Trigger:     Cmd+K or F key
Overlay:     rgba(0,0,0,0.5), backdrop-filter blur(8px)
Box:         600px wide, max-height 540px, radiusLg, shadowElevated, card bg
             modalIn animation

Search input: transparent bg, bodyLg font, no border
Divider:     1px borderSubtle
Category pills: radiusSm, inset bg, monoSm font, active = accentSoft bg + accent text
Results:     14px Inter 500, 12px 16px padding
Active item: rgba(0,0,0,0.03) bg, accent left border (2px)
```

### 7.12 Commit Cards (HumansView detail)

```
Card:        20px 22px padding, radiusLg, card bg, borderSubtle, shadowCard
Avatar:      36x36, radiusSm+2 (10px), inset bg, borderSubtle, mono 12px/700 initials
Name:        14px Inter 700, textPrimary
Role:        12px Inter 400, textTertiary

Commit items: 10px vertical gap
Status dot:  9px circle, 2px accent border. Filled = accent bg. Unfilled = transparent.
Text:        13px Inter 500, textSecondary
Type label:  mono 11px/700, green for BUILD, accent for JAM
Project ref: mono 11px/600, textGhost
```

### 7.13 Empty States

```
Container:   centered, max-width 360px, 48px vertical padding
Icon:        32px, textGhost color
Title:       displaySm (16px Inter 700), textPrimary
Message:     bodySm (13px Inter 500), textTertiary, 8px top margin
Action:      Btn default variant, 16px top margin
```

### 7.14 Toast (SyncToast)

```
Position:    fixed bottom-right, bottom 68px, right 20px
Card:        radiusSm, card bg, borderSubtle, shadowFloat
Padding:     10px 16px
Font:        mono 12px/600
States:      syncing (accent dot), done (green dot + checkmark), error (red dot + X)
Enter:       translateY(8px) → 0, opacity 0 → 1, 250ms
Exit:        translateY(0) → 8px, opacity 1 → 0, 200ms
Auto-dismiss: 2.4s (done), 3.4s (error)
```

### 7.15 Login Screen

```
Background:  page (#EDEDF0)
Center card: card bg, radiusLg, shadowElevated, max-width 400px, 40px padding
Logo:        orange dot (large, 12px) + "FLOW" mono text
Title:       displayLg (24px Inter 700)
Subtitle:    bodySm, textTertiary
CTA button:  Btn primary (accent bg, white text), full width
Error:       bodySm, red text, 8px top margin
Footer:      micro, textGhost
```

### 7.16 Charts (Summary view)

```
Container:   inside card wrapper (radiusLg, shadowCard)
Background:  transparent (sits on card white)
Grid lines:  1px rgba(0,0,0,0.04)
Axis labels: mono 11px/600, textTertiary
Bar fills:   semantic colors at 80% opacity, hover at 100%
Line strokes: semantic colors, 2px
Area fills:  semantic colors at 8% opacity
Tooltip:     card bg, radiusSm, shadowFloat, 12px padding
```

### 7.17 Gantt Chart

```
Wrapper:     card bg, radiusLg, shadowCard
Left pane:   280px, borderSubtle right, inset bg
Timeline:    scrollable, 48px per week column
Column headers: mono 11px/600, textTertiary
Today marker: 1px red (#DC2626) vertical line
Bars:        phase-colored, radiusXs, mono 11px project ID text inside
Hover card:  card bg, radiusLg, shadowFloat, portal-rendered
```

### 7.18 Terminal View (EXCEPTION — stays dark)

Terminal view is intentionally dark themed. It uses the existing dark tokens from `themes.dark` in theme.js. Do NOT apply the light design system to Terminal, Rant, or Admin views that render inside the Terminal shell.

```
Background:  #0D0F0D (dark)
Text:        #00ff41 (terminal green) for prompts, #C8E6C9 for content
Font:        JetBrains Mono throughout
Scanlines:   KEEP the CRT overlay
Password:    KEEP the blinking block cursor
```

---

## 8. Layout Patterns

### 8.1 Standard View Layout

```
[Header - 56px, sticky, white, shadowSm]
[Context Bar - ~44px, sticky, white, borderSubtle bottom]
[Page Canvas - #EDEDF0 with noise texture]
  [Body - max-width 1440px, centered, 28px 32px padding]
    [KPI Grid - 4-column, 16px gap]
    [Section Header - flex between title + segmented control]
    [Table Card - radiusLg, shadowCard, full width]
    [Optional: Commit Cards - 3-column grid, 16px gap]
```

### 8.2 Detail View Layout (Projects/People/Commit)

```
[Header - with breadcrumb replacing nav tabs]
[Context Bar - week label only, no tab help text]
[Page Canvas]
  [Body]
    [Hero Card - elevated stats, radiusLg, shadowCard]
    [Content sections - stacked cards]
```

### 8.3 Responsive Breakpoints

| Width | Behavior |
|-------|----------|
| 1440px+ | Full layout, all columns visible |
| 1280px | Slightly tighter padding (24px instead of 32px) |
| 1024px | KPI grid collapses to 2x2, table horizontal scrolls |
| 768px | KPI grid collapses to 1-column stack, commit grid to 1-column |

---

## 9. Accessibility

- **Contrast:** All text-on-background combinations meet WCAG AA (4.5:1 for body, 3:1 for large text)
- **Focus rings:** Every interactive element has a visible focus-visible state using `box-shadow: 0 0 0 3px accentSoft`
- **Keyboard:** Full keyboard navigation preserved (1-6 tabs, T terminal, Cmd+K palette, arrows in tables, Escape to go back)
- **Reduced motion:** Respect `prefers-reduced-motion: reduce` — disable fadeInUp, pulse, count-up animations. Keep instant state changes.
- **Screen reader:** All modals have `role="dialog"`, `aria-modal="true"`, `aria-label`. Focus trap on modals. Tables have proper `<thead>`/`<tbody>`.

---

## 10. File Map

| File | Role |
|------|------|
| `src/styles/ds.js` | **NEW** — All design system tokens as JS exports |
| `src/styles/theme.js` | Updated — light theme uses ds.js, dark theme kept for Terminal |
| `src/styles/global.css` | Updated — all CSS classes rewritten for light mode |
| `src/styles/animations.jsx` | Updated — remove glow effects, keep structural animations |
| `src/components/shared.jsx` | Updated — all primitives use new tokens |
| `src/components/AppShell.jsx` | Updated — header + context bar match spec |
| `src/components/AnimStyles.jsx` | Updated — light-mode hover/focus/entrance |
| `src/components/CommandPalette.jsx` | Updated — light palette |
| `src/components/FlowLogo.jsx` | Simplified — static orange dot, no particles |
| `src/components/SyncToast.jsx` | Updated — light card style |
| All views except Terminal | Updated — light palette, cards on steel canvas |
| `src/views/TerminalView.jsx` | **UNCHANGED** — keeps dark theme |
