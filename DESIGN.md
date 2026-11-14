---
name: ميزان يومي
description: A day planner in graphite and ink, where the kinds of time are the only colour, with the day's balance drawn as a guilloche rosette.
colors:
  paper: "#F2F2F0"
  surface: "#FCFCFB"
  ink: "#18191B"
  muted: "#5E6166"
  line: "#DCDCD8"
  quiet: "#D4D4D0"
  accent: "#1F1F22"
  on-accent: "#FFFFFF"
  accent-dim: "#A9ABAF"
  navy-university: "#163A7A"
  violet-study: "#7A3C8C"
  teal-course: "#007470"
  amber-work: "#A04D00"
  rose-gym: "#B02B4E"
  moss-quran: "#3A4A12"
  gold-personal: "#7A5C00"
  danger: "#B42318"
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
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
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
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    height: "52px"
  nav-band:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-dim}"
  check:
    size: "44px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "14px"
---

# Design System: ميزان يومي

## Overview

**Creative North Star: "Graphite and ink"**

A quiet graphite page with one dark accent, so the only colour on screen is the day itself. Every kind of time keeps its own ink, and it is the ink, not the frame, that tells you what an hour was for. Fine one-pixel lines, no ornament, no glow. Layout, navigation and controls stay the standard ones for a phone app.

It is used mostly outdoors in daylight, so the light theme is primary and every ink holds AA contrast on paper, on cards, on its own tint and on the grained paper. A dark theme follows the phone for night review, or the user fixes light or dark in Settings.

**Key Characteristics:**
- One accent band: bottom bar on phones, side rail from 960px; near black in light, near white in dark.
- Category inks on a 9% tint of themselves for each block row.
- Hour amounts set as large Spectral denomination numerals at the end of each row.
- The guilloche rosette as ميزان اليوم and ميزان الأسبوع.
- Fine one-pixel line work only; no ornament, no glow.

## Colors

### Accent
- **Accent** (`#1F1F22` light, `#ECECEA` dark): the navigation band, the primary button, the selected day chip and the
  phone's status bar. Text on it uses `on-accent` (`#FFFFFF` / `#121314`), inactive items `accent-dim`
  (`#A9ABAF` / `#55575C`).

### Neutral
- **Paper** (`#F2F2F0` / `#121314`): page ground.
- **Surface** (`#FCFCFB` / `#1B1C1E`): cards and panels.
- **Ink** (`#18191B` / `#ECECEA`) for text, **muted** (`#5E6166` / `#A0A2A6`) for secondary text, **line**
  (`#DCDCD8` / `#2C2E31`) for borders, **quiet** (`#D4D4D0` / `#36383C`) for rest and commute segments.

### The kinds' inks (light / dark)
- University: navy `#163A7A` / `#9EBDFA` (lectures), violet `#7A3C8C` / `#C287D1` (study).
- Course: teal `#007470` / `#65AFAA`.
- Work: amber `#A04D00` / `#D9884B`.
- Life: rose `#B02B4E` / `#FFBACC` (gym), moss `#3A4A12` / `#B0C384` (Quran), gold `#7A5C00` / `#E3C25A` (personal
  time).
- Danger: `#B42318` / `#FF8A7A`, only for late tasks and destructive actions. A late task also carries an icon, so
  colour is never the only mark.
- Added kinds (feature 016), one of six ready inks, each a light and dark pair: teal `#0E5E58` / `#7FD3C9`,
  blue `#244F8C` / `#A3C2F2`, green `#2F5E22` / `#A9D68F`, slate `#46515F` / `#B9C4D1`, copper `#8A3A14` / `#F0A57D`,
  olive `#535C14` / `#CBD48A`. `tools/check-schedule.js` checks each at AA on paper and on its own tint. Two added
  kinds may share an ink; the kind's name always shows beside it.

### The palette (feature 032)
There is one palette, graphite with one accent; it replaced the four of feature 022. Settings «الشكل» chooses only
light, dark or automatic (following the phone).

| Theme | Accent / paper / surface | Text / muted / line |
|---|---|---|
| Light | `#1F1F22` / `#F2F2F0` / `#FCFCFB` | `#18191B` / `#5E6166` / `#DCDCD8` |
| Dark | `#ECECEA` / `#121314` / `#1B1C1E` | `#ECECEA` / `#A0A2A6` / `#2C2E31` |

`tools/check-schedule.js` checks every kind ink, the six ready inks and danger at AA on paper, surface, tint and the
grained paper, the text and muted text on paper and surface, and the band text on the accent, in light and dark.

### Named Rules
**The Denomination Rule.** A category's ink is its identity everywhere: row tint, check circle, denomination numeral, week strip segment and rosette petals. Never use a category ink for anything that is not that category.

**The Two Halves Rule.** University and course form one half of the balance, work and life the other. A kind the user adds joins one half, or neither when it is not about either (its own choice in the editor).

## Typography

**Body and UI:** Readex Pro, 400 to 700, Arabic and Latin.
**Numerals:** Spectral 700 for denominations and the rosette centre, lining figures.

### Hierarchy
- **Heading** (700, 32px): the screen title (the day name, الأسبوع, الإعدادات).
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

The paper has a faint grain (feature 030): a fixed grey noise tile behind the content, at `--grain` (4.5% light, 6%
dark). Cards, rows and the band are solid, so it shows on the ground only. It never moves,
and it is gone under more contrast, forced colours and print. `tools/check-schedule.js` checks every ink and the text
at AA on the ground at the grain's darkest and lightest.

## Shapes

Radii of 10px (buttons, chips), 14px (cards, rows) and 18px (now card, review). Check circles are full circles of 28px inside a 44px target.

## Components

### Buttons
Primary is the accent with `on-accent` text; inside a category context (now card, review) it takes the category ink. Secondary is surface with a line border. Ghost is text only.

### Navigation
The accent band. Active item: `on-accent` text on a 16% `on-accent` wash; inactive items in `accent-dim`.

### Day chips
Seven equal chips; the selected one fills with the accent, today carries a line border.

### Block rows
Check, start and end time, title with its meta line (category label in ink), denomination numeral. Done and skipped rows strike the title and fade the numeral; skipped rows lose their tint and get a dashed border. An open block of a postponable kind whose time has come (today from the one in progress back, a past day all of them) carries «أجّلها» on a line under its title, a 44px button; the «الآن» line on that row is placed over the block part, never across the button (feature 029).

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
When the theme changes, every colour fades to the new one together over 450ms, on the rosette's
curve (`cubic-bezier(.16,1,.3,1)`). Nothing moves or resizes. Under reduced motion, and on the first paint, the
colours show at once.

## Do's and Don'ts

### Do:
- Do keep every category ink at AA on paper, on cards, on its own tint and on the grained paper.
- Do mark a state with a shape or a word as well as a colour, as the late icon does.
- Do show amounts of time as denominations, not as progress rings.
- Do keep line work at one pixel.
- Do keep the paper grain on the ground only, faint enough that every ink holds AA.

### Don't:
- Don't add Islamic ornament, mosque or Mushaf motifs.
- Don't use neon, glow or gradients.
- Don't colour the frame or add a second palette: the kinds' inks are the only colour.
- Don't use a category ink for decoration.
- Don't put the grain on cards, or turn it into a pattern or a motif.
