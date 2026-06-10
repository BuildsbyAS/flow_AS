# Track Timeline (Gantt) — Functionality Rundown

> Component: `src/components/project-detail/GanttTimeline.jsx` — the "Track timeline" Gantt rendered in the project-detail sheet.
> _Note: master also contains other Gantt-ish components (`GanttChart.jsx`, `TrackGantt.jsx`, and a Gantt view mode in `ProjectsView`); this document covers the project-detail one._

---

## The model

- **6 phase lanes**, fixed order: **PRD · Design · Dev · QA · Alpha · Beta**. Each lane is 60px tall.
- Everything is measured **in days** internally (epoch = Jan 1 2026), so every drag/resize moves **one day at a time** — never jumps a whole week.
- A lane can hold **multiple "nodes"** (activity bars). The seed shows this: the Design lane has both *Discovery* (a soft "light" node) and *Design* (solid).
- Fixed visible window: **Jan → Jun, 24 weeks / 168 days**. Bottom axis shows months + weeks (W1–W4), with a **highlight pill on the week containing "today."**
- The section header shows the **overall span** (earliest start → latest end of all nodes), live-updating.

## Phase chips (top row) — one card per phase

- Shows a **diamond + label** when the phase has nodes.
- **Subtitle is context-aware:**
  - 🔵 **"Currently active"** (blue live dot) when today falls inside one of its nodes;
  - otherwise the **date range(s)** — one line *per gap-separated cluster* (a phase that runs twice shows two ranges, not one merged span);
  - otherwise **"No dates."**
- **On hover**, action icons slide in:
  - **Eye / eye-off** → hide or show that lane on the chart.
  - **＋** → **quick-add** a ~4-week node (drops in after the last node).

## Creating nodes — three ways

1. **Chip ＋ (quick-add)** — a 28-day node appended after the lane's last node.
2. **Draw** — hover empty lane space and a **＋ follows your cursor**; click-drag to **rubber-band a new node** of any length. (The ＋ is suppressed near existing nodes so it never crowds a resize edge.)
3. **Click without dragging** on an empty lane → drops a default ~3-week node (only if the lane is empty).

## Editing nodes

- **Move** — grab the body, drag horizontally (clamped to the window). Clicking also **selects** it.
- **Resize** — grab the **left/right edge handles** (appear on hover). Hold **Alt** to resize **symmetrically from the center**.
- **Odometer dates** — while moving/resizing, the start/end day numbers **roll like a slot counter**.
- **Per-node menu** — open via the inline **⋯** (on hover) *or* **right-click anywhere on the node** (opens at the cursor):
  - **Edit dates** → a mini **calendar** with Start/End tabs; pick exact dates, Apply (validates end > start).
  - **Change phase** → submenu to **move the node to another lane** (current phase shown with a checkmark).
  - **Remove node.**
- **Select + Delete/Backspace** removes the selected node.

## Overlap handling — never silent

Any commit (create, move, resize, change-phase, quick-add, edit-dates) that lands on another node **in the same lane** pops a modal:

- **Merge** — partial overlap → fuses them into one union node.
- **Replace** — when the new node *fully covers* the existing one(s).
- **Cancel** — reverts cleanly (deletes if it was a fresh create; restores prior position/phase otherwise).
- **Transitive absorption:** if the merged union then overlaps still more nodes, they're all pulled in.
- **Live warning** during the gesture: the in-flight node and everything it would hit get a **warm warning ring**; the draw "ghost" turns dashed-red when it conflicts.

## Hide / focus

- Eye toggle hides a lane → it collapses to a **"Phase · Hidden"** band. Adding a node to a hidden phase **auto-unhides** it.

## Undo / redo + keyboard

- **Full undo/redo** (up to 80 steps); **one gesture = one undo step** (recorded only after a change settles, not mid-drag).
- Shortcuts:
  - **⌘/Ctrl+Z** — undo
  - **⌘/Ctrl+Shift+Z** or **⌘/Ctrl+Y** — redo
  - **Delete/Backspace** — remove selected
  - **Esc** — cancel a draw / close the menu / deselect
  - **Enter/Esc** — confirm/cancel in the overlap dialog
- All shortcuts are suppressed while typing in a field or popover.

---

## Use cases covered

- Planning a project across **parallel, overlapping tracks** (Dev running alongside QA, etc.).
- **Fast vs. precise** scheduling (chip-＋ / draw vs. calendar date entry).
- **Reschedule / extend / shorten / reassign-phase / delete** an activity.
- **Multiple disjoint periods per phase** (e.g., a reopened QA → two clusters, reflected in the chip).
- **Deliberate merge/replace** of overlapping work.
- **"Today" awareness** — which phases are currently active + active-week highlight.
- **Declutter** by hiding lanes; **recover** from mistakes via undo.
- Full **keyboard + right-click** workflows.

## Boundaries / gaps worth knowing

- **Not persisted.** It runs entirely on local component state seeded from `mockProject.js` (rendered as `<GanttTimeline />` with no `onChange`). **Edits reset on reload** — there's no save to Supabase wired in. This is a polished prototype of the *interaction*, not yet a backed feature.
- **Node names are fixed to the phase label** — no custom renaming (even new nodes inherit the phase name; "Discovery" only exists because it's seeded).
- **Fixed window** — no zoom/pan/scroll; nodes clamp to Jan–Jun. Can't extend the range.
- **No dependencies/links** between nodes, **no lane reordering**, and **no assignees/resources** on a node.
