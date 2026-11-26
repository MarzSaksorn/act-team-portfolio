# ACT ASCII Cursor Hotspot — Design

**Status:** Approved by Mark.

## Intent

Make it immediately clear that a mouse or pen cursor is reacting to ACT’s decorative ASCII hero, while keeping the artwork anchored and the hero composition unchanged.

## Approaches

1. **Sharper hotspot (selected by Mark):** Keep the local glyph response, brighten a compact cluster to ACT coral, and shorten the soft fade at its edge. This makes the cursor connection clearer without adding motion or visual clutter.
2. **Broader coral bloom:** Affect more of the art, which is easier to notice at a distance but competes more with the headline.
3. **Brief afterglow:** Leave a fading trace as the pointer moves, which signals direction clearly but makes the art busier.

## Proposed design

Keep the existing pointer-to-canvas mapping and 12-fps drawing loop. Give glyphs within two character-cell widths of the pointer the full ACT coral `#F35857`; fade from coral to the existing deep red between two and five cell widths. Leave glyphs outside that compact radius unchanged. This is a spatial falloff only: add no glow, trail, layout shift, or extra animation.

Preserve the selected local-highlight approach, stationary artwork, current palette and hero composition, pointer exclusion over foreground copy, mouse/pen-only response, no added touch response, live reduced-motion behavior, hidden-tab suspension, static fallback, and existing cleanup. Do not add controls or dependencies, and keep production unpublished.

## Approval

Mark approved this design on November 26, 2026. Implementation follows the linked plan.
