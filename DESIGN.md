---
name: ميزان يومي
description: A day planner set in Egyptian banknote inks on security paper, with the day's balance drawn as a guilloche rosette.
colors:
  paper: "#E7ECE3"
  surface: "#FAFBF6"
  ink: "#1D1B17"
  muted: "#585C52"
  line: "#CDD3C6"
  quiet: "#D6DBCF"
  shell: "#6E1A28"
  shell-fg: "#FAFBF6"
  shell-dim: "#E9C9CF"
  oxblood-university: "#7B1E2E"
  madder-study: "#94304B"
  plum-course: "#5B2A6B"
  sepia-work: "#5A402B"
  ochre-gym: "#735600"
  ochre-quran: "#6A4E00"
  ochre-personal: "#7A5A0A"
  danger: "#B4300C"
typography:
  heading:
    fontFamily: "Readex Pro, Segoe UI, Tahoma, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
  section:
    fontFamily: "Readex Pro, Segoe UI, Tahoma, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.35
  body:
    fontFamily: "Readex Pro, Segoe UI, Tahoma, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  meta:
    fontFamily: "Readex Pro, Segoe UI, Tahoma, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  denomination:
    fontFamily: "Spectral, Georgia, Times New Roman, serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
    height: "40px"
  day-chip-selected:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-fg}"
    rounded: "{rounded.sm}"
    height: "52px"
  nav-shell:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-dim}"
  check:
    size: "44px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "14px"
---

# Design System: ميزان يومي

## Overview

**Creative North Star: "The day as a banknote"**

Every kind of time is a denomination with its own ink, the way each Egyptian pound note carries its colour. The ground is pale security paper, the inks are intaglio colours (oxblood, madder, plum, sepia, ochre), and the shell around the app is a solid oxblood band. The world lends type, palette, density and one signature move; layout, navigation and controls stay the standard ones for a phone app.

It is used mostly outdoors in daylight, so the light theme is primary and every ink holds AA contrast on paper and on its own tint. A dark theme follows the phone for night review, or the user fixes light or dark in Settings.

**Key Characteristics:**
- Oxblood shell: bottom bar on phones, side rail from 960px.
- Category inks on a 9% tint of themselves for each block row.
- Hour amounts set as large Spectral denomination numerals at the end of each row.
- The guilloche rosette as ميزان اليوم and ميزان الأسبوع.
- Fine one-pixel line work only; no ornament, no glow.

## Colors

### Primary
- **Oxblood shell** (`#6E1A28`): the navigation band and the selected day chip. Text on it uses `shell-fg`, inactive items `shell-dim`.

### Neutral
- **Security paper** (`#E7ECE3`): page ground.
- **Surface** (`#FAFBF6`): cards and panels.
- **Ink** (`#1D1B17`) for text, **muted** (`#585C52`) for secondary text, **line** (`#CDD3C6`) for borders, **quiet** (`#D6DBCF`) for rest and commute segments.

### Denominations
- University: oxblood `#7B1E2E` (lectures), madder `#94304B` (study).
- Course: plum `#5B2A6B`.
- Work: sepia `#5A402B`.
- Life: ochre `#735600` (gym), `#6A4E00` (Quran), `#7A5A0A` (personal time).
- Danger: `#B4300C`, only for late tasks and destructive actions.
- Added kinds (feature 016), one of six ready inks, each a light and dark pair: teal `#0E5E58` / `#7FD3C9`,
  blue `#244F8C` / `#A3C2F2`, green `#2F5E22` / `#A9D68F`, slate `#46515F` / `#B9C4D1`, copper `#8A3A14` / `#F0A57D`,
  olive `#535C14` / `#CBD48A`. `tools/check-schedule.js` checks each at AA on paper and on its own tint. Two added
  kinds may share an ink; the kind's name always shows beside it.

### Palettes (feature 022)
The user picks one of four palettes in Settings, «الشكل». A palette changes only the frame and the ground:
`--shell`, `--shell-dim`, `--bg`, `--surface`, `--line`, `--quiet` and `--muted`. The inks, `--fg`, `--shell-fg`
and `--danger` stay the same in every palette.

| Palette | Light shell / paper / surface | Dark shell / paper / surface |
|---|---|---|
| Oxblood «عنابي» (default) | `#6E1A28` / `#E7ECE3` / `#FAFBF6` | `#3A1119` / `#16141A` / `#201D24` |
| Olive «زيتي» | `#434C14` / `#E9EADF` / `#FBFBF5` | `#262B0C` / `#151611` / `#1E2019` |
| Navy «كحلي» | `#1F2F4F` / `#E4E8EE` / `#F8FAFC` | `#121C30` / `#12151B` / `#1A1F27` |
| Graphite «رمادي» | `#2E3135` / `#E8E8E6` / `#FAFAF9` | `#1E2023` / `#141516` / `#1D1E20` |

