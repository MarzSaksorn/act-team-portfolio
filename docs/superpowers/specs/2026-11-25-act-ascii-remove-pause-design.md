# ACT ASCII Hero — Remove Pause Control Design

**Status:** Approved by Mark on November 25, 2026. This design supersedes only the pause-control requirement in the approved [ASCII hero design](2026-11-25-act-ascii-hero-design.md).

## Intent

Remove the visible Pause/Resume button from the homepage ASCII artwork while keeping the animation loop active for visitors who allow motion. Mark selected this behavior after reviewing the alternatives.

## Approaches considered

1. **Keep looping without a control (selected):** remove the button and its pause state, while retaining the continuous 12-fps loop. This preserves the existing animated effect, but visitors without reduced motion will have no in-page way to stop it; continuous auto-playing motion does not meet WCAG 2.2.2 pause/stop guidance.
2. **Animate once, then settle:** remove the button and end on a static frame. This avoids prolonged automatic motion, but Mark chose continuous looping instead.
3. **Static artwork only:** remove the button and all automatic motion. This was not selected.

## Proposed design

Remove the button markup, its icon imports, localized pause/resume dependency, paused React/ref state, and the CSS used only by that control. Keep the existing 12-fps canvas loop, decorative `aria-hidden` surface, static fallback, live `prefers-reduced-motion` handling, and hidden-tab suspension. Do not add another visible control or change the ASCII artwork or hero composition.

## Constraints and acceptance

Keep the prior hero design intact apart from its pause-control requirement: preserve the background composition, palette, copy, responsive layout, and production-unpublished state. Verify that no pause/resume control remains in either locale; the animation continues for `no-preference`, remains static for `reduce` including a live preference change, and still suspends while the document is hidden. Update the relevant browser coverage and run the existing checks.
