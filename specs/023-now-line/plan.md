# Implementation Plan: A «الآن» Line in Today's Timeline

**Branch**: `023-now-line` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

## Summary

A thin line marks the current moment on today's timeline: inside the block in progress at the share of its time
that has passed, or at the boundary between two rows in free time. A small «الآن» label with the time sits on it.
Three parts change:
- **One pure rule**, `nowPlace(blocks, min)`, in a new marked rules block, decides which row the line sits on and
  where. A new dev check, `tools/check-now.js`, tests it against a minute-by-minute oracle.
- **The timeline** draws the line on top of that row. It is positioned absolutely, so no row moves or changes height.
- **CSS**: one-pixel ink line, a small label, a short glide when it moves, and none under reduced motion.

As in 014, 015, 021 and 022, the decisions, data model and checks are kept in this file.

## Technical Context

- **Language**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/app/*.js`.
- **Storage**: none. The line comes from the time and the day's blocks, both already in the app.
- **Time**: the app's `now` (`{iso, min}`) is refreshed every 30 seconds (`src/app/21-shell.js:40`). The line uses it
  and adds no timer of its own.
- **Tests**:
  - `tools/check-now.js` (new): the rule, an oracle and mutations;
  - `tools/check-code.js`, `tools/check-parity.js`;
  - Playwright E2E in `tests/e2e/now-line.spec.js` (new).
- **Target**: phone browsers at 375 px, offline, every palette, light and dark.
- **Constraints**: no new library, no network, no file over 600 lines, no unused code.

Nothing is left as NEEDS CLARIFICATION.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | Nothing changes without a tap. The line only shows the time. |
| II. Checking off is human | The line reads no marks and sets none. A done or skipped block still shows it (spec, Edge Cases). |
| III. Data stays on the device | Nothing is stored or sent. |
| IV. Honest, offline day | The line shows the real moment, from data already on the device. Parity stays at 0. |
| V. Simple, single file | One pure rule, one span in the timeline, a few CSS lines. No library or build step. |
| VI. General repo | Tests use generated blocks and the generic example. |

All gates pass, before and after the design.

## Decisions (research)

1. **Where the line sits is one pure rule.**
   - **Decision**: `nowPlace(blocks, min)` takes the timeline's blocks in display order (`{s, e}` in the day's minutes)
     and the current minute, and returns one of:
     - `{row, at: 'in', share}`: inside row `row`, at `share` (0 to 1) of its height. The row is the **last** block
       in display order with `s <= min < e`: when blocks overlap, the one that started latest, as the now card
       prefers. (The outline marks every block in progress; the line marks one point, so it picks one.)
     - `{row, at: 'top'}`: at the top boundary of row `row`, when `min` is in free time before it (after the previous
       block ends, or before the first block);
     - `{row, at: 'bottom'}`: below the last row, when `min` is at or after the last block's end;
     - `null`: no blocks.
   - **Why**: AGENTS.md puts calculations in pure functions inside a marked rules block with a dev check. The view
     stays a lookup.
   - **Where**: a new block, `// start of now line` … `// end of now line`, at the end of `src/app/13-rules.js` (about
     430 lines, so it stays under 600). No new part file, so `src/app/ORDER` does not change.
2. **The line is drawn on top of a row, never as a list item.**
   - **Decision**: the row the rule names gets one extra child, `<span class="nowline" aria-hidden="true">`, positioned
     absolutely. `.row` gains `position:relative`. The span's place:
     - `in`: `top: share × 100%`;
     - `top`: `top: -3px`, the middle of the 6px gap above the row;
     - `bottom`: `top: calc(100% + 3px)`, the middle of the space below the last row.
   - **Why**: a new `<li>` would add a 6px gap and move every row under it, against FR-005. No row has a positioned
     child today (checked in `src/planner.html`), so `position:relative` on `.row` changes nothing else.
   - **Taps**: `pointer-events:none`, so the check and the row underneath take every tap (FR-005, SC-003).
3. **What the line looks like.**
   - **Line**: a one-pixel line in `--fg`, from just after the check column to the row's inline end, so it never
     crosses the check (FR-006). No dot, no glow, no category ink.
   - **Label**: «الآن» and the time from `fmtStr`, in a small pill at the inline end (left in Arabic), vertically
     centred on the line: `--surface` ground, a one-pixel `--line` border, 12px text. Inside a row it is clamped to
     stay within the row, so near the top or bottom it does not spill into the next row. Only the label is clamped;
     the line keeps its true place (SC-001).
   - **Screen readers**: the span is `aria-hidden`. The now card above already says what is happening and how long is
     left, so the line adds nothing to read.
4. **The line moves with the app's 30-second refresh.**
   - **Decision**: no new timer. When `now` changes, the span's `top` changes, and a `transition: top .45s` with the
     rosette's curve glides it there. Under reduced motion, `.nowline` joins the existing `transition:none` rule.
   - **Why**: FR-003 asks for 30 seconds, which the app already gives. A glide of a few pixels every 30 seconds is
     calm; a timer per second would cost battery for no visible gain.
5. **When the line shows.**
   - **Decision**: only when the shown date is today (`isToday`, already in the Today view). The day review is its
     own panel above the timeline and has no rows, so the line never shows in it (FR-004); the timeline under it
     keeps the line.
   - **Late hours**: the day's minutes already run past 24:00 until the day ends, and `now.min` uses the same scale,
     so the rule needs nothing special.

## Data model

None stored. The rule's input and output are described in decision 1.

## Design

### Changes

| File | Change |
|---|---|
| `src/app/13-rules.js` | The `now line` block with `nowPlace` (decision 1). |
| `src/app/10-postpone-ui.js` | The timeline works out `nowPlace` once per render when the date is today, and adds the `.nowline` span to that row. |
| `src/planner.html` | `.row{position:relative}`; `.nowline` and its label (decision 3); `.nowline` in the reduced-motion rule. |
| `tools/check-now.js` (new) | The rule's checks (below). |
| `.github/workflows/checks.yml` | `node tools/check-now.js` and `--self-test`, beside the other rule checks. |
| `README.md`, `PRODUCT.md`, `DESIGN.md` | The line in the Today part, the capabilities and the components. |

### UI copy

- Label: «الآن» then the time, for example «الآن 10:42ص», with the time in an LTR isolate as elsewhere.

### Tests

- **`tools/check-now.js`**, on generated days (blocks with gaps, overlaps, one-minute blocks, an empty day):
  - against a minute-grid oracle: for every minute from the day's start to its end, the rule's row and kind match the
    oracle's;
  - `share` is `(min − s) / (e − s)` for the chosen block, and always from 0 up to but not including 1;
  - with overlapping blocks, the chosen row is the last one in progress;
  - mutations, each caught by `--self-test`: the first block in progress chosen instead of the last, a gap placed at
    the bottom of the previous row, the end minute counted as inside, and no `null` for an empty day.
- **`tools/check-parity.js`**: 0 differences (SC-004).
- **`tests/e2e/now-line.spec.js`** (generated data, the example week):
  - **US1**: at a time inside a block, the line's offset in that row matches the share of time passed, within 5% of
    the row's height (SC-001); the outline and «دلوقتي» are still there (FR-009); the label shows the time.
  - **US1, moving**: advance the clock 30 minutes; within the next 30-second refresh the line is lower, with the new
    time (SC-002).
  - **US2**: before the first block, the line sits above its row. (Free time between rows and the time after the
    last block cannot happen: the schedule has no gaps. `tools/check-now.js` covers them on generated days.)
  - **Taps**: the check under the line ticks the block, and the row opens (SC-003).
  - **Where it shows**: not on another day; with the review open, not inside the review panel, and still on the
    timeline under it.
  - **Layout**: every row's height and position are the same with and without the line (FR-005); the page does not
    scroll on open (FR-010).
  - **Looks**: the line is in `--fg`, the colour every row title is already written in, so it reads wherever the
    titles do. Phase 2 checks it by eye in light and dark on two palettes; no new contrast check is added.
- **By hand**: a phone at 375 px over a real day, offline.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | `nowPlace`, `tools/check-now.js` and its CI lines | all | `check-now` green, mutations caught |
| 2 | The span in the timeline and its CSS | US1, US2 | Browser at 375 px, light and dark, two palettes; parity 0 |
| 3 | E2E, docs, ticks | — | All checks and the E2E suite |
| 4 | PR | — | When the owner asks |

## Risks

- **The clock in E2E**: `openApp` fixes the date with Playwright's clock (022 found it also replaces
  `requestAnimationFrame`). Moving the line needs the clock to advance; phase 3 checks which clock call does that
  with the app's 30-second interval, before relying on it.
- **The label over the denomination numeral**: near the top of a row, the label at the inline end sits over the
  hour amount. Phase 2 tried the line's other end too: there it covers the block's start and end times, which matter
  more. The owner chose the inline end (2026-10-23): the label covers the hour amount in roughly the first third of
  a block, and the numeral shows again once the line has passed it.
- **Rows that change height** when opened (the row's actions): the line's place is a share of the row's height, so
  it stays correct when a row opens, but it moves with the row. Phase 2 checks an opened row.
