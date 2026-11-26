# ACT ASCII Cursor Highlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the ASCII hero accent nearby glyphs in response to mouse/pen position without moving the artwork.

**Architecture:** Extend `AsciiHeroArt`’s existing canvas frame renderer to consume a pointer position captured in a mutable ref. Scope pointer listeners to the containing `.hero`, map events only when the pointer is over the actual canvas, and let the existing 12-fps loop paint a soft ACT-color glyph highlight. Ignore touch and clear the pointer influence on exit; preserve the current reduced-motion, hidden-tab, fallback, and cleanup behavior.

**Tech Stack:** React, TypeScript, Canvas 2D, CSS, Vite, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-26-act-ascii-cursor-highlight-design.md`

## Project Structure

- `src/components/AsciiHeroArt.tsx` owns the 72×32 character renderer and 12-fps `requestAnimationFrame` lifecycle; it will own pointer capture and local glyph coloring.
- `src/pages/HomePage.tsx` places the artwork beside the hero copy inside `.hero`; its markup and headline remain unchanged.
- `tests/ascii-hero.test.tsx` exercises deterministic canvas output, motion preferences, event lifecycle, and cleanup with the real React component.
- `tests/e2e/responsive-accessibility.spec.ts` verifies mouse movement and responsive behavior in Chromium.

## Global Constraints

- Keep the canvas layout stationary and keep the headline above the decorative art.
- Apply a soft local ACT-color accent only while a mouse/pen pointer is over the actual canvas; restore the ordinary frame when it leaves.
- Keep the ambient animation at 12 fps; do not use React state updates for pointer movement.
- Ignore touch input. Preserve the existing animation on touch-only screens.
- Under `prefers-reduced-motion: reduce`, retain the existing static frame and apply no pointer highlight, including after live preference changes.
- Preserve the hidden-document suspension, no-context static fallback, decorative `aria-hidden` canvas surface, and effect cleanup. Never prevent default behavior or capture the pointer; links and buttons remain usable. Add no dependencies and no control.
- Keep production unpublished.

## Review Focus

- **Pointer bounds:** movement over hero copy or elsewhere outside the canvas must not light unrelated glyphs; test that only coordinates within the actual canvas activate the accent.
- **Locality:** a nearby existing glyph changes toward the brighter ACT accent while a far glyph remains unchanged; test both in deterministic renderer output.
- **Pointer exit:** leaving the canvas/hero restores the ordinary animated appearance; test clearing the pointer influence.
- **Input type:** touch pointer movement must not trigger a highlight; exercise a touch `pointermove` event.
- **Reduced motion:** static output remains unchanged by mouse movement, both on initial `reduce` and after toggling to `reduce` live; test both states.

---

### Task 1: Add an accessible cursor-local glyph highlight

**Files:**
- Modify: `src/components/AsciiHeroArt.tsx` — accept local pointer coordinates in the canvas painter and attach scoped input listeners.
- Test: `tests/ascii-hero.test.tsx` — record rendered glyph color in the existing deterministic canvas double and test nearby/far glyphs, bounds, exit, touch, reduced motion, and listener cleanup.
- Test: `tests/e2e/responsive-accessibility.spec.ts` — verify real mouse movement highlights the art without moving the canvas or causing horizontal overflow at desktop/mobile widths.
- Update before implementation: ignored local `TODO.md` — add the approved cursor-highlight outcome and its acceptance clauses; leave the file unstaged.

**Interfaces:**
- Consumes: the existing canvas context, logical 864×576 drawing surface, `.hero` ancestor, `prefers-reduced-motion` media query, and visibility lifecycle.
- Produces: a private pointer sample `{ x: number; y: number } | null` in canvas coordinates, read only by `drawFrame(context, time, pointer)`; the existing `AsciiHeroArt` React API stays unchanged.

- [x] **Step 1: Write failing unit tests**

  First append an unchecked local TODO outcome preserving the approved behavior: mouse/pen movement locally accents nearby ACT ASCII glyphs without moving the canvas; pointer exit restores the normal animated frame; touch does not add an effect; reduced motion stays static and ignores pointer input; existing 12-fps, fallback, hidden-tab, layout, and no-control behavior remains; production stays unpublished. Leave `TODO.md` unstaged.

  Extend the existing canvas double to record each glyph’s fill color and stub `getBoundingClientRect()` to 864×576. Add focused tests named `mouse and pen pointers accent nearby glyphs without affecting distant glyphs`, `pointer coordinates outside the canvas do not activate the highlight`, `pointer exit and cancel restore the ordinary frame`, and `touch pointer movement does not add a highlight`. In the existing reduced-motion test, exercise pointer movement both when reduction is active on mount and after a live toggle; also verify normal pointer response is restored when reduction is disabled. In the existing unmount-cleanup test, spy on the `.hero` instance’s `removeEventListener()` and verify all scoped pointer listeners are detached. Assert the real rendered glyph colors, not only listener/mock calls. Preserve the existing 12-fps, fallback, visibility, and no-control assertions.

- [x] **Step 2: Run unit tests and verify RED**

  Run: `pnpm exec vitest run tests/ascii-hero.test.tsx`

  Expected: the new pointer-response test fails because pointer position does not affect the current renderer; tests execute without setup errors.

- [x] **Step 3: Implement the minimal pointer-driven color change**

  In `AsciiHeroArt.tsx`, add a mutable pointer ref and scoped `pointermove`, `pointerleave`, and `pointercancel` listeners on `canvas.closest('.hero')`. Ignore `pointerType === 'touch'`, reject coordinates outside the canvas rectangle, and map in-bounds client coordinates to the 864×576 canvas coordinate space. Pass the point into `drawFrame`; use a bounded radial falloff over approximately eight character cells to switch nearby drawn glyphs from the dark red to the existing coral accent. Reset the ref when reduced motion activates; keep frame throttling, drawing cadence, and layout unchanged. Remove all listeners in effect cleanup.

- [x] **Step 4: Run unit tests and verify GREEN**

  Run: `pnpm exec vitest run tests/ascii-hero.test.tsx`

  Expected: all ASCII unit tests pass, including local/far glyph behavior, out-of-bounds/touch suppression, pointer exit, reduced-motion changes, 12-fps cap, visibility, fallback, and cleanup.

- [x] **Step 5: Add and run the browser interaction test**

  Add `ascii hero highlights nearby glyphs under the mouse without moving the canvas`: at 1440 px, find a currently dark-red pixel in the live canvas, derive its character cell from the 12×18 grid, and move the real mouse to that cell’s center. Verify that pixel changes to ACT coral after a draw while the canvas bounds remain fixed. At 320 px, confirm no horizontal overflow and preserve the stacked hero. Run `pnpm exec playwright test --config=playwright.config.ts -g 'ascii hero highlights nearby glyphs under the mouse without moving the canvas|ascii hero continues looping without a pause control|ascii hero is static on reduced motion including a live preference change|ascii animation suspends while the document is hidden and resumes when visible'`.

  Expected: all selected browser checks pass and existing reduced-motion behavior remains unchanged.

- [x] **Step 6: Run full verification and inspect the rendered behavior**

  Run `pnpm exec vitest run`, `pnpm exec vitest run --config vitest.server.config.ts --coverage`, `pnpm exec tsc --noEmit`, `pnpm exec tsc --project tsconfig.server.json --noEmit`, `pnpm build`, `pnpm test:static`, `pnpm test:e2e`, `pnpm exec redocly lint docs/openapi.yaml`, and `git diff --check`. Review the canvas output and diff to confirm the highlight stays local, the artwork never moves, touch/reduced-motion paths remain unchanged, and no unrequested files are included.

- [x] **Step 7: Commit and save the verified source**

  Stage only the approved design note, this plan, `src/components/AsciiHeroArt.tsx`, `tests/ascii-hero.test.tsx`, and `tests/e2e/responsive-accessibility.spec.ts`; do not stage the ignored local `TODO.md`. Because `.git/info/exclude` hides `docs/superpowers/`, force-add only the approved design and this plan. Commit as `feat: add cursor highlight to ASCII hero`. Fetch `origin/main` immediately before pushing and preserve any new remote work; push only when a normal fast-forward is possible, never force-push. Confirm the saved checkpoint and keep production unpublished.

## Verification and execution decisions

The original renderer failed the corrected pointer tests (6/14). The implemented feature passed the full frontend, server, static, and browser suites. A fresh reviewer then found that desktop foreground copy overlaps the canvas hit region. A regression reproduced this with 1 expected failure; excluding foreground `.hero-copy` event targets restored the base glyph color and resolved the finding. The final fix passed 62 frontend tests, 47 server tests, both strict TypeScript checks, the production build, 9 static checks, and all 12 affected ASCII/interaction browser checks. Before the fix, the complete browser suite passed 7 admin and 42 public checks; unchanged paths were not needlessly repeated. OpenAPI lint has 0 errors and 2 pre-existing optional warnings. Existing broader jsdom suites emit canvas-unavailable fallback notices; the focused ASCII suite is clean.

**Rulings made:** The combined test step was split into focused behavior tests, which costs a few more test cases to maintain. Foreground `.hero-copy` events clear the highlight even where its rectangle overlaps the canvas, protecting the copy and matching the plan's copy-exclusion intent; the tradeoff is that cursor movement within that foreground rectangle does not trigger highlighting. No minor findings were deferred. Production remains unpublished; the source push and checkpoint are confirmed in the task delivery.
