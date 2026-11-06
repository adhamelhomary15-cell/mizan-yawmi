# Implementation Plan: Fewer Tabs (no Tasks tab, no Course tab)

**Branch**: `031-fewer-tabs` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

## Summary

The band drops from six tabs to four. The two screens that go are split into parts that move:
- **Tasks screen** (`TasksView`, `src/app/14-tasks-view.js:119`):
  - its task list becomes `DayTasks`, the always-shown tasks section of Today;
  - its weekly appointments become `WeeklyAppts`, a section of Settings.
- **Course screen** (`CourseView`, `src/app/12-course-view.js:45`):
  - its plan with checkboxes becomes `CoursePlan`, opened from Today's target card;
  - adding, deleting and choosing the main course become `CoursesSection`, a section of Settings.

No stored data changes, and no rule changes: every write keeps going through the same `update`, `remove` and `actEdit`
calls as now. As in earlier features, the decisions, data model and checks are kept in this file.

## Technical Context

- **Language**: the app script (`src/app/*.js`), the page CSS (`src/planner.html`).
- **Storage**: unchanged (`tasks`, `appts`, `courses`, `mainCourse`, module marks).
- **Tests**:
  - `tools/check-code.js` (no dead code, file size), `check-security.js`, `check-parity.js`, `check-private.js` and
    every other check unchanged;
  - E2E: `course.spec.js`, `day.spec.js` and `task-postpone.spec.js` move off the old tabs; a new
    `tests/e2e/fewer-tabs.spec.js` covers every old action in its new place (SC-001).
- **Target**: phone browsers at 375 px; the desktop layout of Today and Settings.
- **Constraints**: no new library, no file over 600 lines, no JavaScript rule change.

Nothing is left as NEEDS CLARIFICATION: the owner chose where each part goes.

## Constitution Check (v3.0.1)

| Principle | Status |
|---|---|
| I. Human review | Screens move; nothing acts for the owner. |
| II. Checking off is human | Every checkbox keeps its tap handler (`finishTask`, the task toggle, `toggleModule`); none is set by code. |
| III. Data stays on the device | No network; nothing new is stored. |
| IV. Honest, offline day | Day plans are unchanged (parity 0). |
| V. Simple, single file | Fewer screens; the moved parts reuse the same components. |
| VI. General repo | No personal value. |

All gates pass, before and after the design.

## Decisions (research)

1. **Split, do not rewrite.**
   - **Decision**: `TasksView` becomes two components in the same file, `DayTasks` and `WeeklyAppts`. `CourseView`
     becomes `CoursePlan` and `CoursesSection` in its file. `ItemForm`, `PasteTasks` and `CourseForm` stay as they are.
   - **Why**: the add, edit, paste, postpone and delete code is already tested; moving it keeps its behaviour. Each
     file keeps one job: tasks and appointments, courses.
   - **Rejected**: new files per part (more lines in `ORDER` for the same code).
2. **Today's tasks section (`DayTasks`).**
   - **Decision**: it replaces the inline `o-tasks` section of `TodayView` (`src/app/10-postpone-ui.js:244`) and
     always shows. Its order is:
     - the head «مهام النهارده» (or «مهام اليوم ده») with «+ مهمة» and «الصق مهام من AI»;
     - the day's open tasks as now (due that day, or late on today), each with tick, «أجّلها», edit and delete;
     - «من غير ميعاد»: open tasks with no date, on every day;
     - «خلصت»: a `<details>` with the last 20 finished, each can be unticked.

     The edit form opens in place, one at a time, with the same focus return as the Tasks screen. A new task's form
     takes the day shown as its default date, so a task added while looking at a day lands on it.
   - **Why**: the owner wants tasks from Today; the default date makes «+ مهمة» mean "for this day".
   - **Rejected**: a bottom sheet or a dialog (a new pattern for one form).
3. **Weekly appointments (`WeeklyAppts`)** go in Settings right after «جدولك». «افتح اليوم» stays: it opens the
   appointment's day in Today.
