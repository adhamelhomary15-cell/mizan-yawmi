# Implementation Plan: Fewer Tabs (no Tasks tab, no Course tab)

**Branch**: `031-fewer-tabs` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

## Summary

The band drops from six tabs to four. The two screens that go are split into parts that move:
- **Tasks screen** (`TasksView`, `src/app/14-tasks-view.js:119`):
  - its task list becomes `DayTasks`, the always-shown tasks section of Today, under the timeline;
  - its weekly appointments become `WeeklyAppts`, a section of Settings.
- **Course screen** (`CourseView`, `src/app/12-course-view.js:45`):
  - its plan with checkboxes becomes `CoursePlan`, opened from Today's target card and, for other courses, from Settings;
  - adding, deleting and choosing the main course become `CoursesSection`, a section of Settings.

The stored data keeps its shape, and `13-rules.js` and `13a-schedule-rules.js` do not change. Every write keeps going
through the same `update`, `remove` and `actEdit` calls as now. As in earlier features, the decisions and checks are
kept in this file.

## Technical Context

- **Language**: the app script (`src/app/*.js`), the page CSS (`src/planner.html`).
- **Storage**: unchanged (`tasks`, `appts`, `courses`, `mainCourse`, module marks).
- **Tests**:
  - `tools/check-code.js` (no dead code, file size), `tools/check-security.js`, `tools/check-parity.js`,
    `tools/check-private.js` and every other check unchanged;
  - E2E: `tests/e2e/fewer-tabs.spec.js` is new; `course.spec.js`, `day.spec.js` and `task-postpone.spec.js` change with
    the phase that removes what they use.
- **Target**: phone browsers at 375 px; the desktop layout of Today and Settings.
- **Constraints**: no new library, no file over 600 lines.

The owner decided the open questions on 2026-11-06: «باقي المهام», a closed plan for other courses, the default date, tasks
under the timeline, and the phone and offline test.

## Constitution Check (v3.0.1)

| Principle | Status |
|---|---|
| I. Human review | Screens move; nothing acts for the owner. |
| II. Checking off is human | Every checkbox, moved or new, changes a mark only through its tap handler: `finishTask` and the task toggle in `TaskRow`, `toggleModule` in `ModuleRow`. E2E confirms that opening a list or a plan writes nothing. |
| III. Data stays on the device | No new network call; nothing new is stored. |
| IV. Honest, offline day | Day plans must not change: parity 0 at every phase. The card says the course is done only when no module is open. Ticking is tested offline. |
| V. Simple, single file | No new file in the app; the moved parts reuse the same components. |
| VI. General repo | No personal value. |

This feature moves every task and module tick, so the constitution's gate for done-state changes applies: E2E tests a
tick at phone size and offline, and confirms no code path sets done state without a tap (see Tests).

## Decisions (research)

1. **Split, do not rewrite; one task row.**
   - **Decision**: `TasksView` becomes `DayTasks` and `WeeklyAppts` in the same file. `CourseView` becomes `CoursePlan` and
     `CoursesSection` in its file. `ItemForm`, `PasteTasks` and `CourseForm` stay as they are. Every task list uses one
     `TaskRow`, the Tasks screen's row: tick, type and date, edit and delete, with «أجّلها» only on open dated tasks. A late
     task says «متأخرة» beside its type, as Today does now. A small local hook, `useEditSlot`, holds the one open edit form
     and its focus return, for both `DayTasks` and `WeeklyAppts`.
   - **Why**: the add, edit, paste, postpone and delete code is already tested. Today's row has four grid columns
     (`.titem.has-act`) and no room for edit and delete at 375 px; the Tasks row wraps at 520 px (`.wrap-act`).
   - **Rejected**: new files per part (files 12 and 14 stay under 600 lines, and more files add lines in `ORDER` for the
     same code).
