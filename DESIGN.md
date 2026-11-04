---
name: Next Galym
description: A gold carbon-copy answer sheet printed in one crimson ink, for the Next Galym application and results site.
colors:
  stock: "#ffd576"
  stock-lit: "#ffe6a6"
  stock-deep: "#f2bb4e"
  ink: "#a8042b"
  ink-deep: "#2a0610"
  field-focus: "#fff3cc"
  field-invalid: "#ffd0c8"
typography:
  display:
    fontFamily: "Fira Sans Extra Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.75rem, 8vw, 5rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  hero:
    fontFamily: "Fira Sans Extra Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(3.25rem, 10.5vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Fira Sans, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.375
  body:
    fontFamily: "Fira Sans, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Fira Sans Extra Condensed, Arial Narrow, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.06em"
rounded:
  none: "0px"
  full: "50%"
spacing:
  track: "12px"
  track-mobile: "8px"
  cell-gap: "6px"
  page-max: "1240px"
components:
  field:
    backgroundColor: "{colors.stock-lit}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    typography: "{typography.label}"
    padding: "0 0.9rem"
    height: "44px"
  field-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stock}"
  field-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stock}"
  bubble:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "44px"
  bubble-filled:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stock}"
  input:
    backgroundColor: "{colors.stock-lit}"
    textColor: "{colors.ink-deep}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0.5rem 0.8rem"
  input-invalid:
    backgroundColor: "{colors.field-invalid}"
  stamp:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "0.2rem 0.55rem"
  stamp-accepted:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stock}"
---

# Design System: Next Galym

## Overview

**Creative North Star: "The Answer Sheet"**

The site is a gold carbon-copy answer sheet printed in a single crimson ink. Every surface, border, mark and control belongs to that sheet: ruled fields, fill-in bubbles, comb cells for scores, rubber stamps for status, a timing track down the left edge, registration crosshairs at a panel's corners. Applications are numbered questions you answer by filling a bubble.

Density is calm and ruled rather than carded: structure comes from 2.5px crimson rules and boxes on flat stock, never from shadows or rounded containers. One crimson-drenched band (the sign-in section on the home page, and the footer) inverts the sheet to gold on crimson. The wordmark is the supplied logo: `public/nextGalym-01.svg` (crimson) on gold, `public/nextGalym-02.svg` (gold) on crimson, cropped to viewBox `0 350 1080 310` in `components/logo.tsx`.

**Key Characteristics:**
- One ink, one stock: crimson and gold only, plus a crimson-black for running text.
- Square, ruled, flat; round shapes are reserved for bubbles and crosshair rings.
- Condensed uppercase labels and display over a humanist body.
- Kazakh, Russian and English are first-class; both faces were checked to contain every Kazakh letter.

## Colors

A two-hue printed palette: gold stock, crimson ink, with crimson-black for text and lit and shaded stock as tonal steps.

