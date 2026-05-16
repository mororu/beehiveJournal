---
title: 'Mobile Hamburger Menu & Button Label Fix'
slug: 'mobile-nav-hamburger-button-fix'
created: '2026-05-16'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['SvelteKit 2', 'Svelte 5 Runes', 'TypeScript strict']
files_to_modify:
  - src/routes/+layout.svelte
  - src/routes/hives/[hiveId]/inspect/+page.svelte
  - src/routes/hives/[hiveId]/inspections/[inspectionId]/edit/+page.svelte
code_patterns: ['svelte5-runes-state', 'css-media-query-mobile']
test_patterns: ['manual browser test at 375px']
---

# Tech-Spec: Mobile Hamburger Menu & Button Label Fix

**Created:** 2026-05-16

## Overview

### Problem Statement

On mobile viewports (~375px), the app navigation bar overflows horizontally because all 4 nav links, the username, and the "Abmelden" button are in a single `display: flex` row with no overflow handling. Additionally, the "Königinnenstatus" button labelled "Zellen vorhanden" overflows its button box in the inspection forms because `white-space: nowrap` prevents the two-word label from wrapping inside the shrunk flex child.

### Solution

1. Add a hamburger button (`☰`) to the nav bar that is **only visible on mobile** (`≤640px`). Tapping it toggles a full-width dropdown panel below the nav bar that lists all nav links, the `PendingSyncBadge`, username, and "Abmelden" — all stacked vertically. The desktop layout is entirely unchanged.
2. Shorten the queen status label from `'Zellen vorhanden'` → `'Zellen'` in both the new-inspection form and the edit-inspection form so all three queen buttons fit comfortably in one row at 375px.

### Scope

**In Scope:**
- Hamburger toggle button in `src/routes/+layout.svelte` (mobile only)
- Mobile dropdown panel with all nav links + username + logout, closes on link click
- CSS media query at 640px to hide/show desktop vs. mobile nav elements
- Queen status label shortened in `inspect/+page.svelte` and `inspections/[inspectionId]/edit/+page.svelte`

**Out of Scope:**
- Dropdown open/close animations or transitions
- Any changes to the desktop (>640px) nav layout
- Any other mobile layout issues beyond these two
- Hamburger icon SVG (use `☰` character)

---

## Context for Development

### Codebase Patterns

