---

description: "Task list for feature 031: fewer tabs (no Tasks tab, no Course tab)"
---

# Tasks: Fewer Tabs (no Tasks tab, no Course tab)

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**:
- every `tools/check-*.js` with its self-test, `tools/check-parity.js`, `tools/check-private.js`;
- E2E in `tests/e2e/fewer-tabs.spec.js` (new), `course.spec.js`, `day.spec.js`, `task-postpone.spec.js`;
- by hand on the owner's phone.

## Binding rules

- Move code, do not rewrite it: every write keeps going through `update`, `remove` and `actEdit`. The stored data keeps its
  shape; `13-rules.js` and `13a-schedule-rules.js` do not change.
- No mark changes without the user's tap (FR-008). Opening a list or a plan writes nothing.
- Every open task is in exactly one list of Today's tasks section, on every day (FR-010).
- The card says the course is done only when no module is open.
- A phase removes what it replaces and moves its tests, so no code exists twice and E2E passes at every gate.
- All test data is generated; no personal value in any tracked file.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

"The gate" below means: `python tools/build.py`; every check and self-test; parity 0 against a build of `main`
(`tools/check-parity.js --old <main build> --new index.html`, on the example and, when present, on a private settings file);
the full E2E with `--workers=2` on Chromium and WebKit.

---

## Phase 1: Tasks in Today, appointments in Settings (US1, US2)

**Goal**: the Tasks tab is gone, and everything it did works from Today and Settings.

**Independent test**: with no Tasks tab, add a task with a date and one without, paste tasks, edit, tick and delete from
Today; add, edit and delete an appointment from Settings, and see it inside its day.

- [x] T001 [US1] `src/app/14-tasks-view.js`: `TaskRow`, from the Tasks screen's row (lines 182-190): tick with the existing
  toggle, type and date, edit, delete, with «أجّلها» only on an open dated task (line 187). A late task says «متأخرة» beside
  its type. Keep `id="edit-btn-…"`.
- [x] T002 [US1] `src/app/14-tasks-view.js`: `useEditSlot`, a small local hook from `editing`, `lastEdited`, the focus effect,
  `openEdit` and `closeEdit` (lines 127-136): the one open edit form and its focus return, keeping the `if (el)` guard.
- [x] T003 [US1] `src/app/14-tasks-view.js`: `DayTasks({iso, now, store, update, remove, actEdit})`, wrapper `.sec o-tasks`:
  - the head «مهام النهارده» on today, «مهام اليوم ده» on another day, with «+ مهمة» and «الصق مهام من AI»;
  - the day's open tasks (`t.due === iso`, or `t.due < iso` when the day shown is today), or «مفيش مهام لليوم ده.»;
  - «من غير ميعاد»: open tasks with no date, when there are any;
  - «باقي المهام (N)»: a closed `<details>` with every other open dated task, sorted by date (line 163), when there are any;
  - «خلصت»: a closed `<details>` with the last 20 finished (line 164), when there are any.

  The new task form's date is `iso`, or empty when `iso < now.iso`. Only one form is open at a time, including paste.
- [x] T004 [US2] `src/app/14-tasks-view.js`: `WeeklyAppts({now, store, update, remove, actEdit, goDay})`, from the
  appointments section (`.a-appts`), with `useEditSlot`, «افتح اليوم» calling `goDay`. Delete `TasksView`, and `filter` and `shown`
  with it.
- [x] T005 [US1] `src/app/10-postpone-ui.js`: remove the inline section (lines 243-253) and `dayTasks`. Render
  `<DayTasks key=${iso} …>` in `.today-main`, after `.o-timeline`. `finishTask` stays for the day review (line 103).
- [x] T006 [US2] `src/app/15-settings-view.js`: `SettingsView` takes `now`, `update`, `remove`, `actEdit` and `goDay`, and
  renders `<WeeklyAppts>` right after «جدولك».
- [x] T007 [US1] `src/app/21-shell.js`: remove the `tasks` entry from `TABS` and from the hash list (line 29). The final `else`
  (line 110) renders `SettingsView` in place of the `settings` branch (line 109), with the new props.
