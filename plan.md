# ACT coral theme update

## Goal and existing design

Apply Mark's exact main theme color, `#F35857`, to the existing three-page English/Thai glassmorphism site. Keep the approved layout, type, honest content, recruitment behavior, and accessibility preferences. Use the existing plain CSS architecture rather than adding Tailwind or a dark mode.

Coral replaces teal/mint as the main visual accent in branding, decorative art, soft backdrop, links, and primary actions. Keep deep teal for readable body text and a restrained green for sustainability/status details. Preserve the exact brand as `--brand`; generate an 11-shade HSL-derived coral scale separately. Use a darker coral with white text for small primary actions because the exact brand must meet contrast requirements before any text pairing is chosen.

## Structure and scope

`src/styles/tokens.css` owns the shade scale and paired semantic foreground/background variables. `global.css` applies those variables to visible site elements. `glass.css` keeps transparent and opaque fallbacks aligned with the theme. `index.html` uses the exact brand for browser theme metadata. `tests/e2e/responsive-accessibility.spec.ts` checks real rendered accent/CTA/focus behavior, including hover and solid fallbacks. `docs/color-palette.md` documents calculated shades and verified contrast pairs. `README.md` links the color documentation.

## Implementation

- [x] Write browser checks for the exact rendered brand accent, accessible default/hover primary actions, readable body/muted text, and visible keyboard focus. Update the solid-fallback expectation to the intended warm coral paper.
- [x] Run the new theme check and fallback check against the old theme; confirm they fail on the intended theme mismatch.
- [x] Compute the shade scale and WCAG luminance ratios; apply semantic tokens without changing layout or content.
- [x] Run the targeted tests, then all unit, strict TypeScript/build, static HTML, and browser suites. Review the theme diff independently.
- [x] Document the palette and test evidence. Verification: 32 unit tests, strict TypeScript/build, 3 static checks, and 22 browser checks pass. The independent review found no Important or Critical issue. HSL generation-input rounding is explained in the palette document.

Handoff: commit with the configured user identity and push the verified update to the existing public repository. Confirm the Manus checkpoint SHA separately; a local commit isn't a saved platform version.

## Release boundary

Production remains unpublished. Auto Publish stays off. Push only the sanitized current source to `MarzSaksorn/act-team-portfolio`; never rewrite public history or transfer private development commits.
