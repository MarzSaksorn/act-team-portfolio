# ACT ASCII Hero — Cursor Highlight Design

**Status:** Approved by Mark. This change builds on the [approved pause-control design](2026-11-25-act-ascii-remove-pause-design.md).

## Intent

Make the decorative ASCII hero feel responsive to mouse/pen movement without shifting the artwork or changing the headline layout. Mark selected a local highlight rather than an orbit ripple or whole-art parallax.

## Approaches considered

1. **Local glyph highlight (selected by Mark):** use pointer position to brighten nearby ASCII glyphs, with a soft falloff, while the canvas remains anchored. This keeps the text overlap stable and adds little motion.
2. **Orbit ripple:** send a moving wave through the rings. More noticeable, but it adds another large-area animated response.
3. **Soft parallax:** translate the whole artwork toward the cursor. It is the most obvious option but moves the overlapping background behind the copy.

## Proposed design

While the pointer is over the visible ASCII canvas, map its position to canvas coordinates and use a small radial falloff to accent nearby glyphs in ACT coral/blue. The existing artwork and 12-fps time animation continue unchanged outside the highlight area. When the pointer leaves the art, return to the ordinary animated frame. Keep pointer coordinates in a mutable ref and consume them in the existing canvas draw loop; do not trigger React renders or move the hero/canvas layout. Listen only for mouse and pen input over the hero; touch-only input leaves the existing animation unchanged. Keep the entire canvas surface `aria-hidden` and non-interactive.

Respect the existing live `prefers-reduced-motion` behavior: show the existing static frame and do not respond to pointer movement when reduced motion is enabled, including after a live preference change. Preserve tab-hidden suspension, renderer fallback, the existing 12-fps cap, and cleanup of event listeners. The highlight is decorative and must not obscure the headline or absorb input from links and buttons.

## Constraints and acceptance

Keep the ACT monogram, glyph pattern, palette, 12-fps ambient loop, current hero composition, responsive layout, and no-pause-button decision. Add no dependency. Verify with deterministic tests that pointer proximity changes nearby glyph output, leaving the artwork restores its normal output, mouse/pen interaction does not alter layout, touch input adds no effect, and reduced motion suppresses the highlight. Re-run existing responsive, motion, accessibility, type, and build checks. Production remains unpublished.