4. **The course in Today.**
   - **Decision**: `TargetCard` (`src/app/09-today.js:35`) stops being one button that opens the tab. It becomes a
     panel:
     - the name, count and bar as now;
     - the current week's modules, each with a checkbox (`toggleModule`); before the plan starts, the first week's;
       after it ends, the card says the course is done;
     - a `<details>` «الخطة كلها» with `CoursePlan`: every week, the current one marked, every module with a checkbox.
   - **Why**: the card already says what is next; ticking there removes the trip to a tab.
   - **Rejected**: a full-screen plan opened from the card (a hidden tab under another name).
5. **Courses in Settings (`CoursesSection`)**, after the appointments:
   - a chip per course, with the star on the main one;
   - «خليه الكورس الأساسي» and «امسح الكورس» for the chosen one, as on the Course screen;
   - «كورس جديد» opening `CourseForm`.

   With no course, it shows only «كورس جديد».
6. **The shell.** `TABS` keeps four entries. The hash list drops `course` and `tasks`, so those addresses fall back to
   Today (the existing default). `SettingsView` gets `now`, `store`, `update`, `remove` and `actEdit`; `TodayView`
   stops taking `goTab`, since nothing in it opens a tab any more.
7. **CSS.** Remove the rules only the removed screens used: `.tasksv`, `.coursev`, `.filters`, the `.a-tasks` and
   `.a-appts` desktop grid. Keep `.weeks`, `.week`, `.mod`, `.chips`, `.appt` and `.titem`, now used by the moved parts.
   With four tabs, the band's buttons get wider; check the 375 px fit.

## Design

- **`src/app/14-tasks-view.js`**: `TasksView` split into `DayTasks` and `WeeklyAppts`.
- **`src/app/12-course-view.js`**: `CourseView` split into `CoursePlan` and `CoursesSection`.
- **`src/app/09-today.js`**: `TargetCard` as a panel with this week's modules and «الخطة كلها».
- **`src/app/10-postpone-ui.js`**: `TodayView` renders `<DayTasks>` in place of the inline section.
- **`src/app/15-settings-view.js`**: renders `<WeeklyAppts>` and `<CoursesSection>` after «جدولك».
- **`src/app/21-shell.js`**: four tabs, the hash list, the props.
- **`src/app/ORDER`**: the notes for files 12 and 14 (no file added or removed).
- **`src/planner.html`**: CSS removed and adjusted.
- **README**: the tabs and where tasks, appointments and courses now are.

### Tests

**`tests/e2e/fewer-tabs.spec.js`** checks:
- **The band**: four tabs, in order; `#tasks` and `#course` open Today.
- **Tasks in Today**:
  - with no task, the section shows with both buttons;
  - add a task with a date and one without;
  - paste tasks;
  - edit, tick, untick from «خلصت», and delete.
- **Appointments in Settings**: add, edit, delete, and the appointment shows inside its day.
- **The course**:
  - tick and untick a module on the card, with the count following;
  - open «الخطة كلها» and tick there;
  - add a course in Settings, make it main, see the card follow, and delete it.
- **Phone width**: at 375 px nothing scrolls sideways on Today and Settings.

**Moved tests**:
- `course.spec.js` goes through Settings and the card.
- `day.spec.js` visits four tabs.
- `task-postpone.spec.js` postpones from Today.

**Parity**: 0 on the example and on a private settings file.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | `DayTasks` in Today; `WeeklyAppts` in Settings | US1, US2 | Every check; parity 0 |
| 2 | `TargetCard` with modules and `CoursePlan`; `CoursesSection` in Settings | US3 | Every check; parity 0 |
| 3 | Four tabs, hash fallback; remove `TasksView`, `CourseView` and their CSS | all | Every check; 375 px look |
| 4 | E2E (new and moved), README, ticks, PR | all | All checks; full E2E; `check-private` clean |

Phases 1 and 2 add the new places while the old tabs still exist, so each phase can be checked on its own. Phase 3
removes the old ones in one step.

## Risks

- **Today gets long** with many undated tasks: the undated list stays open and the finished list stays closed. If it is
  too long on the phone, a later change can fold «من غير ميعاد» too.
- **A module in two places**: this week's modules show on the card and again in «الخطة كلها». Both read the same mark
  and call the same `toggleModule`, so they cannot disagree; E2E ticks in one and checks the other.
- **Settings grows**: two sections. `15-settings-view.js` stays under 600 lines, since the sections live in their own
  files (12, 14).
