# Implementation Plan: Graphite Palette with One Accent

**Branch**: `032-graphite-palette` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

## Summary

One palette replaces four. In `src/planner.html`:
- the light and dark token sets take the owner's values;
- the frame tokens are renamed to the spec's names: `--shell` becomes `--accent`, `--shell-fg` becomes `--on-accent`,
  and `--shell-dim` becomes `--accent-dim`;
- the four `:root[data-palette=…]` blocks go, and so does the palette list in the look script;
- the primary button takes the accent.

The Settings look section keeps only the theme. A late task's date gets a small icon. `tools/check-schedule.js` checks
the one palette, adds the danger colour, and keeps the grain check. DESIGN.md and PRODUCT.md tell the new story. As in
earlier features, the decisions, data model and checks are kept in this file.

## Technical Context

- **Language**: CSS and the look script in `src/planner.html`; `src/app/15-settings-view.js` (the look section);
  `src/app/14-tasks-view.js` (the late mark); `src/app/08-ui-small.js` (the icon).
- **Storage**: `mizan-look` (localStorage, not a store) keeps `{theme}`. An old `{palette, theme}` reads its theme; the
  palette part is ignored and dropped on the next write.
- **Tests**:
  - `tools/check-schedule.js` with `--self-test`;
  - `tools/check-security.js`, `check-code.js`, `check-parity.js`, `check-private.js`;
  - E2E: `tests/e2e/look.spec.js` rewritten for one palette, `paper-grain.spec.js` adjusted, and the late mark in
    `tests/e2e/graphite.spec.js` (new).
- **Target**: phone browsers at 375 px, light and dark.
- **Constraints**: no new library, no network, no file over 600 lines.

Nothing is left as NEEDS CLARIFICATION: the owner answered Q1–Q3 in the spec.

## Constitution Check (v3.0.1)

| Principle | Status |
|---|---|
| I. Human review | The owner approved running plan, tasks and implementation in one go, and stopping before the PR. |
| II. Checking off is human | No marks are read or written. The late mark is display only. |
| III. Data stays on the device | No network; the look stays in its own key on the device. |
| IV. Honest, offline day | Day plans unchanged (parity 0); the late icon makes the late state readable without colour. |
| V. Simple, single file | Less code: four palettes and their picker go. No library. |
| VI. General repo | No personal value. |

All gates pass, before and after the design.

## Decisions (research)

1. **Rename the frame tokens.**
   - **Decision**: rename `--shell`, `--shell-fg` and `--shell-dim` to `--accent`, `--on-accent` and `--accent-dim`
     everywhere: tokens, `@property`, the fade list, CSS uses and the check.
   - **Why**: the spec and DESIGN.md name them accent, and the accent now also fills the primary button, so "shell" is
     no longer true. The `.shell` layout class is a different thing and stays.
   - **Rejected**: keeping `--shell` names with new values (the code would say one thing and the docs another).
2. **Values the owner did not give** (spec, Assumptions). Each is checked by the contrast check.
   - `--accent-dim` (inactive tabs, the day chip's weekday, the side rail's subtitle): light `#A9ABAF` (7.15:1 on
     the accent), dark `#55575C` (6.11:1).
   - `--quiet` (rest and commute segments, unlit petals, the scrollbar): light `#D4D4D0`, dark `#36383C`, one step
     past `--line` as now.
   - `--tint` (9% light, 15% dark) and `--grain` (.045, .06) stay.
   - The six ready inks of feature 016 stay (they hold AA on the new grounds, measured in the spec).
3. **The primary button takes the accent**: `.btn.primary{background:var(--accent);color:var(--on-accent)}`. Today it
   uses `--fg` on `--bg`, which in this palette is almost the same colour; naming the accent makes the rule hold.
   Buttons that take a kind's colour (the now card, the day review) keep it.
4. **The look script.** The palette list, `data-palette` and `palette` in `clean`, `get` and `set` go. `window.mizanLook`
   keeps `{get, set}` for the theme. The status bar takes `#1F1F22` in light and `#ECECEA` in dark. The build's default
   `<meta name="theme-color">` and the manifest stay (the spec keeps the icon and manifest for now); the script sets the
   meta before the first paint, as today.