2. **Today's tasks section (`DayTasks`).**
   - **Decision**: it replaces the inline section of `TodayView` (`src/app/10-postpone-ui.js:243`), moves from the side
     column to `.today-main` after the timeline, keeps the `.sec o-tasks` wrapper, and always shows. Rule: every open task
     is in exactly one list of the section, on every day. Its order is:
     - the head «مهام النهارده» on today, «مهام اليوم ده» on another day, with «+ مهمة» and «الصق مهام من AI»;
     - the day's open tasks as now (due that day, or late on today), or the empty line «مفيش مهام لليوم ده.»;
     - «من غير ميعاد»: open tasks with no date, shown when there are any;
     - «باقي المهام (N)»: a closed `<details>` with every other open dated task, sorted by date, shown when there are any;
     - «خلصت»: a closed `<details>` with the last 20 finished, shown when there are any; each can be unticked.

     The edit form opens in place, one at a time. A new task's form takes the day shown as its default date, or no date
     when the day shown is in the past; a task with no date needs that field cleared. `DayTasks` is rendered with
     `key=${iso}`, so a day change closes its forms (the precedent is `Balance key=${iso}`, `10-postpone-ui.js:255`). The
     paste draft stays, since it lives at file level (`PASTE_DRAFT`).
   - **Why**: the owner wants tasks in Today, and chose the default date so «+ مهمة» means "for this day". Under the
     timeline, the day's blocks stay one tap away (Product Principle 2) and the side column stays target, prayers and rosette
     (`DESIGN.md:164`), so forms and paste get the wide column. «باقي المهام» keeps the old list's overview for one closed line
     of height, since pasted tasks can carry dates on any day (`14-tasks-view.js:81`).
   - **Rejected**: above the timeline (it pushes the day down on the phone and overflows the sticky column on desktop);
     each task only on its own day (a pasted batch could be found only by paging through days); a bottom sheet or a dialog
     (a new pattern for one form).
   - **Accepted cost**: on the phone, a late task sits further down than now.
3. **Weekly appointments (`WeeklyAppts`)** go in Settings right after «جدولك». «افتح اليوم» stays: it opens the
   appointment's day in Today, through `goDay`.
4. **The course in Today.**
   - **Decision**: `TargetCard` (`src/app/09-today.js:35`) stops being one button that opens the tab. It becomes a panel:
     - the name, count, bar and «الجاي» as now; «فاضل N» goes, since the list below shows it;
     - a week's modules, each with a checkbox (`toggleModule`). The week is the one containing the day shown, whole, with its
       ticked modules. In a gap or past the end, it is the week of the next open module. Before the plan starts, it is the
       first week. This is one change to the `wk` expression (`09-today.js:41`);
     - «خلّصت الكورس كله» only when no module is open, as now;
     - a `<details>` «الخطة كلها» with `CoursePlan`: every week, the real current week marked (`now.iso`), every module with a
       checkbox.

     `ModuleRow` is shared by the card and `CoursePlan`. With no course, the card does not show, as now.
   - **Why**: the card already says what is next; ticking there removes the trip to a tab. Keeping a week whole means a
     module just ticked can be unticked in place. The card follows the day shown, as it does now; «الأسبوع ده» must mean the
     real week, as it does now.
   - **Rejected**: a full-screen plan opened from the card (it would be the removed tab behind one more tap); only weeks with
     open modules (the list would jump away on the last tick, and the module could not be unticked there).
5. **Courses in Settings (`CoursesSection`)**, after the appointments. Each course is a row, with no selection state:
   - the name, with the star and «الكورس الأساسي» on the main one;
   - its description, dates and «حوالي N في الأسبوع»;
   - «خليه الكورس الأساسي» on a course that is not main; «امسح الكورس» on a course not from the settings file;
   - on the main course, the note about its time in the daily schedule, under the same condition as now;
   - on a course that is not main, a closed `<details>` «الخطة» with its count and `CoursePlan`.

   «كورس جديد» opens `CourseForm`. With no course, it shows «لسه مفيش كورس» and «كورس جديد».
   - **Why**: the plan of another course keeps its place (SC-001) without making it main, which would also change the name
     on the schedule's blocks. The pace line and its feature 017 test stay.
   - **Rejected**: chips plus an open plan (selection state that serves one screen, and a long Settings page).
