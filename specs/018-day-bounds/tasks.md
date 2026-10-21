---

description: "Task list for feature 018: choose when your day starts and ends"
---

# Tasks: Choose When Your Day Starts and Ends

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: `tools/check-schedule.js` and `tools/check-anchors.js` in CI, parity 0, plus E2E in
`tests/e2e/day-bounds.spec.js`.

## Binding rules

- Without `day`, everything is exactly as now: parity 0 on the example and the private file.
- Blocks outside the day are refused and named, never moved or hidden.
- No tick is made or cleared.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: The bounds and the settings check (US3)

- [x] T001 In `01-settings-validate.js`:
  - `dayBounds(day)` at the top level;
  - `day` in `validateSettings`, with errors on `day.start`, `day.end` and `day`;
  - block times up to 28:59, and every block inside the day.
- [x] T002 `check-backup.js`, `check-schedule.js` and `check-settings.js` pull out `dayBounds` with
  `validateSettings`.
- [x] T003 In `tools/check-schedule.js`:
  - the `dayBounds` edges, and an oracle over a 15-minute grid;
  - the block checks in both versions, and the `day` errors;
  - three mutations: no 24-hour limit, the inside-the-day check skipped, and times stopping at 24:59.

## Phase 2: The screens follow the bounds (US1, US2)

- [ ] T004 `START`, `END` and `SPAN` come from `dayBounds(CFG.day)`. `dayAt` goes in the schedule rules, and
  `effectiveNow` uses it.
- [ ] T005 The Week's hour labels are computed from the bounds.
- [ ] T006 The editor's `toField`/`fromField`, a new block's default start, and the preview follow the draft's
  bounds.
- [ ] T007 [P] `check-schedule.js`: `dayAt` over every minute of the night for every end, with a mutation.
  `check-anchors.js`: a layout with an early start.

## Phase 3: The editor and the guide (US1–US4)

- [ ] T008 `setDayBounds` in the schedule rules, with its checks.
- [ ] T009 The editor's «يومك» part, and the outside-the-day message with the bounds.
- [ ] T010 The guide's start and end fields.

## Phase 4: Tests, docs, PR

- [ ] T011 `tests/e2e/day-bounds.spec.js`: US1–US4.
- [ ] T012 [P] Docs: the README day part, and B4 closed in `specs/010-code-health/review.md`. Tick T010 in 017's
  tasks.md.
- [ ] T013 Run every check, parity on the example and the private file, the E2E tests, and a 375 px look. Tick the
  tasks.
