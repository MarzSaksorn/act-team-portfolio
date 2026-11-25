# ACT coral palette

ACT’s main brand color is **`#F35857`**. The site uses it unchanged in brand accents and browser theme metadata, alongside warm coral glass surfaces, deep-teal body text, and a restrained sustainability green. The layout, English/Thai content, and recruitment behavior stay unchanged.

## Shade scale

The scale converts the supplied hex to HSL, rounds its hue and saturation to `0°` and `87%`, then varies lightness. Lighter shades reduce saturation to keep the pastels restrained. The brand’s rounded source lightness is `65%`; the exact brand remains a separate `--brand` token rather than being replaced by the generated 500 shade. The HSL column shows the generation inputs; converting them to 8-bit hex rounds the RGB channels, so converting the resulting hex back to HSL can yield slightly different saturation and lightness values.

| Shade | Hex | Generation HSL | Intended role |
| --- | --- | --- | --- |
| 50 | `#FDF2F2` | `hsl(0, 70%, 97%)` | Page background and opaque glass fallback |
| 100 | `#FAE5E5` | `hsl(0, 70%, 94%)` | Soft secondary/accent surfaces |
| 200 | `#F6C5C5` | `hsl(0, 74%, 87%)` | Backdrop tint and decorative dividers |
| 300 | `#F18E8E` | `hsl(0, 78%, 75%)` | Decorative highlights |
| 400 | `#EF4E4E` | `hsl(0, 83%, 62%)` | Strong decorative accents, not small text |
| 500 | `#E51010` | `hsl(0, 87%, 48%)` | Mid-scale accent, reserved |
| 600 | `#BF0D0D` | `hsl(0, 87%, 40%)` | Primary button fill and large headline accent |
| 700 | `#9D0B0B` | `hsl(0, 87%, 33%)` | Links, focus ring, primary hover |
| 800 | `#810909` | `hsl(0, 87%, 27%)` | Primary pressed state |
| 900 | `#5F0707` | `hsl(0, 87%, 20%)` | Dark accent, reserved |
| 950 | `#300303` | `hsl(0, 87%, 10%)` | Safe foreground if text appears on the exact brand |

`src/styles/tokens.css` contains the complete scale as plain CSS custom properties. No Tailwind dependency or dark-mode behavior was added.

## Semantic pairings

| Background/surface | Foreground | Usage |
| --- | --- | --- |
| `--background`, `--paper`: coral 50 | `--background-foreground`: `#073C42` | Page and solid fallback text |
| `--card`: white / translucent warm-white glass | `--card-foreground`: `#073C42` | Frosted panels |
| `--brand`: `#F35857` | `--brand-foreground`: coral 950 | Exact brand; foreground available for future use |
| `--primary`: coral 600 | `--primary-foreground`: white | Primary actions and selected locale |
| `--primary-hover`: coral 700 | `--primary-foreground`: white | Primary action hover |
| `--primary-active`: coral 800 | `--primary-foreground`: white | Primary action pressed state |
| `--secondary`, `--accent`: coral 100 | Paired foreground: `#073C42` | Soft event monogram and recruitment section |
| `--muted-surface`: coral 50 | `--muted-foreground`: `#3C5960` | Supporting copy |
| Sustainability green `#D9EDB4` | `#073C42` | Optional sustainability surface pair |

Links and focus rings use coral 700. Interactive boundaries use coral 600. The translucent `--line` remains decorative; it isn't the sole indicator of an interactive control. Status labels include visible text, not color alone.

Muted text changed slightly from `#426169` to `#3C5960`: the old value scored only 4.36:1 against coral 200, while the new one clears 4.5:1 even on that stronger backdrop tint.

## Calculated WCAG contrast

Ratios use the WCAG sRGB relative-luminance formula, with the linearization threshold `0.04045`. Values below are rounded to two decimals. Normal text requires 4.5:1 for AA; large text and meaningful non-text indicators require 3:1.

| Foreground | Background | Ratio | Result / constraint |
| --- | --- | ---: | --- |
| White | Exact brand `#F35857` | 3.31:1 | Fails normal-text AA; not used for small white labels |
| Deep teal `#073C42` | Exact brand `#F35857` | 3.66:1 | Also fails normal-text AA |
| Coral 950 `#300303` | Exact brand `#F35857` | 5.57:1 | Passes normal-text AA |
| White | Coral 600 | 6.41:1 | Primary action passes AA |
| White | Coral 700 | 8.45:1 | Hover passes AAA |
| White | Coral 800 | 10.63:1 | Pressed state passes AAA |
| Deep teal `#073C42` | Coral 50 | 11.05:1 | Body text passes AAA |
| Muted `#3C5960` | Coral 50 | 6.87:1 | Supporting text passes AA |
| Deep teal `#073C42` | Coral 200 | 7.91:1 | Body text passes AAA on strongest base tint |
| Muted `#3C5960` | Coral 200 | 4.91:1 | Supporting text passes AA on strongest base tint |
| Coral 700 | Coral 50 | 7.71:1 | Links pass AAA; focus exceeds 3:1 |
| Coral 700 | Coral 200 | 5.51:1 | Links pass AA; focus exceeds 3:1 |

These opaque token pairs don't, by themselves, prove every translucent or composited pixel passes. The browser suite also checks actual rendered pages with axe across all three routes and both languages. Manual accessibility review remains a launch input; automated checks aren't a full WCAG conformance claim.

## Maintenance

Use `--brand` for brand accents and decorative art. Use `--primary` with `--primary-foreground` for small action labels, `--link` for links on light surfaces, and `--focus` for keyboard focus. Don't replace all dark colors with the exact brand or put white small text on it. Always pair a new background with an appropriate foreground and rerun the browser contrast checks.

The solid reduced-transparency and unsupported-blur fallback use the same coral 50 paper. Existing reduced-motion handling remains intact. The website stays unpublished; repository pushes and Manus checkpoints don't publish production.

## Verification record

On November 25, 2026, the completed theme passed 32 unit tests, the strict TypeScript/production build, 3 static-HTML checks, and all 22 browser checks. Browser coverage includes English/Thai pages at 360, 768, and 1440 pixels, axe scans across all routes, keyboard navigation, reduced preferences, exact rendered brand accents, and primary-action default/hover/pressed contrast.

The contrast regression test was also mutation-checked: temporarily using the exact brand as the white-text primary background failed at 3.31:1, and restoring coral 600 passed. One unit run emitted jsdom’s non-failing `Window.scrollTo()` implementation warning; all 32 tests still passed. The theme does not change scrolling behavior.