- **Svelte 5 Runes**: use `let menuOpen = $state(false)` for toggle state. No `writable()` stores in `.svelte` files.
- **CSS custom properties only**: no hardcoded hex values — use `var(--color-surface)`, `var(--color-border)`, `var(--color-hover)`, `var(--color-text)`, `var(--color-text-muted)`.
- **Scoped styles**: all CSS stays in the `<style>` block of `+layout.svelte`.
- **`use:enhance`**: the logout form already uses `use:enhance`; do not remove it.
- **Min-height 44px touch targets**: all interactive elements in the mobile menu must meet the 44px minimum.
- **German UI**: all user-facing text in German. Button label "Zellen" is correct German shorthand for "Zellen vorhanden" in beekeeping context.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/routes/+layout.svelte` | Modify: add hamburger state, hamburger button HTML, mobile menu panel, CSS |
| `src/routes/hives/[hiveId]/inspect/+page.svelte` | Modify: line 249 — change label from `'Zellen vorhanden'` to `'Zellen'` |
| `src/routes/hives/[hiveId]/inspections/[inspectionId]/edit/+page.svelte` | Modify: line 87 — change label from `'Zellen vorhanden'` to `'Zellen'` |

### Technical Decisions

- **Breakpoint `640px`**: standard small-screen cutoff; matches typical mobile portrait width.
- **`{#if menuOpen}`**: the mobile menu panel is conditionally rendered (not just CSS `display: none`), so the hamburger button is the only way to set `menuOpen = true`, meaning the panel can never appear on desktop where the button is CSS-hidden.
- **Menu closes on nav link click**: add `onclick={() => menuOpen = false}` to each `<a>` in the mobile menu panel. For the logout form submit, no extra close logic needed — the page reloads.
- **`PendingSyncBadge` in mobile menu**: include it directly in the mobile menu panel (below the last nav link) so the offline count is visible on mobile.
- **Desktop nav unchanged**: the existing `.nav-links` and `.nav-right` divs keep their exact current styles; they are simply hidden at `≤640px` via media query. No structural changes to the desktop layout.
- **`aria-expanded`**: add `aria-expanded={menuOpen}` to the hamburger button for accessibility.

---

## Implementation Plan

### Tasks

- [x] **Task 1 — Add hamburger state and button to `+layout.svelte`**
  - File: `src/routes/+layout.svelte`
  - Action A — Script: add `let menuOpen = $state(false);` to the `<script lang="ts">` block (after existing state, before `onMount`)
  - Action B — HTML: inside `<nav class="app-nav">`, after `<div class="nav-right">...</div>`, add:
    ```svelte
    <button
      class="hamburger-btn"
      onclick={() => (menuOpen = !menuOpen)}
      aria-label="Menü öffnen"
      aria-expanded={menuOpen}
    >
      ☰
    </button>
    ```
  - Action C — CSS: add to `<style>` block:
    ```css
    .hamburger-btn {
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.5rem;
      color: var(--color-text, #1a1a1a);
      padding: 0.25rem 0.5rem;
      line-height: 1;
      min-height: 44px;
    }
    @media (max-width: 640px) {
      .nav-links,
      .nav-right {
        display: none;
      }
      .hamburger-btn {
        display: flex;
        align-items: center;
      }
    }
    ```

- [x] **Task 2 — Add mobile menu panel to `+layout.svelte`**
  - File: `src/routes/+layout.svelte`
  - Action A — HTML: directly after the closing `</nav>` tag (still inside `{#if data.user}`), add:
    ```svelte
    {#if menuOpen}
      <div class="mobile-menu">
        <a href="/hives" class="mobile-nav-link" onclick={() => (menuOpen = false)}>Bienenstöcke</a>
        <a href="/stings" class="mobile-nav-link" onclick={() => (menuOpen = false)}>Stiche</a>
        <a href="/todos" class="mobile-nav-link" onclick={() => (menuOpen = false)}>Aufgaben</a>
        <a href="/harvests" class="mobile-nav-link" onclick={() => (menuOpen = false)}>Ernten</a>
        <div class="mobile-menu-badge">
          <PendingSyncBadge />
        </div>
        <div class="mobile-menu-footer">
          <span class="mobile-username">{data.user.username}</span>
          <form method="POST" action="/logout" use:enhance>
            <button class="logout-button" type="submit">Abmelden</button>
          </form>
        </div>
      </div>
    {/if}
    ```
  - Action B — CSS: add to `<style>` block:
    ```css
    .mobile-menu {
      background: var(--color-surface, #ffffff);
      border-bottom: 1px solid var(--color-border, #e5e7eb);
      padding: 0.25rem 0;
    }
    .mobile-nav-link {
      display: flex;
      align-items: center;
      padding: 0.75rem 1.25rem;
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--color-text-muted, #6b7280);
      text-decoration: none;
      min-height: 44px;
    }
    .mobile-nav-link:hover {
      background-color: var(--color-hover, #f3f4f6);
      color: var(--color-text, #1a1a1a);
    }
    .mobile-menu-badge {
      padding: 0.5rem 1.25rem;
    }
    .mobile-menu-footer {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      border-top: 1px solid var(--color-border, #e5e7eb);
      margin-top: 0.25rem;
    }
    .mobile-username {
      font-size: 0.875rem;
      color: var(--color-text-muted, #6b7280);
    }
    ```

- [x] **Task 3 — Shorten queen status label in both inspection forms**
  - File 1: `src/routes/hives/[hiveId]/inspect/+page.svelte` line ~249
  - File 2: `src/routes/hives/[hiveId]/inspections/[inspectionId]/edit/+page.svelte` line ~87
  - Action: In each file, change:
    ```ts
    { value: 'cells_present', label: 'Zellen vorhanden' }
    ```
    to:
    ```ts
    { value: 'cells_present', label: 'Zellen' }
    ```

### Acceptance Criteria

- [x] **AC1 — Hamburger visible on mobile**
  - Given: Manuel opens the app on a 375px viewport
  - When: He looks at the navigation bar
  - Then: Only a `☰` button is visible in the nav bar; all links, username, and "Abmelden" are hidden

- [x] **AC2 — Mobile menu opens and shows all items**
  - Given: Manuel is on a 375px viewport
  - When: He taps `☰`
  - Then: A full-width dropdown appears below the nav bar with "Bienenstöcke", "Stiche", "Aufgaben", "Ernten", the pending sync badge, username, and "Abmelden" — all visible without horizontal overflow

- [x] **AC3 — Mobile menu closes on nav link tap**
  - Given: The mobile menu is open
  - When: Manuel taps any nav link
  - Then: Navigation occurs and the menu closes

- [x] **AC4 — Desktop layout unchanged**
  - Given: Manuel opens the app on a 1024px viewport
  - When: He looks at the navigation bar
  - Then: The hamburger button is not visible; the original nav links + username + "Abmelden" display as before

- [x] **AC5 — Queen status buttons fit at 375px**
  - Given: Manuel opens a new or edit inspection form on a 375px viewport
  - When: He views the "Königinnenstatus" section
  - Then: Three buttons — "Gesehen", "Nicht gesehen", "Zellen" — are all fully visible within the screen width with no overflow

---

## Additional Context

### Dependencies

- No new npm packages required
- No DB changes

### Testing Strategy

Manual testing steps:
1. Open DevTools → set viewport to 375px → verify hamburger visible, links hidden
2. Tap ☰ → verify all nav items appear in the dropdown with no overflow
3. Tap a nav link → verify navigation + menu closes
4. Set viewport to 1024px → verify hamburger hidden, desktop nav unchanged
5. Open new inspection form at 375px → verify three queen status buttons all fit in one row
6. Open edit inspection form at 375px → same check
7. `npm run build` and `npm run lint`

### Notes

- The `logout-button` CSS class is already defined in `+layout.svelte`; reuse it in the mobile menu footer
- `PendingSyncBadge` is already imported; no new import needed for the mobile menu panel

## Review Notes

- Adversarial review completed
- Findings: 11 total, 9 fixed, 2 skipped
- Resolution approach: auto-fix
- Fixed: F1 (Escape key), F2 (nav landmark), F3 (aria-controls), F4 (visual indicator ☰/✕), F5 (route change close via afterNavigate), F6 (click outside), F7 (aria-haspopup), F8 (CSS desktop defense), F11 (focus-visible)
- Skipped: F9 (duplicate logout — spec-mandated), F10 (active link state — pre-existing, out of scope)