6. **The shell.** `TABS` goes from six entries to four. The hash list (`21-shell.js:29`) drops `course` and `tasks`, so those
   addresses fall back to Today, the existing default. The `course` branch goes, and the final `else` (`21-shell.js:110`)
   renders `SettingsView`. Props:
   - `SettingsView` gains `now`, `update`, `remove`, `actEdit` and `goDay`; it already gets `store`;
   - `TargetCard` gains `now` and `update`, and loses `goTab`;
   - `TodayView` loses `goTab`, since nothing in it opens a tab any more.
7. **CSS.**
   - **Remove**: `.tasksv` and `.coursev` from every rule, keeping the other selectors in shared lists (`.settingsv`,
     `.course-form`); `.filters`, `.chips`, `.titem.has-act`, and the `.a-tasks` and `.a-appts` desktop grid.
   - **Change**: `.nav-in` to `repeat(4,...)` (`planner.html:580`); `.target` loses `cursor:pointer` and its hover border
     (288-289); phone order to `.o-timeline{order:3} .o-tasks{order:4}` (453), because `.today-main` is `display:contents`
     there and `order` decides, not the file.
   - **Keep or move**: `.weeks`, `.week`, `.mod`, `.appt` and `.titem`. The rules scoped to `.coursev .week` and
     `.tasksv .panel` move to `.weeks .week` and `.o-tasks .panel`. `.weeks` stays one column inside `.o-target`, whose width
     is 340 px. `<summary>` follows `.ed-part summary` (44 px).

## Design

| Action | File | Change |
|---|---|---|
| Modify | `src/app/14-tasks-view.js` | `TaskRow`, `useEditSlot`, `DayTasks`, `WeeklyAppts`; `TasksView` deleted |
| Modify | `src/app/12-course-view.js` | `ModuleRow`, `CoursePlan`, `CoursesSection`; `CourseView` deleted |
| Modify | `src/app/09-today.js` | `TargetCard` as a panel (Decision 4) |
| Modify | `src/app/10-postpone-ui.js` | `TodayView` renders `<DayTasks>` after the timeline; the inline section and `goTab` go |
| Modify | `src/app/15-settings-view.js` | renders `<WeeklyAppts>` and `<CoursesSection>` after «جدولك» |
| Modify | `src/app/21-shell.js` | four tabs, the hash list, the branches, the props (Decision 6) |
| Modify | `src/app/ORDER` | the notes at lines 34 and 40 name the parts in place of the removed screens |
| Modify | `src/planner.html` | Decision 7 |
| Modify | `README.md` | lines 93, 101 and 144 name the old tabs |
| Modify | `PRODUCT.md` | lines 41-47 list Course and Tasks as tabs |
| Modify | `DESIGN.md` | line 153 gives the course name as a screen title |
| Create | `tests/e2e/fewer-tabs.spec.js` | see Tests |
| Modify | `tests/e2e/course.spec.js`, `day.spec.js`, `task-postpone.spec.js` | see Tests |
| Rebuilt | `index.html`, `sw.js`, `manifest.webmanifest` | by `tools/build.py`, never by hand |

### Tests

**`tests/e2e/fewer-tabs.spec.js`** checks:
- **The band**: اليوم، الأسبوع، تمارين، الإعدادات, in that order; they fill the band's width; `#tasks` and `#course` open Today.
- **Tasks in Today**:
  - with no task, the section shows with both buttons and the empty line;
  - «+ مهمة» takes the day shown as its date, and no date on a past day; changing day closes the form;
  - add a task with the date cleared: it is under «من غير ميعاد» on every day;
  - a task due another day is not in the day's list, and is in «باقي المهام» with its count;
  - paste tasks;
  - tick a task from the day's list, then edit and delete one, with «رجّعها» after the edit and the delete;
  - edit, delete and untick a finished task; edit and delete an undated one.
