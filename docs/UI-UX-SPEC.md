# TaskFlow — UI/UX Specification

This document translates `docs/PRD.md` and `docs/TECHNICAL-SPEC.md` into a visual and interaction source of truth for TaskFlow's frontend. It defines the design system, application shell, and every required page/state in enough detail that a developer (or an AI implementation agent) can build the UI without guessing. It does not contain application code and nothing described here has been implemented yet.

Scope alignment: TaskFlow is a board → list → task kanban tool (PRD §4–§10) with real-time sync (PRD §11), comments (§12), attachments (§13), activity logging (§14), search/filter/pagination (§15), notifications (§16), and three roles — Admin, Manager, Member (PRD §6, Tech Spec §5). This spec's navigation, roles, and terminology match those documents exactly (e.g., "Boards" not "Workspaces"; "lists" are the kanban columns To Do / In Progress / Done referenced generically as "Boards" navigation item).

---

## 1. Design Direction

**Vibe:** a polished, professional SaaS productivity tool — closer to Linear or Height than to a generic AI-generated admin template. Calm, confident, information-dense without feeling cluttered.

**Principles**
- Neutral/slate foundation, one restrained indigo/blue accent used sparingly (primary actions, active states, focus rings, links) — never as a decorative background.
- Generous, consistent spacing over decoration. Whitespace is the primary tool for hierarchy, not color or borders.
- Flat surfaces: subtle 1px borders and small, low-opacity shadows instead of heavy drop shadows.
- Small, purposeful border radii (see §2.5) — never pill-shaped cards, never oversized rounded corners on containers.
- No gradients, no glassmorphism/blur panels, no glowing buttons, no decorative illustrations.
- Motion is functional and brief (150–200ms): it confirms an action happened, it never performs.
- Desktop-first information density (this is a work tool used for hours at a time), degrading gracefully to tablet and mobile (§13).
- Every screen must support a future dark theme without redesign — this is why the design system is token-based (§2), never a hardcoded hex value in a component.

**Explicitly avoid:** excessive gradients, glassmorphism, oversized rounded "bubble" cards, bouncy/spring animations, drop-shadow-heavy floating panels, saturated multi-color UI, emoji as UI icons, decorative stock illustration.

---

## 2. Design System

All values below are design tokens. Components reference tokens, never literal values, so a dark theme can be introduced later by swapping the token set without touching component markup.

### 2.1 Color

**Neutral (slate) scale** — backgrounds, text, borders, dividers:

| Token | Light value | Usage |
|---|---|---|
| `color-bg-canvas` | `#F8FAFC` (slate-50) | App background behind content |
| `color-bg-surface` | `#FFFFFF` | Cards, panels, modals, sidebar |
| `color-bg-surface-muted` | `#F1F5F9` (slate-100) | Subtle fills: hover rows, input backgrounds, code blocks |
| `color-bg-inset` | `#E2E8F0` (slate-200) | Recessed elements, disabled fills, skeleton base |
| `color-border` | `#E2E8F0` (slate-200) | Default borders, dividers |
| `color-border-strong` | `#CBD5E1` (slate-300) | Input borders, emphasized dividers |
| `color-text-primary` | `#0F172A` (slate-900) | Headings, primary body text |
| `color-text-secondary` | `#475569` (slate-600) | Supporting text, labels, metadata |
| `color-text-tertiary` | `#94A3B8` (slate-400) | Placeholders, disabled text, timestamps |
| `color-text-on-accent` | `#FFFFFF` | Text/icons on filled accent surfaces |

**Primary accent (restrained indigo):**

| Token | Value | Usage |
|---|---|---|
| `color-accent-50` | `#EEF2FF` | Selected row/nav background, subtle highlight |
| `color-accent-100` | `#E0E7FF` | Badge fill, hover background for accent-text elements |
| `color-accent-500` | `#6366F1` | Default accent (icons, links, focus ring core) |
| `color-accent-600` | `#4F46E5` | Primary button fill, active nav item, primary text links |
| `color-accent-700` | `#4338CA` | Primary button hover/active |

**Semantic colors** (status/feedback only — never used decoratively):

| Token | Value | Usage |
|---|---|---|
| `color-success-500` / `-50` | `#16A34A` / `#F0FDF4` | Success toast, "Done" affirmations |
| `color-warning-500` / `-50` | `#D97706` / `#FFFBEB` | Warning toast, due-soon indicators |
| `color-danger-500` / `-50` | `#DC2626` / `#FEF2F2` | Destructive actions, error states, overdue indicators |
| `color-info-500` / `-50` | `#0284C7` / `#F0F9FF` | Informational banners |

**Priority colors** (distinct from semantic colors so "High priority" is never confused with "error"):

| Priority | Dot/text color | Badge background |
|---|---|---|
| Low | `#64748B` (slate-500) | `#F1F5F9` (slate-100) |
| Medium | `#D97706` (amber-600) | `#FEF3C7` (amber-100) |
| High | `#DC2626` (red-600) | `#FEE2E2` (red-100) |

**Status colors** (list/column identity, used only as a small dot or thin top border on column headers — never a full-column fill):

| Status | Color |
|---|---|
| To Do | `#94A3B8` (slate-400) |
| In Progress | `#6366F1` (accent-500) |
| Done | `#16A34A` (success-500) |

