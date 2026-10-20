---

description: "Task list for feature 015: ask on its own to postpone what was not done"
---

# Tasks: Ask on Its Own to Postpone What Was Not Done

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: `tools/check-postpone.js` with `--self-test` in CI, plus E2E in `tests/e2e/postpone-ask.spec.js`.

## Binding rules

- Nothing is postponed, ticked or cancelled without a tap. Showing the notice writes nothing.
- Where items go and how they are stored are 009's rules, unchanged.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: The remembered day and the rule (all stories)

- [x] T001 In `src/app/06-store.js`, add `askedUpTo` to the progress: `EMPTY()` sets `null`, and `normalize` keeps
  it only if it is a date.
- [x] T002 In the postpone rules block of `src/app/13-rules.js`, add `daysToAsk(today, askedUpTo, addDays)`.
- [x] T003 [P] In `tools/check-postpone.js`, add the `daysToAsk` checks and an oracle over 400 random cases. Add three
  mutations: no 7-day limit, today included, and a first run that asks about more than yesterday.
- [x] T004 [P] In `tools/check-backup.js`, add `askedUpTo` to the progress oracle and the sample.

## Phase 2: The notice, «أجّل الكل» and «مش دلوقتي» (US1, US3)

- [x] T005 Create `src/app/10b-postpone-ask.js` (`AskPostpone`) and list it in `ORDER` after `10-postpone-ui.js`.
- [x] T006 «أجّل الكل» goes through `actEdit`, and its undo restores the snapshot with `askedUpTo` already set.
  «مش دلوقتي» sets `askedUpTo` to yesterday.
- [x] T007 Wire it in `TodayView`: show it only on today with no review open. `21-shell.js` passes `actEdit`.

## Phase 3: «راجعها» (US2)

- [x] T008 «راجعها» sets `askedUpTo` to the oldest listed day, moves Today to that day and opens its review.

## Phase 4: Tests, docs, PR

- [x] T009 `tests/e2e/postpone-ask.spec.js`: US1, US2 and US3, the first run, and no notice when nothing is open.
- [x] T010 [P] Add the README «تأجيل اللي ماتعملش» part, and a line in PRODUCT.
- [x] T011 Run every check, the E2E tests, and a 375 px look in the browser. Then tick the tasks.
