---

description: "Task list for feature 028: postpone a task from anywhere"
---

# Tasks: Postpone a Task from Anywhere

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**:
- `tools/check-postpone.js` (the rule, with self-test mutations), `tools/check-code.js`, `tools/check-security.js`,
  `tools/check-parity.js`, `tools/check-private.js`;
- E2E in `tests/e2e/task-postpone.spec.js` (new);
- by hand on the owner's phone.

## Binding rules

- A postponed task goes to the day after its date, and never earlier than tomorrow (FR-003). "Today" is `now.iso`.
- Postponing writes the task's `due` only: never `done`, `text` or `tag`, and nothing in the day (FR-005).
- A single task's «رجّعها» puts back that task's `due` only (FR-006, plan decision 3).
- Where the day review and the ended-days question send items does not change (FR-006).
- No library, no network, no file over 600 lines.
- Build with `py -3 tools/build.py` on this machine.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: The rule and the shared helper (foundational)

- [x] T001 In `src/app/13-rules.js`, inside the postpone rules block, add
  `function taskNextDay(due, today, addDays){ return addDays(due > today ? due : today, 1); }` with a one-line comment
  (the day after the later of its date and today). The block keeps no page, storage or `addDays` of its own.
- [x] T002 [P] In `tools/check-postpone.js`, add `taskNextDay` to the names `load` returns, and checks, using the tool's
  own `addDays` (it already has one for `daysToAsk`):
  - due today → tomorrow; overdue by 1 day and by 40 days → tomorrow; due in 3 days → its date + 1;
  - across a month's end (`2026-10-31` → `2026-11-01`) and a year's end (`2026-12-31` → `2027-01-01`);
  - over a sweep of `due` and `today` pairs (a year each way), the result is never before `today + 1` and never before
    `due + 1`, and equals the later of the two.
  Self-test mutations, each of which a check must catch: "always tomorrow" (`addDays(today, 1)`), "always due + 1"
  (`addDays(due, 1)`), "the earlier of the two" (`due < today ? due : today`).