`tools/check-schedule.js` checks every ink at AA on every palette's paper, surface and tint, in light and dark, and
the band text on every shell. The phone's status bar takes the palette's shell.

### Named Rules
**The Denomination Rule.** A category's ink is its identity everywhere: row tint, check circle, denomination numeral, week strip segment and rosette petals. Never use a category ink for anything that is not that category.

**The Two Halves Rule.** University and course form one half of the balance, work and life the other. A kind the user adds joins one half, or neither when it is not about either (its own choice in the editor).

## Typography

**Body and UI:** Readex Pro, 400 to 700, Arabic and Latin.
**Numerals:** Spectral 700 for denominations and the rosette centre, lining figures.

### Hierarchy
- **Heading** (700, 32px): the screen title (the day name, الأسبوع, the course name).
- **Section** (500, 18px): section headings.
- **Body** (400, 15px): titles and running text; block titles at 600.
- **Meta** (400, 13px): category label in its ink, then details.
- **Denomination** (Spectral 700, 26px): hours or minutes per block, with a small Readex unit (س or د).

### Named Rules
**The Isolated Number Rule.** Hour amounts with fractions (1½, 8¼) are wrapped in LTR isolates so they never reorder inside Arabic text.

## Layout

Phone first, one column, 16px side gutter, bottom bar of 52px targets. From 960px a 232px side rail holds navigation and the brand; Today splits into a main column (now card, timeline) and a 340px sticky side column (target, prayers, rosette). Spacing steps are 4, 8, 12, 16, 24, 32px. Every tappable control is at least 44px.

## Elevation & Depth

Flat. Depth comes from the paper/surface step and one-pixel lines. The only shadow is the undo toast (`0 8px 24px rgba(10,16,22,.22)`).

## Shapes

Radii of 10px (buttons, chips), 14px (cards, rows) and 18px (now card, review). Check circles are full circles of 28px inside a 44px target.

## Components

### Buttons
Primary is ink on paper; inside a category context (now card, review) it takes the category ink. Secondary is surface with a line border. Ghost is text only.

### Navigation
Oxblood band. Active item: `shell-fg` text on a 16% `shell-fg` wash.

### Day chips
Seven equal chips; the selected one fills with oxblood, today carries a line border.

### Block rows
Check, start and end time, title with its meta line (category label in ink), denomination numeral. Done and skipped rows strike the title and fade the numeral; skipped rows lose their tint and get a dashed border.

### The «الآن» line
On today's timeline, a one-pixel `--fg` line crosses the block in progress at the share of its time that has passed,
or sits above the first row before the day's first block. It starts after the check column, so it never crosses the
check, and takes no taps. A small pill at its inline end holds «الآن» and the time, on `--surface` with a one-pixel
`--line` border; near a row's top or bottom the pill sits on the row's side of the line. The pill covers the
denomination numeral near a block's top; the block's times stay clear. The line glides over 450ms on the rosette's
curve when the app's clock refreshes (every 30 seconds), and jumps under reduced motion. It is not a category colour
and adds no ornament.

### The rosette (signature)
Two halves of 36 fine petals each around a centre disc. A petal is inked in a category's colour for its share of the half's planned time that got done; the rest stay `quiet`. The centre shows done hours in Spectral. Petal ink transitions over 450ms.

When a rosette appears (Today, the day review, Week, or another day or week picked), each petal's outline draws in as
a line, one after another around each half from its start, 14 ms apart, so the whole rosette is drawn in about 0.9 s.
The centre hours and the two shares count up from 0 with it, easing out gently; on the way the hours round to
quarters and the shares to whole percents, and screen readers read only the final shares. A ticked block does not
draw again: its petal fades its ink as before and the numbers change at once. Under reduced motion the rosette and its
numbers show whole.

### Changing the look
When the palette or the theme changes, every colour fades to the new one together over 450ms, on the rosette's
curve (`cubic-bezier(.16,1,.3,1)`). Nothing moves or resizes. Under reduced motion, and on the first paint, the
colours show at once.

## Do's and Don'ts

### Do:
- Do keep every category ink at AA on paper and on its own 9% tint.
- Do show amounts of time as denominations, not as progress rings.
- Do keep line work at one pixel.

### Don't:
- Don't add Islamic ornament, mosque or Mushaf motifs.
- Don't use neon, glow or gradients.
- Don't reuse the retired palette (blue, violet, amber, green on blue-grey).
- Don't use a category ink for decoration.