- [x] T008 [US1] `src/planner.html`:
  - remove `.tasksv` from shared lists (lines 439, 440, 451), keeping the other selectors, and its grid (line 617);
  - remove `.titem.has-act` (296) and `.a-tasks`, `.a-appts` (618); `.filters` stays, since the workouts switch uses it
    (`18-workout-history.js:12`);
  - add `.o-tasks .panel` with the radius `.tasksv .panel` gave, and `<summary>` at 44 px, with its open and closed marker;
  - set phone order `.o-timeline{order:3} .o-tasks{order:4}` (453).
- [x] T009 [P] [US1] `tests/e2e/fewer-tabs.spec.js`, tasks: with no task, the section shows with both buttons and the empty
  line; «+ مهمة» takes the day shown, and no date on a past day; changing day closes the form; a task with the date cleared is
  under «من غير ميعاد» on every day; a task due another day is in «باقي المهام» with its count, and not in the day's list; paste;
  tick a task from the day's list, then edit and delete one, with «رجّعها» after the edit and the delete; edit, delete and
  untick a finished task; edit and delete an undated one.
- [x] T010 [US2] `tests/e2e/fewer-tabs.spec.js`, appointments in Settings: add, edit, delete; the appointment shows inside
  its day; «افتح اليوم» lands on it in Today.
- [x] T011 [P] [US1] `tests/e2e/task-postpone.spec.js`: keep the US1 tests and FR-006; update the header comment. Run from Today:
  - moving one day per tap: open «باقي المهام», and read date order there (`.o-tasks details`);
  - no «أجّلها»: 4 buttons with «باقي المهام» open, none on the undated or edited task, none inside «خلصت»;
  - FR-005 opens «باقي المهام» in place of the tab;
  - the phone test reads Today, not the Tasks tab.
- [x] T012 [P] [US1] `tests/e2e/day.spec.js`: remove «المهام» from the tab list (line 8).
- [x] T013 The gate; a 375 px look at Today and Settings. The band has five tabs in six columns until T026.

**Checkpoint**: US1 and US2 work on their own.

---

## Phase 2: The course without its tab (US3)

**Goal**: the Course tab is gone; modules are ticked from the card, and courses are managed in Settings.

**Independent test**: with a course, tick and untick a module from Today; add a course in Settings, make it main, see the card
follow, and delete it; tick a module of a course that is not main.

- [x] T014 [US3] `src/app/12-course-view.js`: `ModuleRow`, from lines 105-110 (`Check`, `toggleModule`), and
  `CoursePlan({now, store, update, course})`, from lines 96-113, marking the real current week (`now.iso`).
- [x] T015 [US3] `src/app/12-course-view.js`: `CoursesSection({now, store, update, remove})`, one row per course, with no
  selection state:
  - the name, with the star and «الكورس الأساسي» on the main one;
  - `c.sub`, the dates and «حوالي N في الأسبوع»;
  - «خليه الكورس الأساسي» on a course that is not main; «امسح الكورس» unless `c.fromSettings`;
  - on the main course, the note at line 93, under the same condition;
  - on a course that is not main, a closed `<details>` «الخطة» holding the count and bar (`.prog`) and then
    `CoursePlan`;
  - «كورس جديد» opening `CourseForm`; with no course, «لسه مفيش كورس» and «كورس جديد».

  Delete `CourseView`.
- [x] T016 [US3] `src/app/09-today.js`: `TargetCard({iso, now, store, update})` becomes a panel, not a button:
  - the name, count, bar and «الجاي» as now; «فاضل N» goes;
  - the week's modules with `ModuleRow`. The week contains `iso`, whole. In a gap or past the end, it is the week of the next
    open module. Before the plan starts, it is `plan[0]`;
  - «خلّصت الكورس كله» only when no module is open;
  - a `<details>` «الخطة كلها» with `CoursePlan`.
- [x] T017 [US3] `src/app/10-postpone-ui.js`, `src/app/21-shell.js`: pass `now` and `update` to `TargetCard`; `TodayView` stops
  taking `goTab`, and the shell stops passing it.
