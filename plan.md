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

## Requested blue touch

Mark asked to add a touch of `#669BBC`. Keep coral as the main brand and primary action color. Use the exact blue for the decorative hero orbit outlines at reduced opacity and a 14% translucent blue tint for the existing hero glass artwork. Don't recolor body text, small labels, controls, global backgrounds, or focus rings: blue remains a supporting decorative detail. The existing `aria-hidden` hero artwork, layout, sustainability details, and solid fallback stay unchanged.

Add `--blue` and a blue-glass fill token in `tokens.css`, map the existing art fill to it, and update only `.orbit` in `global.css`. Pin the rendered decorative blue use and unchanged coral action/text contrast with a test-first browser check. Update the palette documentation, run the existing checks, and push the verified source without publication.


## Requested typography refinement

Use Aqua Grotesque only for the Latin hero display; use Alegreya Sans for secondary typography, including headings and supporting copy. Retain IBM Plex Sans Thai as the script fallback so Thai text uses a working Thai-capable face. Keep Space Grotesk on the existing ACT wordmark/art wordmark to preserve that graphic identity. Self-host the approved font files for reliable offline/public-source use. Mark confirmed permission for Aqua Grotesque web embedding and public-repository distribution; document the source and known license notes without claiming an unverified license type.

- [x] Add a rendered-browser check that verifies the requested faces load, the hero and secondary elements use their intended stacks, and IBM Plex Sans Thai remains available for Thai text; confirm it fails before implementation.
- [x] Implement local font delivery, scoped font tokens, and adjusted hero metrics only where the new face requires it. Keep the rest of the layout and content unchanged.
- [x] Document font origins, license evidence, and Mark's authorization. Run unit tests, strict build, static checks, and the browser/accessibility suite.
- [x] Finish a final focused read-only review. No actionable code issue was found; one minor documentation citation correction is deferred below.

Handoff: commit the reviewed typography files, fetch fresh `origin/main`, preserve concurrent updates, and push to canonical `main` without rewriting history. Confirm the returned checkpoint SHA/card before reporting delivery. Do not publish production.

## Typography verification evidence

The browser typography check failed against the old font stack and passed after implementation. Verification: 32 unit tests, strict TypeScript/Vite/prerender build, 3 static-output checks, and 24 Playwright checks pass; the build contains Aqua Grotesque and both license notices. The final unit/build/static rerun passed without warnings; an earlier Vitest run emitted the non-failing jsdom `Window.scrollTo()` warning. Aqua's asset matches the uploaded binary exactly, and Alegreya's bundled notice matches its package license. Auto Publish was rechecked and remains off; production is unpublished.

Final: minor (deferred): `docs/typography.md:9` should cite Google Fonts metadata [3] for Alegreya's subsets and the bundled Aqua TTF for its character map, rather than the OFL text [4]. The coverage claims were verified against the actual metadata and font binary; this citation issue does not affect rendering or the complete license notices.