5. **The late mark.**
   - **Decision**: in a task's row, the late date reads `[icon] متأخرة · <date>` in the danger colour. The icon is a
     line icon (a clock with an exclamation), drawn like the app's other icons, with `role="img"` and
     `aria-label="متأخرة"`. The visible word beside it is `aria-hidden`, so a screen reader reads the state once.
   - **Why**: FR-008 asks for an icon with an accessible label and the word kept; reading it twice would be noise
     (spec US3 scenario 2).
   - **Rejected**: an emoji (fonts differ, and it is not the app's line style).
6. **The contrast check.**
   - The palette checks (022) become one check over the one palette, in light and dark: every kind ink, the six ready
     inks and `--danger` on `--bg`, `--surface` and their own tint; `--fg` and `--muted` on `--bg` and `--surface`;
     `--on-accent` and `--accent-dim` on `--accent`.
   - The grain check (030) keeps its two extremes and adds `--danger`.
   - The "every palette sets only the frame" check goes, with its two mutations. A new mutation, a kind ink lightened
     until it fails (the light `--work` back to the owner's first `#A65000`), must be caught, and one for the accent
     text.
   - The registration check keeps 24 colours (the same count after the rename).
7. **Old choices.** A user on oxblood, olive, navy or graphite opens the app in the new palette with their theme kept;
   nothing asks them again (Q2).

## Design

- **`src/planner.html`**: the look script; the light and dark tokens; the palette blocks removed; `@property` and the
  fade list renamed; CSS uses of the frame tokens renamed; `.btn.primary`; the late mark's style; the layout comment.
- **`src/app/15-settings-view.js`**: `LookSection` keeps the theme only.
- **`src/app/08-ui-small.js`**: a `Late` icon next to the other small icons.
- **`src/app/14-tasks-view.js`**: the late date uses it.
- **`tools/check-schedule.js`**: the checks and mutations above.
- **`DESIGN.md`**: front matter colours, the North Star, Key Characteristics, Colors, the palette table, Do's and
  Don'ts that name oxblood.
- **`PRODUCT.md`**: the look line (theme only, one palette); the icon line stays.
- **`README.md`**: any line that lists the palettes.

### The new North Star (for DESIGN.md)

**"Graphite and ink"**: a quiet graphite page with one dark accent, so the only colour on screen is the day itself.
Every kind of time keeps its own ink, and it is the ink, not the frame, that tells you what an hour was for. Fine
one-pixel lines, no ornament, no glow.

### Tests

- **`tests/e2e/look.spec.js`**, rewritten:
  - the default look is the new palette (paper, band, a kind ink), in light and dark, with no flash on load;
  - Settings «الشكل» has the three theme buttons and no palette buttons;
  - an old stored `{palette:'navy', theme:'dark'}` opens dark in the new palette; a broken stored look reads as
    automatic;
  - the status bar takes the accent in light and dark;
  - the fade, a tap during it, and reduced motion, as now;
  - storage blocked, backup and import leave the theme, offline opens in the kept theme, as now.
- **`tests/e2e/graphite.spec.js`** (new): the primary button and the selected day chip use the accent; a late task
  shows the icon, its label and the word, the screen reader name says «متأخرة» once; a task due today or done has no
  icon; nothing scrolls sideways at 375 px.
- **`tests/e2e/paper-grain.spec.js`**: drop the palette from its stored look.

**Parity**: 0 on the example and on a private settings file.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | Tokens, rename, palette blocks and script, primary button, Settings; the contrast check | US1, US2 | Every check and self-test; parity 0; a look at 375 px, light and dark |
| 2 | The late mark | US3 | Every check |
| 3 | E2E, DESIGN.md, PRODUCT.md, README, ticks | US4, all | Full E2E; `check-private` clean |

## Risks

- **The dark band is near white**: it is the owner's value; the screenshot at 375 px goes in the report.
- **Tests that read the old colours** (`rgb(22, 20, 26)` for the dark paper in `look.spec.js`): updated with the new
  values.
- **A ready ink close to a kind ink** (teal and course, blue and lectures, olive and Quran): the kind's name always
  shows beside it, as now.