**Dark mode:** every token above has a dark-mode pair (e.g., `color-bg-canvas` → `#0B0F19`, `color-bg-surface` → `#111827`, `color-text-primary` → `#F1F5F9`, borders lightened to `#1F2937`/`#334155`). Accent hues stay the same but shift one step lighter (e.g., `color-accent-500` → `#818CF8`) to maintain contrast on dark surfaces. Components must consume semantic tokens (`color-bg-surface`, not `#FFFFFF`) so this swap requires no markup changes.

### 2.2 Typography

**Font family:** a single UI sans-serif — `Inter` (fallback: `-apple-system, "Segoe UI", Roboto, sans-serif`). One monospace fallback (`ui-monospace, "SF Mono", Menlo, monospace`) for any code/ID snippets only.

**Type scale:**

| Token | Size / line-height | Weight | Usage |
|---|---|---|---|
| `text-display` | 28px / 36px | 600 (Semibold) | Page-level headers (e.g., "Boards", "Settings") |
| `text-h1` | 22px / 30px | 600 | Section headers, modal titles |
| `text-h2` | 17px / 24px | 600 | Card titles, panel headers |
| `text-body` | 14px / 20px | 400 | Default body text, form values, table cells |
| `text-body-medium` | 14px / 20px | 500 | Emphasized body text, nav labels, button text |
| `text-small` | 13px / 18px | 400 | Metadata, timestamps, helper text |
| `text-caption` | 12px / 16px | 500 | Uppercase eyebrow labels, badge text (letter-spacing 0.02em) |

**Font weights used:** 400 (Regular), 500 (Medium), 600 (Semibold) only. Bold (700) is reserved and unused, to keep hierarchy calm.

### 2.3 Spacing

4px base unit, exposed as a scale so nothing is ad-hoc:

`space-1: 4px · space-2: 8px · space-3: 12px · space-4: 16px · space-5: 20px · space-6: 24px · space-8: 32px · space-10: 40px · space-12: 48px · space-16: 64px`

Usage conventions:
- Component internal padding: `space-3`–`space-4` (compact controls) up to `space-6` (cards, modals).
- Gap between related fields: `space-3`. Gap between distinct form sections: `space-8`.
- Page content max-width: `1280px`, centered, with `space-8` horizontal gutters (`space-4` on tablet, `space-4` on mobile).

### 2.4 Borders & Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | Inputs, buttons, badges, small controls |
| `radius-md` | 8px | Cards, dropdown menus, tooltips |
| `radius-lg` | 12px | Modals, panels |
| `radius-full` | 9999px | Avatars, status dots, unread indicator |
| `border-width-default` | 1px | All standard borders |

No card, modal, or container ever exceeds `radius-lg`. No "oversized rounded" (16px+) containers anywhere in the product.

### 2.5 Shadows

Shadows are subtle and used only to lift interactive overlays off the canvas — never on static cards (cards are separated by a 1px border, not a shadow).