- [x] T003 In `src/app/10-postpone-ui.js`, change `postponeTask` to `postponeTask(actEdit, t, to)`:
  `actEdit('اتأجلت المهمة لـ ' + dayName(to), s => {…x.due = to…}, s => {…x.due = <t.due before>…})`, finding the task
  by `t.id` in both. Update its one caller in `Review` (the day review's task button keeps `taskTo`), and pass
  `actEdit` from `TodayView` to `Review`.
- [x] T004 Build, run `check-postpone` (with `--self-test`), `check-code` and parity (0 differences). **Commit**.

  Done on 2026-10-31: `check-postpone` 11 of 11 (2 new), self-test 13 of 13 (3 new mutations, each caught).
  `check-code` refused `taskNextDay` while nothing used it, so Today's existing overdue button uses it already: for an
  overdue task it gives tomorrow, as before. Every check passes; parity 0 on the example and on a private settings file;
  E2E 168 passed. A one-off browser test (not kept; T010 writes the real one): an overdue task postponed to tomorrow,
  a block ticked, then «رجّعها»: the date came back and the tick stayed, on Chromium and WebKit.

## Phase 2: Postpone a task from Today (US1)

**Goal**: every task in Today's list has «أجّلها», which sends it to `taskNextDay(t.due, now.iso, addDays)`.

**Independent test**: a task due today, on Today: one tap sends it to tomorrow with «اتأجلت المهمة لـ …», and
«رجّعها» brings it back.

- [x] T005 [US1] In `src/app/10-postpone-ui.js`, in `TodayView`'s «مهام النهارده» list:
  - every row gets the `has-act` class and «أجّلها», not only `late` ones (the overdue label «متأخرة» stays);
  - the button calls `postponeTask(actEdit, t, taskNextDay(t.due, now.iso, addDays))`;
  - `aria-label=${'أجّلها: ' + t.text}` (plan decision 5).
  The `tomorrow` constant goes if nothing else uses it.
- [x] T006 [US1] Build, run `check-code` and parity. In the browser at 375 px, on the example data: a task due today
  and an overdue one each go to tomorrow; on a future day picked in the strip, a task due that day goes to the day
  after it; «رجّعها» restores the date, and a block ticked between the postpone and the undo stays ticked. **Commit**.

  Done on 2026-10-31: on Chromium and WebKit at 375 px, light and dark, with generated tasks: a task due today and an
  overdue one each went to tomorrow (the toast «اتأجلت المهمة لـ الجمعة، 16 أكتوبر»), the first left today's list; on
  Saturday 17 picked in the next week, a task due that day went to the 18th; the buttons are named «أجّلها: <text>»;
  a long task wraps and the page has no horizontal scroll. `day.spec.js` asserted that a task due today had no
  «أجّلها» (019's rule); it now asserts the button is there. Parity 0 on the example and a private settings file;
  E2E 168 passed.

## Phase 3: Postpone a task from the Tasks tab (US2)

**Goal**: every open task with a date in the Tasks tab has «أجّلها» next to the pencil.

**Independent test**: a task due in three days: one tap moves it to the day after, the list stays in date order, and
«رجّعها» puts it back.

- [x] T007 [US2] In `src/app/21-shell.js`, nothing to add: `TasksView` already receives `actEdit`. In
  `src/app/14-tasks-view.js`, in the open list's row, before the pencil in `.tact`, add for `!t.done && t.due`:
  `<button type="button" class="btn" aria-label=${'أجّلها: ' + t.text} onClick=${() => postponeTask(actEdit, t, taskNextDay(t.due, now.iso, addDays))}>أجّلها</button>`.
  A row in its pencil form already shows only the form, so it has no button. Done and undated tasks have none.
- [x] T008 [P] [US2] In `src/planner.html`, only if the browser check in T009 shows the row too tight at 375 px:
  keep the task text column shrinking (`minmax(0,1fr)`, `overflow-wrap:anywhere`) and the three controls on one line.
- [x] T009 [US2] Build, run `check-code` and parity. In the browser at 375 px, light and dark: a task due in three days
  moves one day per tap; the list stays ordered by date; an undated and a done task have no button; a long task text
  wraps with no horizontal scroll. **Commit**.

  Done on 2026-10-31. T008 was needed: with three controls on one line, the text column at 375 px was about 110 px,
  so «مهمة بعد تلات أيام» took two lines and a long task six. Below 520 px a row with «أجّلها» (`.wrap-act`) puts its
  buttons on a line under the text, at the row's end; rows without it stay on one line. No button went under 44 px.
  On Chromium and WebKit at 375 px, light and dark, with generated tasks: the three dated open tasks have
  «أجّلها: <text>», the undated one has none; a task due in three days went to the 19th («اتأجلت المهمة لـ الاتنين، 19
  أكتوبر») and then the 20th, the list stayed in date order, and «رجّعها» undid the last move only; a task in its pencil
  form and the done list have no button; no horizontal scroll. Every check passes, parity 0 on the example and a
  private settings file, E2E 168 passed.

## Phase 4: Tests, docs

- [ ] T010 In `tests/e2e/task-postpone.spec.js` (Chromium and WebKit, `openApp` on its fixed Thursday night, tasks seeded
  with `seed` from `helpers.js`, all generated):
  - **US1**:
    - a task due today and one overdue: «أجّلها» on Today sends each to tomorrow, the toast reads
      «اتأجلت المهمة لـ <tomorrow>», and the task leaves today's list;
    - «رجّعها» puts the stored `tasks` back byte for byte (SC-002);
    - a block ticked between the postpone and «رجّعها» stays ticked;
    - on a future day picked in the strip, a task due that day goes to the day after it;
  - **US2**:
    - in the Tasks tab, a task due in three days moves one day; two taps move it two days; the list stays in date order;
    - an undated task, a done task, and a task with its pencil form open have no «أجّلها»;
  - **FR-005**: after a postpone, the task's `done`, `text` and `tag` are as before;
  - **FR-006**: the day review's task button still sends a task to the day after the reviewed day;
  - **FR-007**: the buttons' accessible names are «أجّلها: <text>»;
  - **375 px**: the Tasks tab has no horizontal scroll with a long task text.
- [ ] T011 [P] README.md, the tasks part: «أجّلها» is on every task that has a date, in Today and in the Tasks tab; it
  moves the task to the day after its date, never earlier than tomorrow, and «رجّعها» undoes it.
- [ ] T012 Rebuild, then run every check with `--self-test`, parity on the example and on `.private/settings.json`, and
  the whole E2E suite. Tick the tasks. **Commit**.

## Phase 5: PR

- [ ] T013 Push and open the PR when the owner asks. Merge when the owner asks. After it is published, the owner tries
  it on the phone: a task due today postponed from Today, and one from the Tasks tab.

## Dependencies

- Phase 1 (T001 to T004) comes first: both stories use `taskNextDay` and the new `postponeTask`.
- US1 (phase 2) and US2 (phase 3) touch different files and can go in either order after phase 1.
- Phase 4 needs both stories; phase 5 needs phase 4.

## Parallel

- T002 with T001 and T003 (a different file).
- T008 with T007, if it is needed at all.
- T011 with T010.

## Summary

- Total: 13 tasks.
  - The rule and the helper: 4.
  - US1, Today: 2.
  - US2, the Tasks tab: 3.
  - Tests and docs: 3.
  - The PR and the phone check: 1.
- MVP: phases 1 and 2 (postponing from Today, which the owner uses every day). Phase 3 adds the Tasks tab on top.
