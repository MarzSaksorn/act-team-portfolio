# ACT ASCII Cursor Hotspot Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make cursor response on ACT’s ASCII hero read clearly as a compact coral hotspot while keeping the artwork stationary.

**Architecture:** Keep pointer sampling in `AsciiHeroArt` and change only the current glyph-color falloff in its canvas renderer. Use a full-coral core followed by a shorter linear fade; retain the current 12-fps drawing loop and all existing input, lifecycle, and layout guards.

**Tech Stack:** React, TypeScript, Canvas 2D, Vitest, Playwright, Vite.

**Spec:** `docs/superpowers/specs/2026-11-26-act-ascii-cursor-hotspot-design.md`

## Project Structure

- `src/components/AsciiHeroArt.tsx` owns the fixed 72×32 ASCII grid, glyph renderer, pointer sample, and 12-fps canvas lifecycle. Only the highlight radii and strength calculation change.
- `tests/ascii-hero.test.tsx` records actual fill colors from the component’s deterministic drawing loop and will pin the new core, fade, and cutoff values.
- `tests/e2e/responsive-accessibility.spec.ts` already verifies real mouse response, stationary canvas bounds, foreground-copy exclusion, reduced motion, responsive layout, and route accessibility; run the affected browser checks unchanged.
- `TODO.md` is ignored local project tracking. Add the approved refinement before implementation, leave it unstaged, and record evidence when the outcome is verified.

## Global Constraints

- Preserve a compact, local hotspot: glyphs within two character-cell widths receive full `#F35857`; fade to `#BF0D0D` between two and five character-cell widths; leave glyphs at or beyond five cell widths unchanged.
- Keep the existing canvas and artwork anchored; preserve the 12-fps ambient animation and do not add temporal afterglow, glow, layout movement, controls, or dependencies.
- Preserve mouse/pen-only response, touch behavior, foreground-copy pointer exclusion, live reduced-motion behavior, hidden-tab suspension, static fallback, cleanup, and the decorative `aria-hidden` surface.
- Keep production unpublished.

## Review Focus

- **Core coverage:** A `#` glyph whose center lies inside the two-cell core must reach `#F35857`; the new deterministic hotspot test asserts a diagonal neighbor does so.
- **Fade band:** An in-band `#` glyph must blend between the core and base color; the same test asserts the expected `#CC2020` sample at cell `(17, 7)`.
- **Cutoff:** A glyph exactly five cell-widths from the pointer must remain `#BF0D0D`; the same test asserts the threshold sample at `(10, 11)`.
- **Input bounds and overlay:** An out-of-canvas point or foreground `.hero-copy` target must not activate glyphs; retain `pointer coordinates outside the canvas do not activate the highlight` and `foreground hero copy clears the highlight even when it overlaps the canvas`.
- **Input and motion lifecycle:** Touch remains inactive, reduced motion remains static through live changes, and exit/cancel clears the effect; retain the existing unit tests and run the matching browser checks.

---

### Task 1: Refine the cursor hotspot profile

**Files:**
- Modify: `src/components/AsciiHeroArt.tsx` — set the full-strength core to two `CELL_WIDTH` units and the outer radius to five `CELL_WIDTH` units; use the gap between them for the linear falloff.
- Test: `tests/ascii-hero.test.tsx` — add a deterministic assertion for the core, in-band blend, and five-cell cutoff.
- Verify: `tests/e2e/responsive-accessibility.spec.ts` — run existing real-pointer, layout, foreground-copy, reduced-motion, and accessibility checks without changing the established behavior.
- Update before implementation: ignored local `TODO.md` — add the approved refinement acceptance item and leave it unstaged.

**Interfaces:**
- Consumes: the existing `PointerPoint` in logical canvas coordinates, `CELL_WIDTH`, `BASE_COLOR`, and `ACCENT_COLOR`.
- Produces: no public API or event changes; `drawFrame` retains its current signature and changes only the strength calculation for `#` glyphs.

- [x] **Step 1: Add the local TODO acceptance item**

  After plan approval and before touching application code, add an unchecked item requiring full ACT coral within two character-cell widths, a fade to deep red between two and five cell widths, unchanged artwork position and 12-fps loop, and preservation of the existing touch, reduced-motion, fallback, and pointer-exclusion behavior. State that production stays unpublished. Leave `TODO.md` unstaged.

- [x] **Step 2: Write the failing deterministic test**

  Add `cursor hotspot has a coral core and a short fade to the unchanged edge` to `tests/ascii-hero.test.tsx`. Mount the existing component, move the mouse to logical point `(174, 171)`, and advance one frame. Assert the rendered `#` glyph at `(15, 10)` is `#F35857`, the glyph at `(17, 7)` is `#CC2020`, and the glyph at `(10, 11)` remains `#BF0D0D`. Preserve the existing tests for touch, reduced motion, pointer exit, copy overlap, bounds, and listener cleanup.

- [x] **Step 3: Run the focused test and verify RED**

  Run: `pnpm exec vitest run tests/ascii-hero.test.tsx -t 'cursor hotspot has a coral core and a short fade to the unchanged edge'`

  Expected: the test fails on the original eight-cell falloff because the diagonal core glyph is not full coral and the five-cell edge glyph is still tinted. There must be no setup or test-environment error.

- [x] **Step 4: Implement the minimal color-profile change**

  In `src/components/AsciiHeroArt.tsx`, define `HIGHLIGHT_CORE_RADIUS = CELL_WIDTH * 2` and set `HIGHLIGHT_RADIUS = CELL_WIDTH * 5`. For drawn `#` glyphs, use strength `1` when distance is at or inside the core; otherwise compute `(HIGHLIGHT_RADIUS - distance) / (HIGHLIGHT_RADIUS - HIGHLIGHT_CORE_RADIUS)`, clamped to `[0, 1]`. Do not change input listeners, canvas dimensions, drawing cadence, or React state.

- [x] **Step 5: Run focused unit tests and verify GREEN**

  Run: `pnpm exec vitest run tests/ascii-hero.test.tsx`

  Expected: all ASCII renderer and cursor tests pass, including the new core/fade/cutoff assertions and existing touch, reduced-motion, pointer-exit, overlap, fallback, visibility, and cleanup coverage.

- [x] **Step 6: Verify browser behavior and project checks**

  Run the existing focused Playwright checks for `ascii hero highlights nearby glyphs under the mouse without moving the canvas`, `ascii hero is static on reduced motion including a live preference change`, and `allRoutesPassAxe`. Then run `pnpm exec vitest run`, `pnpm exec tsc --noEmit`, `pnpm build`, and `git diff --check`.

  Expected: the browser confirms a real mouse response without canvas movement, existing motion/accessibility behavior remains intact, all frontend tests/type checks/build pass, and the diff has no whitespace errors. Inspect the rendered cursor response at desktop size and confirm the hotspot stays compact and does not compete with hero copy.

- [x] **Step 7: Save and push the verified change safely**

  Stage only the approved hotspot design, this plan, the component, and its tests; keep ignored `TODO.md` unstaged. Commit the verified source. Reconcile with `origin/main` using the project’s normal GitHub/checkpoint workflow, preserve any remote changes, and push only when a normal fast-forward is possible. Never force-push or publish production. Confirm the resulting checkpoint.
