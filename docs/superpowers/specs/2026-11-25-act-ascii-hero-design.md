# ACT Full ASCII Hero and Interaction Motion — Design

**Status:** Approved by Mark; implemented with native execution under the approved plan.

## Intent and approach

Give ACT's existing portfolio a more expressive hero and make interactive controls feel immediate, while preserving the current glassmorphism, coral-led palette, English/Thai copy, and three-page structure.

Two approaches were considered: **(1)** add ASCII as a small decorative accent within the existing hero card, which is lower risk but leaves the primary ACT artwork unchanged; **(2)** replace the hero's existing right-side glass ACT illustration with a full ASCII ACT artwork, making the requested style the main visual. Mark selected **approach 2**. The existing hero headline, message, links, and page content stay in place.

## Proposed design

Replace only the decorative `.hero-art` illustration with a responsive, fixed-frame ASCII composition that forms an ACT monogram from characters and restrained orbit details. Use a small React canvas renderer, seeded/deterministic motion, no new animation dependency, and a capped retro frame rate. Keep the character composition legible at mobile, tablet, and desktop widths. Existing coral remains primary; blue is an accent. No full-screen intro, scroll-jacking, or new content claims.

The animation is decorative and hidden from assistive technology; the accessible hero text remains unchanged. Add a visible, keyboard-operable pause/resume control with English and Thai labels. Provide a static, drawn frame when `prefers-reduced-motion: reduce` is active, update if that preference changes while the page is open, and pause the loop while the document is hidden.

Add small CSS-only interaction feedback: brief press scale for buttons and language controls, a short arrow nudge for links, and a scale/opacity transition for the navigation underline. Use transform and opacity for the new micro-motion, preserve existing focus rings, avoid layout-affecting animation, and remove nonessential motion under reduced-motion preferences.

## Goals, non-goals, and constraints

- Keep the public content, routing, backend, admin semantics, typography, and existing privacy boundary unchanged.
- Don't add third-party packages, externally sourced assets, or animation that requires a new production service.
- Keep the canvas bounded and the update rate low; use no full-screen movement. The pause control satisfies the need to stop continuing auto-motion.
- Support English and Thai control labels, keyboard operation, reduced motion, and the existing responsive layout.
- Test the hero at existing viewport widths, normal/reduced motion, pause/resume, visible focus, and both locales. Confirm existing browser, type, static, and production-build checks remain green.
- Keep Manus server/database features off, Auto Publish disabled, and production unpublished. After approval and verification, advance canonical `main` only with a normal push if fresh remote state remains safe.

## Left to the builder

Fine-tune the ASCII glyph palette and deterministic frame sequence to match the coral, blue, and ACT monogram. Use the existing React/CSS/Vite stack and retain a no-motion fallback; don't alter the accepted design beyond the scope above without asking Mark.
