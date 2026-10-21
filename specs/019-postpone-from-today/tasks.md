---

description: "Task list for feature 019: postpone from the day's timeline"
---

# Tasks: Postpone From the Day's Timeline

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: E2E in `tests/e2e/day.spec.js`, parity 0, and every check script.

## Binding rules

- Postponing never marks anything done or cancelled.
- Where blocks go and how they are stored are 009's rules, unchanged.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: «أجّلها» on the timeline (US1)

- [x] T001 In `TodayView`, add the `postponing` state and the «أجّلها» button next to «اتلغى النهارده», for open
  blocks of a «ينفع يتأجل» kind.
- [x] T002 Render 009's `PostponePanel` under the row's actions. Closing it clears both `postponing` and `open`.

## Phase 2: «أجّلها» on late tasks, and the hint (US2)

- [x] T003 A late task in today's «مهام النهارده» gets «أجّلها»: its date becomes tomorrow, through `applyPostpone`
  and `act`.
- [x] T004 `.titem.has-act` gets a fourth column, and the hint under the timeline says «تلغيه أو تأجّله».

## Phase 3: Tests, docs, PR

- [ ] T005 E2E in `tests/e2e/day.spec.js`: US1, US1 with no button on a «شغل» block, and US2.
- [ ] T006 [P] README: the line in «تأجيل اللي ماتعملش».
- [ ] T007 Run every check, parity, the E2E tests, and a 375 px look. Tick the tasks.
