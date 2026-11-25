# ACT ASCII Hero and Micro-Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ACT's decorative hero artwork with accessible, pausable ASCII artwork and add concise, reduced-motion-aware feedback to interactive controls.

**Architecture:** Add one focused React canvas component with a server-rendered text fallback, a fixed responsive frame, deterministic glyph motion, a capped draw rate, and an accessible pause/resume control. Keep micro-interactions in existing CSS using transform and opacity; don't add an animation package or change the hero's written content.

**Tech Stack:** React, TypeScript, Vite, Canvas 2D, CSS, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-25-act-ascii-hero-design.md`

## Global Constraints

- Keep the current glassmorphism, coral-led palette, English/Thai copy, and three-page structure.
- Replace only the decorative `.hero-art` illustration; the existing hero headline, message, links, and page content stay in place.
- Don't add third-party packages, externally sourced assets, or animation requiring a new production service.
- Keep the canvas bounded and the update rate low; use no full-screen movement. The pause control satisfies the need to stop continuing auto-motion.
- Support English and Thai control labels, keyboard operation, reduced motion, and the existing responsive layout.
- Keep Manus server/database features off, Auto Publish disabled, and production unpublished.
- Advance canonical `main` only with a normal push if a fresh remote state remains safe.

## Review Focus

- **Canvas2D unavailable:** keep the server-rendered ASCII fallback visible and don't crash; test a null context.
- **Reduced motion on initial load or changed live:** paint a static frame and stop the loop; test initial preference and preference change.
- **Manual pause/resume and keyboard use:** update the localized button label, pause drawing, and resume only when allowed; test in both locales and with keyboard activation.
- **Hidden document or repeated mount/unmount:** stop scheduling frames while hidden and clean up every frame/listener on unmount; test cleanup.
- **Viewport and device-pixel-ratio changes:** keep the frame bounded, aligned, and free of horizontal overflow at 320, 360, 768, and 1440 CSS pixels; test layout and stable frame bounds.

---

### Task 1: ASCII hero and interaction feedback

**Files:**
- Create: `src/components/AsciiHeroArt.tsx` — bounded canvas renderer, fallback frame, reduced-motion state, lifecycle cleanup, and pause/resume control.
- Modify: `src/pages/HomePage.tsx` — replace only the decorative hero-art block; keep the hero copy/links unchanged and make the pause control accessible.
- Modify: `src/i18n/messages.ts` — add English and Thai pause/resume labels.
- Modify: `src/styles/global.css` — responsive ASCII composition and transform/opacity micro-interactions for buttons, language controls, nav underline, and link arrows; retain visible focus and reduced-motion behavior.
- Test: `tests/ascii-hero.test.tsx` — deterministic frame output, fallback behavior, start/pause/resume, reduced-motion changes, language labels, cleanup, and null Canvas2D context.
- Test: `tests/e2e/responsive-accessibility.spec.ts` — responsive bounds, pause control/keyboard, reduced-motion static state, interactions, both locales, and unchanged copy.

**Interfaces:**
- Consumes: `useLocale()` and the existing `Locale`/`UiText` structures from `src/i18n/LocaleProvider.tsx` and `src/i18n/messages.ts`.
- Produces: default-exported `AsciiHeroArt(): ReactElement` using a type-only React import; localized action labels on the existing `text` object; no new data/API or backend interfaces.

- [ ] **Step 1: Write failing tests.** Add focused component tests for static fallback on null context, changing deterministic frames, keyboard pause/resume, live reduced-motion changes, and cleanup. Add Playwright expectations for both locales, responsive frame bounds, and visible interaction feedback.
- [ ] **Step 2: Prove the tests fail.**

Run: `pnpm exec vitest run tests/ascii-hero.test.tsx` and `pnpm exec playwright test --config=playwright.config.ts -g "ascii|micro interaction"`.

Expected: the new component/test targets and interaction feedback don't yet exist; test harnesses load normally.
- [ ] **Step 3: Implement the minimal ASCII component.** Render an ACT monogram from a fixed character grid on a bounded Canvas2D surface, with deterministic orbit detail, a capped 12 fps draw loop, a server-rendered `<pre>` fallback, and no third-party package. Add a visible localized pause/resume button, keep its parent outside `aria-hidden`, pause on hidden documents, follow live reduced-motion changes, and cancel all frame/listener work during cleanup. Replace only `.hero-art` and add the localized strings.
- [ ] **Step 4: Add interaction micro-motion.** Add short transform/opacity-only hover, focus, and press feedback to eligible buttons, the language switch, link arrows, and nav underline. Preserve existing focus rings and add explicit reduced-motion overrides so nonessential motion becomes static/brief without changing layout.
- [ ] **Step 5: Run focused checks.**

Run: `pnpm exec vitest run tests/ascii-hero.test.tsx && pnpm exec playwright test --config=playwright.config.ts -g "ascii|micro interaction"`.

Expected: all new component and browser tests pass in normal and reduced motion, with no horizontal overflow.
- [ ] **Step 6: Run complete verification.**

Run: `pnpm exec vitest run && pnpm exec vitest run --config vitest.server.config.ts --coverage && pnpm exec tsc --noEmit && pnpm exec tsc --project tsconfig.server.json --noEmit && pnpm build && pnpm test:static && pnpm test:e2e && pnpm exec redocly lint docs/openapi.yaml && git diff --check`.

Expected: frontend/server suites, browser suites, type checks, build, static checks, OpenAPI (0 errors; the existing optional warnings may remain), and diff check pass. The existing non-failing jsdom scroll notice is not a test failure.
- [ ] **Step 7: Inspect responsive and reduced-motion screenshots; verify the pause control and no layout movement.** Capture the hero at mobile and desktop widths in normal and reduced-motion modes. Confirm the fallback is legible, pause/resume works, controls remain keyboard accessible, and the ASCII frame's bounding box stays fixed while frames change.
- [ ] **Step 8: Commit only the intended implementation files and plan/spec.** Use the approved Git identity `MarzSaksorn <mark94849@proton.me>` and a clear message such as `feat: add ASCII hero and interaction motion`.
- [ ] **Step 9: Before checkpointing, fetch fresh `origin/main`, inspect ancestry and preserve any concurrent change. Re-run affected checks if the base changes, push only a normal safe fast-forward, and confirm the returned checkpoint SHA. Do not enable Auto Publish or publish production.**

```bash
git fetch origin main
# Inspect remote tip and ancestry; stop and reconcile explicitly if main moved.
# Run affected checks after any integration.
git push origin HEAD:refs/heads/main
```