### Primary
- **Printed Crimson** (#a8042b): the single ink. Borders, rules, field text, filled bubbles, stamps, crosshairs, headings, the drenched band background, scrollbar thumb, caret, selection.

### Neutral
- **Carbon Gold** (#ffd576): page and body background, and text on crimson.
- **Lit Stock** (#ffe6a6): the inside of printed fields, inputs and comb cells; the paper looks lighter where it is "printed".
- **Shaded Stock** (#f2bb4e): scrollbar track only.
- **Crimson Black** (#2a0610): running text, input text, timing-track marks, focus outline.
- **Focus Stock** (#fff3cc): input background while focused.
- **Error Blush** (#ffd0c8): invalid input background, paired with a dashed border.

Measured contrast: crimson on gold 5.5:1, gold on crimson 5.5:1, crimson on lit stock 6.3:1.

### Named Rules
**The One Ink Rule.** Only crimson prints. No second accent hue; states are expressed by fill, dash and double-rule, not new colors.
**The Inversion Rule.** On a crimson band (`.on-ink`) crimson and gold swap roles wholesale: borders, fills and focus rings go gold.

## Typography

**Display and Label Font:** Fira Sans Extra Condensed (700, 800; Arial Narrow fallback)
**Body Font:** Fira Sans (400, 500, 700; system-ui fallback)

**Character:** a narrow, uppercase, form-field voice for labels and headlines over a plain, legible body. Subsets loaded: latin, cyrillic, cyrillic-ext, so Қ, Ғ, Ә, Ү, Ұ, Һ, Ң, Ө, І render in the real face.

### Hierarchy
- **Hero** (800, clamp(3.25rem, 10.5vw, 6rem), 0.92): home headline, uppercase.
- **Display** (800, clamp(2.75rem, 8vw, 5rem), 0.92, -0.01em): page H1 via `.display` in PageShell, uppercase, balanced wrap. Kazakh and Russian open leading to 1 for tall tails.
- **Title** (Fira Sans 700, 1.25rem to 1.5rem on wide rows, 1.375): answer-row headings.
- **Body** (400, 1.0625rem, 1.55): tabular numerals on; intro paragraphs 1.25rem, capped at 56ch.
- **Label** (Extra Condensed 700, uppercase, 0.06em, 1.1): nav, field text, row numbers (2.25rem to 3rem), meta terms.

### Named Rules
**The Real Letters Rule.** Any face added must be checked to contain all Kazakh letters before use.

## Layout

A left timing track (12px, 8px under 768px) is fixed to the viewport edge and every container clears it with `padding-left: calc(var(--track) + 1rem)` (2rem from md). Content is centered in a 1240px max column; forms use a 34rem narrow column. Header is logo left, bordered field-buttons right (desktop from xl, menu below), language switch beside. Answer rows are a grid: numeral column (2.5rem, 4rem wide) / content / action. Spacing is Tailwind steps, mostly gap 2 to 5 inside components and 10 to 16 between sections; page padding top 10 to 14, bottom 24.

## Elevation & Depth

Flat. There are no shadows anywhere; depth is a printed fact: lit stock inside ruled boxes, and one drenched crimson band. Hover is a fill inversion, not a lift.

### Named Rules
**The Printed, Not Lifted Rule.** Separate things with a rule, a box, or a fill change; never a shadow or a blur.

## Shapes

Square corners (0 radius) on fields, inputs, comb cells. Borders are 2.5px crimson (3px on large comb cells, 5px double on rejected stamps). Circles only for bubbles (44px, 50%) and crosshair rings. Stamps tilt -3deg. Section dividers are a 2.5px top rule.

## Components

### Fields (buttons and nav)
- **Shape:** square, 2.5px crimson border, min-height 44px, padding 0 0.9rem, nowrap, label type.
- **Default:** lit stock fill, crimson text. **Hover and current page:** fill crimson, text gold (140ms). **Solid (`.field-solid`):** crimson fill from the start, used for the primary action and account link.
- **Focus:** 3px crimson-black outline, 3px offset (gold on crimson).

### Bubble
- 44px circle, 2.5px border in current color, label-face numeral or letter. Unfilled until chosen; filled is solid crimson with gold glyph. Hover tints 18% crimson, active scales to 0.94.

### Inputs
- Square, 2.5px crimson border, lit stock fill, min-height 48px. Focus lifts to #fff3cc. Invalid: dashed border and blush fill.

### Stamp
- Status marker, bordered label type, rotated -3deg. Pending dashed, accepted solid crimson fill, rejected double 5px border.

### Comb cells
- Empty boxed digits for a score: 2.4rem by 3.2rem cells, 6px gap; large variant clamp(3.2rem, 9vw, 5.5rem) wide.

### Answer row
- Numbered list item with a 2.5px top rule, big numeral, bold title, label-face subtitle, a definition list of up to four fields, and an apply control. Prints in with a 520ms clip-path wipe, staggered 90ms per row, only when motion is allowed.

### Crosshair
- 22px registration mark (crossed 2px lines plus ring) at the corners of the hero panel.

## Do's and Don'ts

### Do:
- **Do** keep everything in crimson #a8042b on gold #ffd576, with #2a0610 for running text.
- **Do** build controls from ruled boxes (2.5px) and invert fill on hover.
- **Do** wrap crimson bands in `.on-ink` so fields, rules, bubbles and focus rings swap to gold.
- **Do** respect `prefers-reduced-motion`; motion is the one print-in wipe plus 140 to 160ms fills.
- **Do** keep touch targets at least 44px.

### Don't:
- **Don't** add shadows, blurs, or rounded cards; the world is printed flat.
- **Don't** introduce a second accent hue or a new face without checking Kazakh coverage.
- **Don't** let the timing track be covered or crowded; keep the track clearance padding.