- [x] T018 [US3] `src/app/15-settings-view.js`: render `<CoursesSection>` after `<WeeklyAppts>`.
- [x] T019 [US3] `src/app/21-shell.js`: remove the `course` entry from `TABS`, the hash list, and its branch (line 107).
- [x] T020 [US3] `src/planner.html`:
  - remove `.coursev` from every rule, keeping the other selectors (451; `.course-form` at 616 keeps its max-width);
  - move `.coursev .week` (442) to `.weeks .week`, and drop `.coursev .prog`, since `DayProgress` also uses `.prog`;
  - remove `.chips` (370-373), and move `.chips .star` to the course row;
  - `.target` loses `cursor:pointer` and its hover border (288-289);
  - `.weeks` stays one column inside `.o-target` (615).
- [x] T021 [P] [US3] `tests/e2e/fewer-tabs.spec.js`, the course: tick and untick on the card, with the count and bar following;
  tick the week's last open module, and it can still be unticked there; open «الخطة كلها», see the card's tick, tick there, and
  see it on the card; past the plan's end with modules open, the card shows the next modules and does not say it is done; tick
  a module of a course that is not main in Settings, and the main course does not change; add a course, make it main, see its
  name on the card, and delete it; a course from the settings file has no «امسح الكورس».
- [x] T022 [US3] `tests/e2e/fewer-tabs.spec.js`, done state (FR-008, FR-011): at 375 px and offline, ticking a task and a
  module keeps the marks after a reload (Chromium only, as in `offline.spec.js`); opening «باقي المهام», «خلصت» and «الخطة كلها»
  leaves `mizan-progress` unchanged.
- [x] T023 [P] [US3] `tests/e2e/course.spec.js`: update the header comment. Go through `CoursesSection`: the first test taps
  «خليه الكورس الأساسي» on the Course A row; the second adds a course and sees «الكورس الأساسي» on its row; the third reads
  «حوالي 3 في الأسبوع» on the row. The no-writes check stays.
- [x] T024 [P] [US3] `tests/e2e/day.spec.js`: remove «الكورس» from the tab list.
- [x] T025 The gate; a search confirms every call to `toggleModule` and to the task toggle sits in a tap handler; a 375 px look
  at the card with a module list and an open plan.

**Checkpoint**: all three stories work.

---

## Phase 3: The band, docs, PR

- [x] T026 `src/planner.html`: `.nav-in` to `repeat(4,minmax(0,1fr))` (580).
- [x] T027 `tests/e2e/fewer-tabs.spec.js`: the band shows اليوم، الأسبوع، تمارين، الإعدادات in that order and fills its width;
  `#tasks` and `#course` open Today; at 375 px nothing scrolls sideways on Today and Settings; at 1280 px, `.today-side` holds
  only the target, prayers and rosette.
- [x] T028 [P] `src/app/ORDER`: the notes at lines 34 and 40 name the parts in place of the removed screens.
- [x] T029 [P] `README.md`: lines 93, 101 and 144 name the four tabs, and where tasks, appointments and courses now are.
- [x] T030 [P] `PRODUCT.md`: lines 41-47 describe four tabs, with tasks in Today, appointments and courses in Settings.
- [x] T031 [P] `DESIGN.md`: line 153 no longer gives the course name as a screen title.
- [ ] T032 The gate; a by-hand check at 375 px and offline, as the constitution requires for done-state changes;
  `check-private`. Tick the tasks.
- [ ] T033 Open the PR only when the owner asks.

---

## Dependencies

- Phase 1 comes first: `TaskRow` and `useEditSlot` come before the parts that use them.
- Phase 2 needs phase 1 for `<WeeklyAppts>` in Settings and the props of `SettingsView`.
- Phase 3 needs phases 1 and 2. T026 waits for four tabs.
- US1 and US2 ship together, because removing `TasksView` needs both.

## Parallel

- T009 and T011, T012 together, once T001 to T008 are done; T010 follows T009 (the same file).
- T021 and T023, T024 together, once T014 to T020 are done; T022 follows T021 (the same file).
- T028 to T031 together.

## Summary

- Total: 33 tasks.
  - US1: 9 (T001-T003, T005, T007-T009, T011, T012).
  - US2: 3 (T004, T006, T010).
  - US3: 11 (T014-T024).
  - Gates, band, docs and the PR: 10 (T013, T025-T033).
- MVP: phase 1 (tasks in Today, which is what the owner asked for first).
