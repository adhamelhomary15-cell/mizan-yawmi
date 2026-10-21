# Implementation Plan: Choose When Your Day Starts and Ends

**Branch**: `018-day-bounds` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

## Summary

The settings get an optional `day: {start, end}`. One pure function, `dayBounds(day)`, turns it into minutes, or into
`null` when it is outside what the app allows. Everything that used the fixed `START = 420, END = 1500` reads these
two numbers instead:
- the settings check, which also refuses a block outside the day;
- the timeline, the Week strip and its labels;
- postponing and prayer ties;
- the date change at night;
- the editor's time fields.

Without `day`, the numbers are 420 and 1500, so the output does not change (parity 0).

As in 014–017, the research, data model and checks are kept in this file instead of separate files.

## Technical Context

- **Language**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/app/*.js`.
- **Storage**: the settings gain one optional field. The settings version stays 1, and progress does not change.
- **Tests**:
  - `tools/check-schedule.js`: bounds, block checks, and the date at night, with an oracle and mutations;
  - `tools/check-anchors.js`: prayer ties under other bounds;
  - `check-parity.js`: 0 on the example and the private file;
  - Playwright E2E in `tests/e2e/day-bounds.spec.js`.
- **Constraints**: no new library, no network, no file over 600 lines, no unused code.

Nothing is left as NEEDS CLARIFICATION.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | A bounds change waits in the editor's draft, and the save shows 014's summary. |
| II. Checking off is human | No tick is made or cleared. Block keys (start and kind) don't change unless the user moves a block. |
| III. Data stays on the device | No network. |
| IV. Honest, offline day | Blocks outside the day are refused, never hidden or moved. |
| V. Simple, single file | One pure function for bounds, one for the date at night; constants become derived values. No new part. |
| VI. General repo | Tests use generated data only. |

All gates pass, before and after the design.

## Decisions (research)

1. **One pure `dayBounds(day)`, beside `validateSettings`.**
   - It returns `{start, end}` in minutes since the day's midnight, with an end after midnight above 1440.
   - Without `day` it returns `{start: 420, end: 1500}`. Outside the allowed range it returns `null`.
   - The allowed range: the start from 03:00 to 12:00; the end from 20:00 to 23:59, or 00:00 to 05:00 the next
     morning; the day at most 24 hours long.
   - `validateSettings` calls it. The three tools that pull out `validateSettings` (`check-backup`, `check-schedule`
     and `check-settings`) pull out `dayBounds` too.
   - **Rejected**: a copy of the rule inside `validateSettings` and another at load. Two copies drift apart.
2. **Times after midnight keep the settings' form, up to 28:59.**
   - The time check allows hours 00–28.
   - Then every block must start inside `[start, end)`. A block outside is refused at `week.D.blocks[i].start`
     with "start is outside the day".
3. **`START` and `END` become values derived at load.**
   - `03-time.js` reads them from `dayBounds(CFG.day)`. `CFG` was already checked, so the result is never `null`
     there.
   - `SPAN` follows. Every user of `START`/`END` stays as it is, and the anchor and postpone rules already take them
     as parameters.
4. **The date at night is a pure rule, `dayAt(iso, min, end, addDays)`.**
   - It is in the schedule rules block, so it can be tested on its own.
   - Before `end − 1440`, the time belongs to the day before, at `min + 1440`. An end at or before midnight never
     moves the date.
   - `effectiveNow` calls it.
5. **The Week's hour labels are computed** from `START` and `END`: one every 3 hours on the hour, placed by the same
   formula as the strip.
6. **The editor's time fields follow the draft's bounds.**
   - `fromField` stores a typed time earlier than the draft's start as the hour + 24.
   - `toField` shows hours 24–28 as 00–04.
   - The draft's bounds come from `dayBounds(draft.day)`. While the bounds being typed are not valid, the last
     valid ones are used.
7. **A new rule, `setDayBounds(draft, start, end)`.**
   - It sets `draft.day`, or removes it when the values are 07:00 and 01:00, so the files of users who never change
     it stay as they are.
   - It never moves a block. The save's check names the blocks outside the day.

## Data model

- **Settings** `day` (optional): `{start: "HH:MM", end: "HH:MM"}`, with `end` written as the clock reads (for example
  `"03:00"`, which means the next morning).
- **Block start**: from `"00:00"` to `"28:59"`, and inside the day.
- **Progress**: unchanged.

## Design

### Rules

- **`01-settings-validate.js`**:
  - `dayBounds(day)` at the top level;
  - in `validateSettings`, the `day` field (errors on `day.start` and `day.end`, and on `day` for a day longer than
    24 hours);
  - the time check up to 28:59;
  - the inside-the-day check on every block, in every version.
- **`13a-schedule-rules.js`**: `dayAt(iso, min, end, addDays)` and `setDayBounds(draft, start, end)`.

### Screens

- **`03-time.js`**: `START`, `END` and `SPAN` come from `dayBounds(CFG.day)`, and `effectiveNow` uses `dayAt`.
- **`11-week.js`**: the axis labels are computed.
- **`14b-editor-view.js`**:
  - `toField` and `fromField` follow the draft's bounds;
  - a new block's default start is the draft's start;
  - the preview uses the draft's bounds;
  - a new «يومك» part, before «المكان», with «بيبدأ الساعة» and «وبيخلص الساعة» (time inputs) and a line under
    them: «من 3 الصبح لـ 12 الضهر، ولحد 5 الصبح اليوم اللي بعده.»;
  - `SAY` gains the outside-the-day error, and `explain` adds the bounds: «الوقت ده برّه يومك (من 7:00ص لحد
    1:00ص)».
- **`14a-guide-view.js`**: the guide's template step gets the same two fields, filled with 07:00 and 01:00.
  `newSettings` takes them through `setDayBounds`.

### Tests

- **`tools/check-schedule.js`**:
  - `dayBounds`: the default, each edge (03:00, 12:00, 20:00, 23:59, 00:00, 05:00), just outside each edge, and the
    24-hour limit;
  - an oracle over every start and end on a 15-minute grid;
  - the settings check: a block before the start, at the end, at 24:30 with an end of 23:00, and a valid 26:30
    with an end of 03:00;
  - `dayAt`: every minute from 00:00 to 06:00, for every end in the range, against an oracle;
  - `setDayBounds`: it keeps the files of users who never change the default as they are;
  - mutations: the 24-hour limit dropped, the inside-the-day check skipped, `dayAt` ignoring the end, and the time
    check stopping at 24:59.
- **`tools/check-anchors.js`**: the year sweep, plus a layout with `START` 03:00 and a block tied to after Fajr.
- **`tests/e2e/day-bounds.spec.js`** (fixed clocks, generated data):
  - **US1**: set the start to 04:30 and add a 05:00 block. Today starts with it, and the Week strip starts at
    04:30.
  - **US2**: set the end to 03:00 and add a 01:30 block. At 02:30 Today shows the day before with that block now;
    at 03:10 it shows the new date.
  - **US3**: setting the end to 23:00 with a 23:30 block is refused and names it, and nothing is stored.
  - **US4**: the guide stores a chosen start and end.
- **Parity**: 0 on the example and on the private file, which have no `day`.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | `dayBounds`, the settings check, and the tools that pull it out | US3 | `check-schedule` with mutations; parity 0 |
| 2 | Derived `START`/`END`, `dayAt`, the Week labels, the editor's time fields | US1, US2 | `check-anchors`; parity 0; browser at 375 px |
| 3 | The editor's «يومك» part, the error messages, the guide | US1–US4 | Browser at 375 px |
| 4 | E2E, docs (README, review B4 closed), 017's T010 tick, ticks, PR | all | All checks; `check-private` clean |

Phases 1 and 2 are one commit if `check-code` refuses `dayAt` or `setDayBounds` before their first use.

## Risks

- **A file someone wrote by hand with a block before 07:00 or after 01:00** was accepted until now, and would now
  be refused. The owner's file and the example have none. The refusal names the block, and adding `day` fixes it.
- **Prayer ties near the edges** (Fajr with an early start): the anchor rule adds 1440 to a time before `START`, as
  now. The new anchor checks cover an early start.
- **Extra blocks** are stored as clock times and read back by `hmToMin` against `START`. That holds because the day
  is never longer than 24 hours, so a clock time maps to one place in the day.
