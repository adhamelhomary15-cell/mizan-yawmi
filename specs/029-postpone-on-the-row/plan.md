# Implementation Plan: «أجّلها» on the Block's Row

**Branch**: `029-postpone-on-the-row` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

## Summary

One pure rule and one button:
- **The rule**, `timeHasCome(iso, start, today, nowMin)` in the postpone rules block: a past day always, today once the
  block has started, a future day never.
- **The button**: in Today's timeline, a closed row whose block is open, postponable and whose time has come gets
  «أجّلها» on a line under its title, where the block's actions appear when it is tapped. It opens the same proposal
  (`PostponePanel`) under the row.

The rest of postponing (where a block goes, «تمام», «غيّر», «لأ», the day review, the ended-days question) is unchanged.
As in earlier features, the decisions, data model and checks are kept in this file.

## Technical Context

- **Language**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/planner.html` and
  `src/app/*.js`.
- **Storage**: none new. The button reads what the timeline already reads (the block's status and kind, the clock).
- **Tests**:
  - `tools/check-postpone.js` runs the postpone rules block on its own: checks and self-test mutations for the rule;
  - `tools/check-code.js`, `tools/check-security.js`, `tools/check-parity.js`, `tools/check-private.js`;
  - Playwright E2E in `tests/e2e/block-postpone-row.spec.js` (new).
- **Target**: phone browsers at 375 px, every palette, light and dark.
- **Constraints**: no new library, no network, no file over 600 lines, no unused code.

Nothing is left as NEEDS CLARIFICATION: the two product questions were answered before the spec.

## Constitution Check (v3.0.1)

| Principle | Status |
|---|---|
| I. Human review | A postpone stays the owner's tap and confirmation («تمام»); nothing moves on its own. |
| II. Checking off is human | The button never reads or writes a done mark beyond the status the row already shows. |
| III. Data stays on the device | Nothing new is stored or sent. |
| IV. Honest, offline day | Where a block goes is 009's rule, unchanged; parity stays at 0 (SC-004). |
| V. Simple, single file | One pure function, one button, a few CSS lines. No library or build step. |
| VI. General repo | No personal value. |

All gates pass, before and after the design.

## Decisions (research)

1. **"Its time has come" is a pure function in the postpone rules block.**
   - **Decision**: `function timeHasCome(iso, start, today, nowMin){ return iso < today || (iso === today && start <= nowMin); }`.
     Dates are `YYYY-MM-DD` text, so `<` compares them as dates. `start` and `nowMin` are both in the app's day minutes
     (feature 018: after midnight a time is 24:00 and on, and `now.min` follows the day's end), so a block at 00:30 that
     belongs to today compares correctly with 00:45.
   - **Why**: it is the decision the button depends on, with three cases and a boundary (the start minute itself), so
     it gets checks and mutations like 028's rule.
2. **Which rows get the button.** In `TodayView`'s timeline map, `onRow = tracked && st === null && canPostpone(b) &&
   timeHasCome(iso, b.s, now.iso, now.min) && !isOpen`. The last term: when a row is opened, its actions already hold
   «أجّلها», so the row's own button hides and the owner never sees two.
3. **One proposal at a time, from either button.**
   - **Decision**: the proposal renders when `postponing === b.key`, without also needing `isOpen`. The row button sets
     `postponing` to the block and `open` to null; the actions' «أجّلها» keeps setting `postponing` with the row open.
     Tapping the row's body clears `postponing`, as today. Closing the proposal clears both, as today.
   - **Why**: today the proposal needs the row opened first; the button must open it straight away (FR-002), and a
     single `postponing` key keeps one proposal on screen (spec, Edge Cases).
4. **Where the button sits.** A new `.row-pp` line under the title, in the row's grid like `.row-actions`
   (`grid-column:2 / -1`), with the button at its start. At 375 px the time, title and duration keep their columns, so
   nothing gets narrower; the row gets one line taller. The button is a `.btn`, which is 40 px tall by default, so
   `.row-pp .btn{min-height:44px}` brings it to the 44 px target, as `.backup-act .btn` does (FR-005).
5. **The «الآن» line.** It sits at a share of the row's height (feature 023). The row in progress, which gets the button,
   is now taller, so the line's share is of a taller row. The line has `pointer-events:none`, so the button still
   works; the risk is how it looks. The browser check in phase 2 looks at it; if the line crosses the button, the share
   is measured against the row's first line (`.row-body`) instead of the whole row.
6. **The clock.** The shell sets `now` every 30 seconds (`src/app/21-shell.js`), and the timeline re-renders with it, so
   a block gains the button within 30 seconds of its start, with no reload (FR-004).
7. **The name.** `aria-label` is `'أجّلها: ' + blockName(b, store)`, keeping the visible word at its start (FR-006), as
   028's buttons do.

## Data model

None stored.

## Design

### Changes

| File | Change |
|---|---|
| `src/app/13-rules.js` | `timeHasCome` in the postpone rules block. |
| `src/app/10-postpone-ui.js` | In `TodayView`'s timeline: the row's «أجّلها» line for rows that pass decision 2; the proposal shows on `postponing === b.key`. |
| `src/planner.html` | `.row-pp` (the line under the title), and its button's 44 px target. |
| `tools/check-postpone.js` | Checks for `timeHasCome`, and self-test mutations that break it. |
| `README.md` | Postponing: «أجّلها» shows on the row of an open block once its time has come. |
| `DESIGN.md` | Block rows: the «أجّلها» line under the title. |

All files stay well under 600 lines.

### Tests

- **`tools/check-postpone.js`** (the rule alone):
  - a past day → true for any start; a future day → false for any start;
  - today: start before now → true, start equal to now → true, start after now → false;
  - after midnight in the app's day: a block at 24:30 with now at 24:45 → true, with now at 24:15 → false;
  - mutations: "today only" (past days false), "strictly before now" (`<`), "ends instead of starts" (compared with
    the end), and "future days too" must each fail a check.
- **`tests/e2e/block-postpone-row.spec.js`** (Chromium and WebKit, `openApp` at a set time on the example week):
  - **US1**: at 16:00 on Thursday, the open postponable blocks from the one in progress back have «أجّلها» on their
    rows, and none after it; a done block, a cancelled block and a block of a kind that cannot be postponed have none;
  - one tap opens «هتتحط …» under the row; «تمام» postpones it (the row reads «اتأجل لـ …» and loses the button);
    «رجّعها» brings the button back;
  - tapping the row body shows the actions with one «أجّلها» only;
  - **FR-004**: moving the clock past the next block's start (`setFixedTime` then `runFor`) gives that row the button;
  - **US2**: a past day picked in the strip shows the button on every open postponable block; a future day shows none;
  - **FR-005**: at 375 px, no horizontal scroll, and the button is at least 44 px tall;
  - **FR-006**: the button's accessible name is «أجّلها: <block>».
- **Regression**: `day.spec.js`, `postpone-ask.spec.js`, `now-line.spec.js` and `task-postpone.spec.js` pass unchanged.
- **`tools/check-parity.js`**: 0 differences (SC-004).

## Validation (quickstart)

1. `py -3 tools/build.py`, then every `node tools/check-*.js` and its `--self-test`; `check-private.js` says clean.
2. `node tools/check-parity.js --old <main build> --new index.html --settings .private/settings.json`: 0 differences.
3. `cd tests/e2e && PYTHON="py -3" E2E_PORT=<port> npx playwright test`: all pass.
4. By hand on a phone, mid-day: the study block that passed without a tick shows «أجّلها»; one tap and «تمام» move it;
   later blocks show nothing until their start.

## Risks

- **A busier timeline**: rows with the button get one line taller. Limited by the owner's choice: only blocks whose
  time has come, and only open ones.
- **The «الآن» line** on a taller row: decision 5.

## Complexity Tracking

None: no principle is bent.