| Token | Value | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(15, 23, 42, 0.05)` | Dropdown menus, popovers |
| `shadow-md` | `0 4px 12px rgba(15, 23, 42, 0.08)` | Modals, task detail drawer |
| `shadow-drag` | `0 8px 20px rgba(15, 23, 42, 0.12)` | Task card being dragged |

### 2.6 Core Components

**Buttons**
- Variants: `primary` (accent-600 fill, white text), `secondary` (white fill, `color-border-strong` border, primary text), `ghost` (no fill/border, text-only, `color-bg-surface-muted` on hover), `destructive` (danger-500 fill, white text — reserved for delete/archive confirmations).
- Sizes: `sm` (28px height, `text-small`), `md` (36px height, `text-body-medium`, default), `lg` (40px height, used for form submits in modals).
- States: default → hover (background one step darker) → active (one step darker still, no scale/transform) → focus (2px accent ring, `color-accent-500` at 40% opacity, offset 2px) → disabled (`color-bg-inset` fill, `color-text-tertiary` text, no pointer events).
- Icon buttons (header actions, card overflow menus): 32px square, `radius-sm`, ghost style by default.

**Inputs (text, textarea, search)**
- 36px height (single-line), `radius-sm`, 1px `color-border-strong`, white background, `space-3` horizontal padding.
- Focus: border becomes `color-accent-500`, 2px accent ring at 20% opacity around the whole control (no layout shift).
- Error: border becomes `color-danger-500`; a `text-small` danger-colored message appears below with `space-1` gap, prefixed by a small error icon.
- Placeholder text uses `color-text-tertiary`.
- Disabled: `color-bg-surface-muted` background, `color-text-tertiary` text, border removed.

**Selects / Dropdowns**
- Trigger styled identically to a text input, with a chevron-down icon (`color-text-secondary`) right-aligned.
- Menu: `color-bg-surface`, `radius-md`, `shadow-sm`, 1px border, `space-2` vertical padding, options at 32px row height with `space-3` horizontal padding, hover = `color-bg-surface-muted`, selected = `color-accent-50` background with a small checkmark.
- Menus are keyboard-navigable (see §14) and close on outside click or `Escape`.

**Badges**
- `radius-sm`, `text-caption`, `space-1`/`space-2` (vertical/horizontal) padding, no border.
- Used for: priority (§Design system priority colors), status/labels, role tags (Admin/Manager/Member — neutral slate background, no color-coding by role to avoid implying hierarchy via color), unread counts (accent-filled, white text, `radius-full`, numeric).

**Avatars**
- Circular (`radius-full`), sizes: 20px (dense lists/comments), 24px (task cards), 32px (default, header/member lists), 40px (profile/settings).
- Content: uploaded image if present, else initials (1–2 letters) on a deterministic muted background color derived from the user's name (a small fixed palette of 6 muted slate/indigo/teal/amber tones — never bright/saturated).
- Stacked avatar groups (task card assignees, board card members): overlapping by 8px, white 2px border to separate from background, a trailing `+N` circle in `color-bg-inset` when more than 3 members.
- Online indicator: 8px circle, `color-success-500`, `radius-full`, positioned bottom-right with a 2px white ring cutout, only shown where presence is meaningful (Members page, task assignee tooltip).

**Cards** (board cards, dashboard summary cards, task cards)
- `color-bg-surface`, 1px `color-border`, `radius-md`, `space-4` internal padding (task cards use `space-3` for density).
- Hover (clickable cards only): border becomes `color-border-strong`, subtle `shadow-sm` appears — no scale/translate transform, no color background change.
- No shadow at rest.

**Modals**
- Centered overlay, max-width 480px (forms like Create Board / Invite Member) or 640px (multi-field forms); scrim is `rgba(15, 23, 42, 0.4)` (flat, not blurred).
- Structure: header (`text-h1` title + close icon button, `space-6` padding) → divider → body (`space-6` padding, scrollable if content exceeds viewport) → divider → footer (right-aligned secondary + primary button, `space-4` padding).
- `radius-lg`, `shadow-md`. Enter animation: 150ms fade + 4px upward translate. Exit: 100ms fade out, no translate.
- Closes on scrim click, `Escape`, or the close icon (confirmation required first for destructive/unsaved-changes contexts — see §15).

**Dropdowns / Menus** (overflow "⋯" menus on cards, user profile menu)
- Same visual spec as Select menus (§2.6 Selects). Triggered by click, positioned via a small 4px offset from the trigger, flips above the trigger if insufficient viewport space below.

**Tooltips**
- Dark surface (`color-text-primary` background, white text) regardless of light/dark theme, `text-small`, `radius-sm`, `space-2` padding, small pointer/arrow, `shadow-sm`.
- Appears after a 400ms hover delay, disappears immediately on mouse-leave. Used for: truncated text, icon-only buttons, avatar name-on-hover.

**Toasts**
- Bottom-right stacked, `color-bg-surface`, 1px border, `radius-md`, `shadow-md`, `space-4` padding, max-width 360px.
- Left-edge 3px accent bar colored by type (success/danger/info/warning uses the semantic-500 tone).
- Auto-dismiss after 4s (hover pauses the timer); destructive-undo toasts (e.g., "Task archived — Undo") persist 6s and include an inline text action.
- Max 3 stacked at once; older ones collapse into the stack with a subtle downward shift.

**Loading States**
- Skeleton screens (not spinners) for initial page/list loads: `color-bg-inset` blocks matching the shape of the eventual content (card outlines, text-line bars), with a slow (1.5s) left-to-right shimmer.
- Inline spinners (16px, accent-colored, rotating) only for button-triggered actions ("Saving...", "Creating board...") — button label swaps to include the spinner and becomes disabled during the request.
- Full-page loads reserve layout space (skeleton matches final grid) to avoid content jump.

**Empty States**
- Centered within their container: a simple 48–64px monochrome line icon (`color-text-tertiary`), `text-h2` headline, one line of `text-small` supporting copy, and a single primary action button where applicable.
- Never uses illustration/mascot art — stays consistent with the flat, professional direction.

**Error States**
- Inline field errors: see Inputs above.
- Section/page-level errors (e.g., failed data fetch): same layout as empty states but with a danger-tinted icon, a one-line explanation, and a "Retry" secondary button.
- Fatal/unexpected errors (500s): a centered full-page state with a generic message ("Something went wrong") and a "Reload" action — never expose stack traces (per Tech Spec §9).

### 2.7 Task Priority & Status Styles (reference)

- **Priority** — rendered as a small dot + label badge on task cards, and as a labeled select in the task detail: Low (slate), Medium (amber), High (red). See color table in §2.1.
- **Status** — implicit from which column a task sits in on the kanban board; also shown as a badge in list views (My Tasks, search results) using the status colors in §2.1: To Do (slate dot), In Progress (indigo dot), Done (green dot, with label text struck through only in dense/table views, never on kanban cards).

---

## 3. Application Layout (Authenticated Shell)

**Structure:** fixed left sidebar + sticky top header + scrollable main content area.

**Sidebar** (240px wide, fixed, `color-bg-surface`, 1px right border)
- Top: TaskFlow wordmark/logo (`space-6` padding).
- Navigation list (`space-2` vertical gaps), each item: icon (20px) + label (`text-body-medium`), 36px row height, `radius-sm`, full-width click target with `space-2` horizontal inset from sidebar edges.
  - Dashboard
  - Boards
  - My Tasks
  - Activity
  - Settings
- Active item: `color-accent-50` background, `color-accent-600` text/icon, a 3px accent-600 bar on the far-left inner edge.
- Hover (inactive): `color-bg-surface-muted` background.
- Bottom of sidebar: collapse toggle (desktop only, collapses to a 64px icon-only rail with tooltips on hover for each item).

**Header** (64px tall, sticky, `color-bg-surface`, 1px bottom border, spans remaining width right of sidebar)
- Left: page title or breadcrumb (`text-h1`) — breadcrumb used on nested pages (e.g., `Boards / Marketing Site / Task detail` context), plain title elsewhere.
- Center-right: global search input (see §12 for behavior), 320px wide on desktop, collapses to an icon that expands on click at narrower widths.
- Right: notification bell icon button (with unread dot, see §12), then user avatar (32px) opening the profile menu (Profile, Settings, Log out).

**Main content area**
- `color-bg-canvas` background, `space-8` padding (desktop), content constrained to `max-width: 1280px` and centered when the viewport exceeds it (prevents overly long line lengths/scattered layouts on ultrawide monitors).

**Responsive shell behavior**
- **Desktop (≥1280px):** sidebar expanded (240px) by default, full header, search inline.
- **Laptop (1024–1279px):** sidebar defaults to collapsed icon rail (user can re-expand); content padding reduces to `space-6`.
- **Tablet (768–1023px):** sidebar hidden by default, opened via a hamburger icon in the header as an overlay drawer (not push) that closes on selection or outside-tap.
- **Mobile (<768px):** identical drawer pattern as tablet; header search collapses to an icon; page title truncates with ellipsis; bottom-safe-area padding respected for iOS devices.

---

## 4. Required Pages — Overview

Each page below specifies layout, sections, key components, primary actions, and empty/loading/error states. Unless noted, all authenticated pages use the shell from §3.

### 4.1 Landing Page (unauthenticated, no shell)
- **Layout:** simple marketing layout — sticky top nav (logo left, "Log in" + "Sign up" buttons right), a hero section (headline, one-line subhead, primary CTA "Get started"), a 3-column feature summary (Boards, Real-time collaboration, Activity tracking — plain icon + short text, no illustrations), and a footer (minimal links).
- **Primary actions:** "Sign up" (primary button, top nav and hero), "Log in" (secondary/ghost, top nav).
- No loading/empty/error states beyond standard page load.

### 4.2 Login
- **Layout:** centered single-column card (max-width 400px) on a plain `color-bg-canvas` background. Logo above the card.
- **Sections:** "Log in" title (`text-h1`), email field, password field (with show/hide toggle), "Forgot password?" link (right-aligned under password), primary "Log in" button (full width), divider, "Don't have an account? Sign up" link.
- **Primary action:** submit login (primary button, `lg` size, full width of card).
- **Error state:** a single inline banner above the form fields (danger-50 background, danger-500 left border) for invalid-credentials/server errors; field-level errors for empty/malformed input.
- **Loading state:** button shows inline spinner + "Logging in...", inputs disabled during the request.

### 4.3 Register
- Same card layout as Login. Fields: name, email, password (with a lightweight strength hint below, per PRD §7 minimum password strength), confirm password. Primary "Create account" button. Footer link back to Login.
- Same error/loading conventions as Login; duplicate-email is a field-level error under the email input, not a generic banner.

### 4.4 Dashboard
See §5 for full detail. Summary: greeting header, a compact task-overview strip, "My Tasks" (Due Today / In Progress / Completed groupings), Recent Activity, and My Boards — all within the standard shell.

### 4.5 Boards
See §6 for full detail. Summary: page header + search + "Create Board", a responsive grid of board cards, empty state for zero boards.

### 4.6 Board Detail / Kanban
See §7 for full detail. Summary: board header (breadcrumb, title, description, search/filters/members/Add Task/Settings), three columns (To Do / In Progress / Done) of draggable task cards.

### 4.7 Activity
See §9 for full detail. Summary: page header + optional board filter, chronological feed grouped by day, paginated.

### 4.8 Settings
See §11 for full detail. Summary: left-hand sub-navigation (Profile, Preferences, Notifications, Security) within the main content area, right side shows the active section's form.

---

## 5. Dashboard

**Purpose:** a fast personal orientation screen — "what do I need to do, and what's happening" — without becoming a cluttered widget wall (per brief: keep it useful, not screen-filling).

**Layout (desktop):** single scrollable column, `space-8` vertical rhythm between sections, max-width 1280px.

1. **Greeting header** — `text-display` ("Good morning, {firstName}") + `text-small` secondary line (e.g., today's date, or a one-line count: "You have 4 tasks due today"). No card container — sits directly on canvas.
2. **Task overview strip** — a single row of 3 compact stat tiles (not heavy cards): **Due Today**, **In Progress**, **Completed** (this week). Each tile: large `text-h1` count, `text-small` label beneath, a thin colored left border matching the relevant status color (§2.1). Clicking a tile deep-links to My Tasks pre-filtered.
3. **My Tasks** — a `text-h2` section header with a "View all" link (→ My Tasks, if a dedicated route exists, otherwise → Boards filtered to assignee=me) aligned right. Below: a compact list (not a full kanban) of up to 5 upcoming/overdue tasks, each row showing title, board name (small muted tag), priority badge, due date (red text if overdue), assignee avatar. Row click opens the Task Detail (§8).
4. **Recent Activity** — `text-h2` header, a condensed version of the Activity feed (§9) showing the 5 most recent events across the user's boards, each as a single line (avatar + "Name did X on Task/Board" + relative timestamp). "View all" links to the Activity page.
5. **My Boards** — `text-h2` header + "View all" link. A horizontally-scrollable row (desktop) of up to 4 compact board cards (smaller variant of the Boards-page card, §6) for boards the user is a member of, ordered by most recently active.

**Empty states**
- No tasks due/assigned: My Tasks section shows a small inline empty state ("Nothing due — you're all caught up") instead of the list, no full-section empty illustration needed.
- No boards yet: My Boards section shows a single empty-state card with a "Create your first board" primary action, replacing the horizontal scroll row.
- No recent activity: a single muted line ("No recent activity yet").

**Loading state:** skeleton tiles for the overview strip, skeleton rows for My Tasks/Activity, skeleton cards for My Boards — matches final layout shape.

---

## 6. Boards Page

**Layout:** standard shell, page header row, then a responsive card grid.

**Page header row**
- Left: `text-display` "Boards".
- Right: search input (filters boards by name, live/debounced 300ms) + primary "Create Board" button.

**Board grid**
- Responsive grid: 3 columns (desktop ≥1280px), 2 columns (laptop/tablet), 1 column (mobile). `space-6` gap.
- **Board card** contents (see §2.6 Cards for base style):
  - Top: board name (`text-h2`, truncated with tooltip if long) + a `⋯` overflow menu (Archive, Settings — visible to Manager/Admin only, per Tech Spec §5) top-right.
  - Description preview (`text-small`, `color-text-secondary`, 2-line clamp).
  - Progress indicator: a thin horizontal bar (`color-bg-inset` track, `color-accent-600` fill) showing `done tasks / total tasks`, with a `text-caption` percentage label to its right.
  - Bottom row: stacked member avatars (left, §2.6) + "Updated {relative time}" (`text-small`, `color-text-tertiary`, right-aligned).
- Entire card is clickable → navigates to Board Detail; the overflow menu stops propagation.

**Empty state** (no boards exist / search yields none)
- Centered empty state per §2.6, differentiated copy: "No boards yet — create your first board to get started" (with Create Board CTA) vs. "No boards match your search" (with a "Clear search" secondary action, no CTA duplicate).

**Create Board modal**
- Standard modal (§2.6), max-width 480px. Fields: Board name (text, required), Description (textarea, optional), Visibility (select: Private / Team, per PRD §8). Footer: "Cancel" (secondary) + "Create Board" (primary, disabled until name is non-empty).
- On submit: primary button shows loading spinner; on success, modal closes and the new card appears at the top of the grid with a brief highlight (200ms accent-50 background fade-out) rather than a jarring re-sort.

**Loading state:** skeleton grid of card-shaped placeholders matching the current viewport's column count.

---

## 7. Kanban Board (Board Detail)

**Board header** (below the global app header, sticky within the content scroll area)
- **Breadcrumb:** `text-small`, `color-text-secondary` — "Boards / {Board Name}".
- **Title row:** board name (`text-h1`, inline-editable for Manager/Admin — click to reveal a text input) + description (`text-small`, secondary, optional, truncated with "Show more").
- **Toolbar row** (right-aligned, `space-3` gaps): search-within-board input (filters visible cards live), Filters button (opens a popover: filter by assignee, priority, label, due-date range — matches PRD §15), stacked member avatars (click → Members panel, §10), "Add Task" primary button, board Settings icon button (Manager/Admin only — opens board settings, e.g., labels, membership, archive).

**Columns**
- Three fixed columns: **To Do**, **In Progress**, **Done** — each a vertical flex container, `color-bg-surface-muted` background, `radius-md`, full column height, `space-4` internal padding, `space-4` gap between columns.
- **Column header:** status dot (§2.1) + column name (`text-body-medium`) + task count badge (neutral, `text-caption`) + a `+` icon button (add task directly into this column) — all in one row, `space-3` bottom margin.
- Columns scroll independently vertically when task count exceeds viewport height; the column header stays pinned (sticky) while its card list scrolls.

**Task Card**
- `color-bg-surface`, 1px border, `radius-md`, `space-3` padding, `space-2` vertical gap between stacked cards.
- Content, top to bottom:
  1. Priority badge (top-left, small, per §2.7) — Done-column cards may mute this slightly (70% opacity) since priority is less relevant once complete.
  2. Title (`text-body-medium`, 2-line clamp).
  3. Description preview (`text-small`, `color-text-secondary`, 1-line clamp, omitted entirely if the task has no description — no "No description" placeholder text on the card itself).
  4. Bottom meta row (icons + `text-small`, `color-text-tertiary`, left-to-right, wraps to a second line only if unavoidable): due date (calendar icon; red text if overdue), attachment count (paperclip icon, only shown if >0), comment count (speech-bubble icon, only shown if >0).
  5. Bottom-right: assignee avatar (24px) or a dashed-outline "unassigned" placeholder circle.
- Card click (anywhere except drag) opens Task Detail (§8).

**Drag-and-drop behavior**
- Grab affordance: cursor becomes `grab`/`grabbing`; card lifts with `shadow-drag` and a slight (2°) tilt is *not* used (kept restrained) — instead the card scales to 1.02x and gains the drag shadow, other cards animate out of the way with a 150ms ease.
- A placeholder gap (dashed border, `color-bg-inset` fill, matching card height) shows the drop target position as the dragged card moves over a column.
- Cross-column drag updates the status badge instantly on drop (optimistic update), reconciled with the server response; on failure, the card animates back to its original position and a danger toast explains the failure ("Couldn't move task — try again").
- Column auto-scrolls when dragging a card near the top/bottom edge of a scrollable column.
- Real-time: when another connected user moves a task (Tech Spec §7, `task:moved`), the card animates to its new position for all other viewers with the same 150ms ease, not an abrupt jump.
- Touch/mobile: press-and-hold (300ms) initiates drag to disambiguate from scrolling; see §13 for the mobile column layout.

**Empty state (per column):** a small inline placeholder inside the column ("No tasks" `text-small`, `color-text-tertiary`, centered, `space-6` vertical padding) rather than collapsing the column.

**Loading state:** skeleton column headers + 2–3 skeleton card shapes per column on initial board load.

**Error state:** if the board fails to load, the content area shows a page-level error state (§2.6) with Retry, in place of the columns.

---

## 8. Task Detail

**Presentation:** a right-side drawer (480px wide, slides in from the right, `shadow-md`, full viewport height) on desktop/laptop; becomes a full-screen modal/page on tablet and mobile (§13). Opening a task does not navigate away from the board — the URL updates (e.g., `/boards/:id?task=:taskId`) so it's linkable/shareable, but the kanban board remains visible/dimmed behind it on desktop.

**Header (within drawer)**
- Close icon button (top-left) + breadcrumb-style context ("{Board Name} / {List}").
- Overflow menu (top-right, `⋯`): Archive, Delete (per-role, Tech Spec §5 — Delete restricted to owner/Manager/Admin).

**Body sections, top to bottom** (`space-6` gaps, each section separated by a subtle divider):
1. **Title** — large inline-editable text (`text-h1`), click-to-edit, auto-saves on blur.
2. **Metadata row** — a 2-column key/value grid (`text-small` labels, `color-text-secondary`): Status (select, drives which column the task lives in), Priority (select, §2.7 colors), Assignee (avatar + name, opens an assignee-picker dropdown showing board members), Due date (date picker input, red text if overdue).
3. **Description** — inline-editable rich-ish textarea (plain text/markdown-lite, no code-execution formatting needed for MVP), placeholder "Add a description..." when empty, auto-saves on blur.
4. **Attachments** — `text-h2` "Attachments (N)" header + "Add" button (opens file picker; Multer upload per Tech Spec §8). List of attachment rows: file-type icon, filename (link, triggers authenticated download), size, uploader name, uploaded date, delete icon (owner/Manager/Admin only). Empty state: single muted line "No attachments yet."
5. **Comments** — `text-h2` "Comments (N)" header. List of comments (avatar, name, timestamp, body, edit/delete affordance for own comments or Manager/Admin override per Tech Spec §5), newest at bottom. `@mention` autocomplete triggers a dropdown of board members while typing in the composer. Composer: textarea + "Comment" primary button (small), pinned at the bottom of this section.
6. **Activity / History** — `text-h2` "Activity" header, a condensed reverse-chronological list scoped to this task only (reuses the Activity feed row component, §9), collapsed to the 5 most recent by default with a "Show more" link.

**Edit actions:** most fields are inline-editable directly (no separate "Edit mode" toggle) — this keeps the interaction lightweight and matches the PRD's real-time collaborative intent (edits should feel immediate and propagate live).

**Delete/Archive:** triggered from the overflow menu; both require a confirmation dialog (§15) since they remove the task from active views. Archive is the default/reversible action; Delete (if exposed at all — PRD prefers soft delete) is labeled clearly as permanent where applicable.

**Loading state:** skeleton drawer (header bar + metadata grid + text-line blocks) while task data loads.
**Error state:** if the task fails to load or was deleted by another user in real time, the drawer shows an inline error ("This task is no longer available") with a "Close" action.

---

## 9. Activity

**Layout:** standard shell. Header row: `text-display` "Activity" + an optional board-filter select ("All boards" default, or a specific board — only boards the user belongs to, per Tech Spec §5 authorization).

**Feed**
- Grouped by day with a sticky `text-caption` date divider ("Today", "Yesterday", then formatted dates).
- Each activity row: avatar (32px) + a single sentence built from structured parts — **bold user name** + plain-text action verb ("moved", "commented on", "created", "added {member} to") + **linked target** (task or board name, navigates to it) — with a `text-small`, `color-text-tertiary` relative timestamp right-aligned (e.g., "2h ago", exact time on hover tooltip).
- Rows are separated by a 1px divider, `space-3` vertical padding, no card container (a flat list reads better for a long chronological feed than boxed cards).

**Pagination:** infinite scroll with a loading spinner row appended at the bottom as more pages load (Tech Spec §15 pagination), rather than numbered pages — appropriate for a chronological feed. A "Back to top" floating button appears after scrolling past ~2 screens.

**Empty state:** centered empty state — "No activity yet" with supporting text "Actions on your boards will show up here."

**Loading state:** skeleton rows (avatar circle + two text bars) for initial load; a smaller inline spinner row for subsequent infinite-scroll pages.

---

## 10. Members

*(Presented as a panel/modal opened from a board's member avatars or board Settings, per §7 toolbar — not a standalone sidebar nav item, matching the PRD's board-scoped membership model.)*

**Layout:** modal or slide-over panel, `text-h1` "Members" header, "Invite" primary button top-right.

**Member list**
- Table-like list, each row: avatar (32px, with online indicator dot per §2.6) + name + email (`text-small`, secondary) + role badge (Admin / Manager / Member — neutral badge styling, role changes via an inline select for users with permission per Tech Spec §5) + a `⋯` overflow menu (Remove from board — Manager/Admin only, disabled/hidden for Members).
- Current user's own row shows "(You)" appended to the name and disables self-role-change/self-removal from this UI (must be done by another Manager/Admin).

**Roles reference (must match Tech Spec §5 exactly):**
- **Admin** — full system access, all boards.
- **Manager** — manages their own boards, members, and tasks.
- **Member** — works within boards they're added to; cannot manage membership.

**Invite Member modal**
- Fields: email or username input (with a small helper: "They'll receive an invitation" per PRD §8), Role select (Manager / Member — Admin is a global role, not assignable per-board here). Footer: Cancel / "Send Invite" (primary, disabled until a valid email/username is entered).
- On success: a toast confirms ("Invitation sent to {email}") and, if the invitee is an existing user, they appear in the list immediately with an "Invited" badge until they accept.

**Role management UI:** inline select per row (as above) rather than a separate screen — changes save immediately with a small inline confirmation (brief checkmark flash on the row) rather than a toast, since it's a low-risk, easily-reversible action performed in-context.

**Empty/loading/error:** N/A beyond standard list skeleton (list is never truly empty — the current user is always a member).

---

## 11. Settings

**Layout:** standard shell. Left sub-navigation (200px, within the main content area, not the primary app sidebar) with 4 items; right side shows the active section as a form panel (max-width 640px, `color-bg-surface` card).

**Sub-nav items:** Profile · Preferences · Notifications · Security

### Profile
- Avatar (40px, with an "Upload" overlay on hover) + name field + email field (read-only or requires re-verification if changed — implementation detail, but UI shows it as an editable field with a "Verify" note if changed). Save button (primary, only enabled once a field is dirty).

### Preferences
- Simple form: theme preference (Light / Dark / System — select or segmented control; ships as a control now even though dark mode implementation is future scope per PRD §21, so the toggle can be wired up later without new UI), default landing page after login (select: Dashboard / Boards), date format (select).

### Notifications
- A list of toggle rows (switch component: 40×22px pill track, `color-bg-inset` off / `color-accent-600` on, circular 18px thumb) for each notification type from PRD §16: Task assignment, @Mentions, Due-date reminders, Board invitations. Each row: label + one-line description + switch, right-aligned.

### Security
- Change Password sub-section: current password, new password, confirm new password fields + "Update Password" button.
- Sessions sub-section (optional/simple for MVP): a note on active session / "Log out of all devices" secondary button, reflecting refresh-token invalidation (Tech Spec §4 logout).

**Loading/empty/error:** each panel shows a skeleton form on load; save failures show an inline banner error at the top of the panel (not a full-page error, since the rest of Settings remains usable).

---

## 12. Notifications

**Trigger:** bell icon button in the global header (§3), 20px icon, with a small `radius-full` unread-count badge (accent-600 fill, white numeral, max display "9+") anchored top-right of the bell when unread count > 0; a plain small dot instead of a number is used if a numeric count feels too noisy — numeric badge is the default.

**Panel:** a dropdown panel (360px wide, `shadow-sm`, `radius-md`, anchored below the bell, right-aligned to the header edge) rather than a full page, since notifications are transient/glanceable (matches PRD §16 in-app real-time model).

**Panel structure**
- Header row: "Notifications" (`text-h2`) + "Mark all as read" text link (right-aligned, disabled/hidden if nothing is unread).
- List: each notification row — small type icon (assignment/mention/due-date/invitation, distinguished by icon shape not color, to keep the palette restrained) + message text (`text-body`, unread rows use `text-body-medium` weight, read rows use regular weight) + relative timestamp (`text-small`, tertiary) + an unread dot (8px, accent-600) at the row's left edge for unread items.
- Row click marks it read (subtle background fade from `color-accent-50` to transparent over 300ms) and navigates to the related task/board.
- Footer: "View all" link if a fuller history is needed beyond the panel's recent-N (optional, links to a dedicated view if one exists; otherwise the panel is the complete surface for MVP).

**Real-time behavior:** new notifications arrive live (Tech Spec §7, `notification:new`) — the bell badge count increments and, if the panel is open, the new row animates in at the top with a brief highlight fade, matching the toast/real-time conventions used elsewhere.

**Empty state:** centered within the panel — "You're all caught up" with a muted checkmark icon, no CTA needed.

**Loading state:** 3 skeleton rows on first open.

---

## 13. Responsive Design

Breakpoints: Mobile `<768px` · Tablet `768–1023px` · Laptop `1024–1279px` · Desktop `≥1280px`.

| Concern | Desktop / Laptop | Tablet | Mobile |
|---|---|---|---|
| Sidebar | Expanded (desktop) / collapsible icon rail (laptop) | Hidden, opens as an overlay drawer via hamburger | Same drawer pattern as tablet |
| Header search | Inline 320px field | Icon that expands to a full-width overlay field on tap | Same as tablet |
| Board grid (§6) | 3 columns | 2 columns | 1 column, full-width cards |
| Kanban columns (§7) | 3 fixed columns side-by-side, no horizontal scroll needed at typical widths | 3 columns with horizontal scroll (snap-to-column), each column ~85% viewport width | Same horizontal scroll pattern as tablet; one column peeks at the edge to hint scrollability |
| Task Detail (§8) | Right-side drawer over the board | Full-screen modal (slides up) | Full-screen modal (slides up), header becomes a simple back arrow + title |
| Modals generally | Centered, fixed max-width | Centered, `space-4` viewport margin | Full-width with `space-4` margin, or full-screen for tall forms (e.g., Register) |
| Tables/lists (Members, Activity) | Full row layout with all columns | Row layout retained, secondary metadata (e.g., email) may wrap to a second line | Card-per-row layout: primary info stacked vertically, secondary metadata below in smaller text, avoiding a cramped horizontal table |
| Dashboard tiles (§5) | 3-tile row | 3-tile row (may compress padding) | Stacked single column |

**Non-negotiables**
- Mobile sidebar is always a drawer/overlay, never a squeezed permanent column.
- Kanban always supports horizontal scroll on narrow viewports rather than stacking columns vertically (preserves the spatial "which column" mental model).
- Modals adapt per the table above; none are ever wider than the viewport (no forced horizontal scroll on a modal).
- No component or page introduces unintended horizontal overflow on the body — all wide content (tables, the kanban board itself) scrolls within its own contained region, not the page.
- Touch targets are a minimum 40×40px on tablet/mobile (buttons/icon-buttons scale up from the 32–36px desktop sizing where needed).

---

## 14. Accessibility

- **Keyboard navigation:** every interactive element (nav items, buttons, cards, menu triggers, kanban cards) is reachable and operable via `Tab`/`Shift+Tab` and `Enter`/`Space`. Kanban drag-and-drop has a keyboard-accessible fallback: focusing a task card and pressing `Enter` opens a "Move to..." menu listing the other columns/positions as an alternative to pointer drag.
- **Focus states:** every focusable element shows a visible 2px accent-colored focus ring (§2.6 Buttons/Inputs) — never `outline: none` without a replacement. Focus order follows visual/DOM order (header → sidebar → main content → modal, when a modal is open focus is trapped within it).
- **Semantic HTML:** proper landmark elements (`<nav>` for sidebar, `<header>`, `<main>`), headings in a logical hierarchical order per page (one `<h1>`-equivalent per page), lists (`<ul>/<li>`) for nav items, board grids, and activity feeds, `<button>` for actions vs `<a>` for navigation.
- **Form labels:** every input has a visible, associated `<label>` (not placeholder-only labeling); required fields are marked with both a visual indicator and an accessible attribute; error messages are programmatically associated with their field (`aria-describedby`) and announced.
- **Dialog accessibility:** modals and the Task Detail drawer use `role="dialog"` + `aria-modal="true"`, trap focus while open, restore focus to the triggering element on close, and are dismissible via `Escape`.
- **Color contrast:** all text/background combinations meet WCAG AA (4.5:1 for body text, 3:1 for large text/`text-h1`+). Status/priority meaning is never conveyed by color alone — always paired with a text label or distinct icon shape (relevant for the priority badges, status dots, and online indicator).
- **Screen-reader-friendly controls:** icon-only buttons carry an `aria-label` (e.g., "Notifications", "Add task to To Do"); drag-and-drop state changes are also announced via an `aria-live` region ("Task moved to In Progress"); toasts use `aria-live="polite"`.

---

## 15. Interaction Principles

- **Hover states:** every clickable surface (buttons, cards, nav items, table rows, menu options) has a distinct but subtle hover treatment (background shift or border darken, per component specs above) — pointer cursor always reflects interactivity.
- **Active/pressed states:** one step further than hover (slightly darker fill/border); no scale-down "press" effect, keeping motion minimal.
- **Loading states:** skeletons for content-level loads, inline button spinners for action-level loads (§2.6) — a page never shows a lone centered spinner for a full-page load if a skeleton shape is feasible.
- **Success/error feedback:** toasts for transient confirmations (task created, invite sent) and errors from actions initiated outside a form context (e.g., a failed drag-and-drop); inline banners/field errors for form-level validation; both follow the color and iconography conventions in §2.6.
- **Confirmation dialogs:** required before any destructive or hard-to-reverse action — deleting a task/board, removing a member, permanently deleting (vs. archiving) an attachment. Confirmation modal pattern: `text-h1` question-form title ("Delete this task?"), one line of consequence copy, Cancel (secondary, left) + destructive-styled confirm button (right) — never a plain "OK", the confirm button always restates the verb ("Delete", "Remove", "Archive").
- **Drag-and-drop feedback:** see §7 for the full kanban spec — the same lift/shadow/placeholder-gap language should be reused for any other future draggable list (e.g., reordering board lists) for consistency.
- **Animations:** restrained and purposeful throughout — 150–200ms ease-out for most transitions (modal enter/exit, dropdown open, card drag), no bounce/spring easing, no animated backgrounds, no auto-playing motion anywhere. Real-time updates from other users (§7, §12) fade/slide into place rather than popping in abruptly, to avoid disorienting the viewer mid-task.

---

## Consistency Notes (cross-checked against PRD & Technical Spec)

- Navigation and terminology (Boards, My Tasks, Activity, Settings, Admin/Manager/Member) match PRD §6 and Tech Spec §5 exactly.
- Task fields in the detail view (title, description, assignee(s), due date, priority, labels, status) match PRD §9 and the `Task` schema in Tech Spec §3.1.
- Attachments and comments UI reflect the metadata fields defined in Tech Spec §3.1 (`Attachment`, `Comment`) — filename, size, uploader, timestamp; author, timestamp, edit/delete rules.
- Real-time visual behavior (task move animation, live comment/notification arrival) maps directly to the Socket.io event catalog in Tech Spec §7.
- Role-based UI visibility (board settings, member removal, comment/attachment delete overrides) mirrors the capability table in Tech Spec §5 — nothing in this spec grants a role a capability the backend wouldn't also authorize.
- Search/filter/pagination patterns (board search, kanban filters, Activity infinite scroll) correspond to PRD §15's scope; no additional filter types beyond assignee/label/priority/due-date/status are introduced here.
- Dark mode is specified as a token-swap requirement now (§2.1) without being implemented, consistent with PRD §21 listing it as a future/bonus feature.
- No application code, package installation, or additional documentation files are included, per the task constraints.
