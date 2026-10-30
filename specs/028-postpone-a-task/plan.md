# Implementation Plan: Postpone a Task from Anywhere

**Branch**: `028-postpone-a-task` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

## Summary

One pure rule and two buttons:
- **The rule**, `taskNextDay(due, today, addDays)` in the postpone rules block: the day after the later of the task's
  date and today. A task due today or overdue goes to tomorrow; a task due later moves one day.
- **Today**: every task in the day's list gets «أجّلها», not only overdue ones, and it uses the rule.
- **The Tasks tab**: every open task with a date gets «أجّلها» next to the pencil.

Both go through one helper, `postponeTask`, which already exists (shared helpers, #56); it now takes the rule's day
and undoes only that task's date. As in earlier features, the decisions, data model and checks are kept in this file.

## Technical Context

- **Language**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/planner.html` and
  `src/app/*.js`.
- **Storage**: the progress store's `tasks` list, already there; only a task's `due` changes. No new field.
- **Tests**:
  - `tools/check-postpone.js` runs the postpone rules block on its own: new checks and self-test mutations for the rule;
  - `tools/check-code.js`, `tools/check-security.js`, `tools/check-parity.js`, `tools/check-private.js`;
  - Playwright E2E in `tests/e2e/task-postpone.spec.js` (new).
- **Target**: phone browsers at 375 px, every palette, light and dark.
- **Constraints**: no new library, no network, no file over 600 lines, no unused code.

Nothing is left as NEEDS CLARIFICATION: the one product question (where a task goes) was answered before the spec.

## Constitution Check (v3.0.1)

| Principle | Status |
|---|---|
| I. Human review | A postpone is the owner's own tap; nothing moves on its own. |
| II. Checking off is human | Postponing never reads or writes `done` (FR-005); the E2E checks it. |
| III. Data stays on the device | Only a date in the existing store changes. Nothing new is stored or sent. |
| IV. Honest, offline day | Tasks are not blocks: day plans do not change, so parity stays at 0 (SC-004). |
| V. Simple, single file | One pure function, two buttons, one helper change. No library or build step. |
| VI. General repo | No personal value. |

All gates pass, before and after the design.

## Decisions (research)

1. **The rule is a pure function in the postpone rules block.**
   - **Decision**: `function taskNextDay(due, today, addDays){ return addDays(due > today ? due : today, 1); }`.
     Dates are `YYYY-MM-DD` text, so `>` compares them as dates. `addDays` is passed in, as `daysToAsk` already does,
     so the block stays free of the page and `check-postpone.js` runs it alone.
   - **Why**: it is the decision both screens depend on (AGENTS.md's rules-block rule), and it is easy to get wrong at
     the edges (overdue, today, a later day, a month's end).
   - **Alternatives**: always tomorrow (the owner's words, but it would move a task due Saturday back to tomorrow);
     the day review's `postponeStart` (the day after the *shown* day, which is not defined in the Tasks tab).
2. **"Today" is the app's day.** Both screens pass `now.iso`, which already follows the day's end (feature 018).
3. **The undo puts back only that task's date.**
   - **Decision**: `postponeTask(actEdit, t, to)` calls `actEdit('اتأجلت المهمة لـ ' + dayName(to), set, unset)`, where
     `set` gives the task `due = to` and `unset` gives it back its old `due`. Today, a single task's postpone used `act`,
     whose undo puts back the whole store, so a block ticked between the postpone and «رجّعها» was lost too. `actEdit`
     is how the app's other edits undo (`src/app/21-shell.js`).
   - **Scope**: `postponeTask` is used by Today's list and by the day review's task button, so the review's single-task
     undo gets the same fix. Where the review sends a task (the day after the reviewed one) does not change (FR-006).
     «أجّل اللي فاضل كله» and the ended-days question keep `act`, as they move blocks too.
4. **Which tasks get the button.**
   - **Today**: the list holds only tasks with a date (due that day, or overdue on today), so every row gets it. The
     `late` condition goes; the row always has the `has-act` layout.
   - **The Tasks tab**: `!t.done && t.due`, and not while the task's pencil form is open (that row shows the form
     only). It goes in `.tact`, before the pencil. The tab gets `act`-style undo through `actEdit`, which it already
     receives.
5. **The button's name.** The visible text stays «أجّلها»; `aria-label` is `'أجّلها: ' + t.text`, which keeps the visible
   word at its start (WCAG label in name) and says which task (FR-007). It is a real `<button>`, so the keyboard
   reaches it.
6. **Phone width.** Tasks tab rows get a third control; `.btn` is already small enough, and the text column is
   `minmax(0,1fr)` with `overflow-wrap:anywhere`, so a long task wraps instead of pushing the buttons out. The E2E
   checks there is no horizontal scroll at 375 px.

## Data model

No change. A task is `{id, text, tag, due, done, created}`; postponing writes `due` only.

## Design

### Changes

| File | Change |
|---|---|
| `src/app/13-rules.js` | `taskNextDay` in the postpone rules block. |
| `src/app/10-postpone-ui.js` | `postponeTask(actEdit, t, to)` with a date-only undo; Today's list: «أجّلها» on every task, to `taskNextDay(t.due, now.iso, addDays)`; the review's task button calls the new signature. `TodayView` already gets `actEdit`; `Review` gets it passed. |
| `src/app/14-tasks-view.js` | «أجّلها» in `.tact` for open dated tasks, with `aria-label`. |
| `tools/check-postpone.js` | Checks for the rule, and self-test mutations that break it. |
| `README.md` | Tasks: «أجّلها» on every dated task, in Today and in the Tasks tab, and where it goes. |

All files stay well under 600 lines.

### Tests

- **`tools/check-postpone.js`** (the rule alone):
  - due today → tomorrow; overdue by a day and by a month → tomorrow; due in three days → the day after it;
  - across a month's end and a year's end;
  - it never returns a day before tomorrow or before its own date + 1, over a sweep of dates;
  - mutations: "always tomorrow", "always due + 1", "the earlier of the two" must each fail a check.
- **`tests/e2e/task-postpone.spec.js`** (Chromium and WebKit, generated tasks seeded with `seed`, `openApp`'s fixed
  Thursday night):
  - **US1**: a task due today, one overdue: «أجّلها» on Today sends each to tomorrow, the toast names the day, the
    task leaves today's list; «رجّعها» puts the stored task back byte for byte (SC-002); a block ticked between the
    postpone and the undo stays ticked;
  - **US1, another day**: on a future day picked in the strip, a task due that day goes to the day after it;
  - **US2**: in the Tasks tab, a task due in three days moves one day and the list stays in date order; two taps move
    it two days; a task with no date, a done task and a task in its pencil form have no «أجّلها»;
  - **FR-005**: after postponing, `done`, `text` and `tag` are unchanged;
  - **FR-007**: the button's accessible name is «أجّلها: <text>»;
  - **375 px**: the Tasks tab has no horizontal scroll with a long task text.
- **Regression**: the existing postpone tests (`postpone-ask.spec.js`, `day.spec.js`) pass unchanged.
- **`tools/check-parity.js`**: 0 differences (SC-004).

## Validation (quickstart)

1. `py -3 tools/build.py`, then every `node tools/check-*.js` and its `--self-test`; `check-private.js` says clean.
2. `node tools/check-parity.js --old <main build> --new index.html --settings .private/settings.json`: 0 differences.
3. `cd tests/e2e && PYTHON="py -3" E2E_PORT=<port> npx playwright test`: all pass.
4. By hand on a phone: add a task due today, tap «أجّلها» on Today and see it leave with «اتأجلت المهمة لـ …»; tap
   «رجّعها» and see it back; in the Tasks tab, postpone a task due next week and see its date move one day.

## Complexity Tracking

None: no principle is bent.