- **Appointments in Settings**: add, edit, delete; the appointment shows inside its day; «افتح اليوم» lands on it in Today.
- **The course**:
  - tick and untick a module on the card, with the count and bar following; tick the last open module of the week, and it
    can still be unticked there;
  - open «الخطة كلها», see the tick from the card, tick there, and see it on the card;
  - past the plan's end with modules open, the card shows the next modules and does not say it is done;
  - tick a module of a course that is not main in Settings; the main course does not change;
  - add a course in Settings, make it main, see its name on the card, and delete it;
  - a course from the settings file has no «امسح الكورس».
- **Done state**: at 375 px and offline, ticking a task and a module keeps the marks after a reload (Chromium only, as in
  `offline.spec.js`); opening «باقي المهام», «خلصت» and «الخطة كلها» leaves the stored progress unchanged.
- **Phone width**: at 375 px, nothing scrolls sideways on Today and Settings.
- **Desktop**: at 1280 px, `.today-side` holds only the target, prayers and rosette.

**Changed tests**:
- `tests/e2e/task-postpone.spec.js`: the US1 tests and FR-006 stay. The US2 tests run from Today:
  - moving one day per tap: the task is in «باقي المهام», which is opened, and date order is read there;
  - no «أجّلها» on undated, done and edited tasks: 4 buttons with «باقي المهام» open; none inside «خلصت»;
  - FR-005 opens «باقي المهام» in place of the tab;
  - the phone test reads Today, not the Tasks tab.
- `tests/e2e/course.spec.js`: making a course main, adding one and the pace line go through `CoursesSection`; the first test
  taps «خليه الكورس الأساسي» on the Course A row; the no-writes check stays.
- `tests/e2e/day.spec.js`: visits four tabs.

**Parity**: 0 at every phase, with `tools/check-parity.js --old <main build> --new index.html`, on the example and, when
present, on a private settings file.

## Phases

"Checks" means every `tools/check-*.js`, parity 0, and the full E2E on Chromium and WebKit, in every row.

| # | Phase | Story | Tests in this phase |
|---|---|---|---|
| 1 | `DayTasks` and `WeeklyAppts`; `TasksView` and the Tasks tab go; its CSS and the phone order | US1, US2 | tasks and appointments in `fewer-tabs.spec.js`; `task-postpone.spec.js`; `day.spec.js` drops «المهام» |
| 2 | `TargetCard`, `CoursePlan`, `CoursesSection`; `CourseView` and the Course tab go; its CSS and `.target` | US3 | the course and done state in `fewer-tabs.spec.js`; `course.spec.js`; `day.spec.js` drops «الكورس» |
| 3 | `.nav-in`; `README.md`, `PRODUCT.md`, `DESIGN.md`, `ORDER`; `tasks.md` boxes; PR | all | the band, phone and desktop checks; `check-private` |

Each phase moves its parts, removes what they replace, and moves its tests, so no code exists twice and E2E passes at every
gate. In phase 1 the band has five tabs in six columns, which is fixed in phase 3.

## Risks

- **Today gets long** with many undated tasks: everything shows, and the other parts stay reachable by scrolling, since the
  section is last on the phone.
- **An open plan on desktop**: «الخطة كلها» can make the sticky side column taller than the screen. The user opened it and can
  close it.
- **A module in two places**: it shows on the card and in «الخطة كلها». Both read the same mark through `doneMap` and call the
  same `toggleModule`, so their marks cannot disagree; E2E ticks in one and reads the other. The two can mark different weeks
  when another week's day is shown, by design (Decision 4).
- **A long Settings page**: two more sections, with the other courses' plans closed.
