# Remove Pause Control from ACT ASCII Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Remove the homepage ASCII hero’s Pause/Resume button while keeping its continuous 12-fps animation for visitors who allow motion.

**Architecture:** Keep the existing React canvas painter and `requestAnimationFrame` loop. Remove the pause state and button-only dependencies and styling; preserve the static fallback, live reduced-motion handling, hidden-tab suspension, and existing hero composition.

**Tech Stack:** React, TypeScript, CSS, Vite, Playwright, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-25-act-ascii-remove-pause-design.md`

## Project Structure

- `src/components/AsciiHeroArt.tsx` owns the canvas renderer, animation lifecycle, static fallback, and decorative markup.
- `src/styles/global.css` owns hero layering, responsive artwork presentation, and control-only styles.
- `tests/e2e/responsive-accessibility.spec.ts` covers the visible hero, responsive layouts, locale behavior, and motion preferences in a real browser.

## Global Constraints

- Keep the ASCII hero looping at its existing 12 fps when `prefers-reduced-motion` is not `reduce`.
- Render a stable static frame for reduced motion, including when the preference changes while the page is open.
- Suspend drawing while the document is hidden and resume it when visible.
- Remove the Pause/Resume button and do not add another in-page motion control.
- Preserve the artwork, decorative `aria-hidden` surface, hero overlap, copy, palette, responsive layout, and existing project behavior.
- Do not publish production. Before pushing, fetch `origin/main` and confirm the commit can be pushed as a normal fast-forward; never force-push.
- This selected continuous autoplay has no in-page stop control for visitors who allow motion and does not meet WCAG 2.2.2 pause/stop guidance.

## Review Focus

- **No control in either locale:** assert the ASCII hero contains no button before or after switching from English to Thai.
- **Continuous loop:** assert canvas frames continue changing at all covered responsive widths when motion is allowed.
- **Reduced-motion transition:** assert the canvas stays still when reduced motion is active, animates when changed to no-preference, and stops again when changed back.
- **Hidden document:** assert drawing stops while hidden and resumes when visible.
- **Hero composition:** retain the existing overlap, readability, and no-horizontal-overflow assertions without a control-specific expectation.

---

### Task 1: Remove the ASCII hero pause control and preserve motion lifecycle

**Files:**
- Modify: `src/components/AsciiHeroArt.tsx` — remove pause/resume button markup, state, refs, locale dependency, and icon imports.
- Modify: `src/styles/global.css` — remove only `.ascii-control` rules and references; preserve hero and canvas styling.
- Test: `tests/e2e/responsive-accessibility.spec.ts` — assert the button is absent, the loop continues, reduced motion remains static, and hidden-tab suspension still works.
- Test: `tests/ascii-hero.test.tsx` — update superseded pause-control unit expectations while retaining all nine deterministic timing, fallback, preference, visibility, locale, and cleanup scenarios. This scope correction was identified by the full-suite run.
- Update before implementation: local ignored `TODO.md` — record the approved outcome and its acceptance clauses; leave this file unstaged.

**Interfaces:**
- Consumes: the existing canvas painter and `prefers-reduced-motion` / `visibilitychange` lifecycle.
- Produces: decorative `.hero-art` with `data-motion` values `fallback`, `reduced`, or `running`; no button or user-facing pause/resume strings.

- [ ] **Step 1: Record the approved outcome in the local TODO**

  Preserve these acceptance clauses: remove the ASCII Pause/Resume button; keep the existing continuous 12-fps animation when motion is allowed; keep a static frame for reduced motion and suspend drawing while the document is hidden; preserve the existing hero artwork, composition, responsiveness, and locale behavior; keep production unpublished. Do not stage `TODO.md`.

- [ ] **Step 2: Write the failing browser regression tests**

  Update the existing hero tests to assert that `.ascii-art button` has count zero in English and Thai, and that the canvas continues changing when motion is allowed. Keep responsive bounds, overlap, decorative `aria-hidden`, and brand checks. In the reduced-motion test, assert the frame is stable under `reduce`, changes under `no-preference`, then becomes stable again under `reduce`. Add a browser test that overrides `document.hidden`, dispatches `visibilitychange`, and proves the canvas stops and resumes.

- [ ] **Step 3: Run the focused tests and verify RED**

  Run: `pnpm exec playwright test --config=playwright.config.ts -g 'blueTouchStaysDecorativeWhileCoralRemainsPrimary|ascii hero continues looping without a pause control|ascii hero is static on reduced motion including a live preference change|asciiBackgroundOverlapsHeroHeadlineWithoutCoveringItsCopy|mobile ASCII artwork has no control|ascii animation suspends while the document is hidden and resumes when visible'`

  Expected: the new no-control assertions fail against the existing button; tests execute normally rather than failing from setup errors.

- [ ] **Step 4: Implement the smallest component and style change**

  In `AsciiHeroArt.tsx`, remove `Pause`, `Play`, `useLocale`, `pausedRef`, `syncRef`, the `paused` state, the pause toggle, and the button. Keep the existing frame timing, media-query listener, static fallback, cleanup, and visibility listener. In `global.css`, remove `.ascii-control` styling and its interaction/reduced-motion selectors without changing the art composition.

- [ ] **Step 5: Verify the focused browser tests pass**

  Run the focused Playwright command from Step 3. Expected: the no-control, continuous-loop, reduced-motion, hidden-tab, overlap, and mobile assertions all pass.

- [ ] **Step 6: Run project checks and inspect the diff**

  Run `pnpm exec vitest run`, `pnpm exec vitest run --config vitest.server.config.ts --coverage`, `pnpm exec tsc --noEmit`, `pnpm exec tsc --project tsconfig.server.json --noEmit`, `pnpm build`, `pnpm test:static`, `pnpm test:e2e`, `pnpm exec redocly lint docs/openapi.yaml`, and `git diff --check`. Review the final diff to confirm the change removes only the control and its unused state/styles, preserves the reduced-motion/static behavior, and does not stage `TODO.md`.

- [ ] **Step 7: Commit and push the verified source**

  Because `.git/info/exclude` hides `docs/superpowers/`, explicitly force-add only the approved design note and this plan: `git add -f docs/superpowers/specs/2026-11-25-act-ascii-remove-pause-design.md docs/superpowers/plans/2026-11-25-act-ascii-remove-pause-plan.md`. Stage the component, CSS, and both test files normally; do not stage `TODO.md`. Commit as `fix: remove ASCII hero pause control`. Fetch `origin/main` immediately before pushing, reconcile any remote changes while preserving both sides, and push only if the commit can advance `main` as a normal fast-forward. Never force-push. Confirm the pushed SHA and project checkpoint, and leave production unpublished.

## Execution Record — November 25, 2026

The component, styles, and browser tests are implemented and verified. The no-control browser regressions failed against the original component (9 expected failures) and passed after removal (10/10). The existing unit-test scope was corrected after four older tests demanded the superseded pause control; updated tests failed against the original component (3 expected failures) and then passed (9/9).

Full verification passed: 56 frontend tests, 47 server tests at 84.81% line coverage, both strict TypeScript checks, production build, 9 static/packaging checks, 7 admin browser checks, 41 public browser checks, OpenAPI lint with no errors and two existing optional warnings, and `git diff --check`. The independent reviewer found no functional defect. One minor remains deferred: the composition test redundantly asserts button absence, already covered by dedicated tests.

### Execution rulings

The existing clean non-main, Webdev-bound checkout was retained because no worktree skill was installed. This gives less process isolation than a separate worktree; clean-tree and final diff checks mitigate that risk.

Task bookkeeping used the available task-brief script and a manual execution ledger because task-start/task-done scripts were unavailable. The cost is no automated completion ledger; exact red/green and full-check receipts were recorded.

The existing ASCII unit test file joined the scope because its pause assertions contradicted the approved behavior. The cost is possible loss of test coverage; all nine timing, fallback, motion, visibility, locale, and cleanup scenarios were retained and verified.

Delivery uses the already-approved normal push to canonical `main`, rather than reopening a generic integration menu. The cost is advancing shared `main`; fresh remote ancestry checks, the explicit plan approval, and Auto Publish off preserve the release boundary. Source-save and checkpoint confirmation follow verification; production remains unpublished.
