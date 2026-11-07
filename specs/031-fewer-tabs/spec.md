# Feature Specification: Fewer Tabs (no Tasks tab, no Course tab)

**Feature Branch**: `031-fewer-tabs`

**Created**: 2026-10-31

**Status**: Draft

**Input**: The owner asked (2026-10-31) to remove tabs. The Tasks tab does not need to stand alone: tasks belong in
Today, added from a «+» there. On the Course tab, the owner asked for an opinion, then chose to remove it too. The
owner's choices:
- **Tasks tab**: removed. Tasks are added, seen, ticked, edited and pasted from Today.
- **Weekly appointments** (today in the Tasks tab): move to Settings, next to the schedule editor.
- **Course tab**: removed. Ticking modules moves to the target card in Today; adding, removing and choosing the main
  course move to Settings.

## Background

The navigation band has six tabs: اليوم، الأسبوع، الكورس، المهام، تمارين، الإعدادات (`src/app/21-shell.js:2`). After
this feature it has four: اليوم، الأسبوع، تمارين، الإعدادات.

Today's «+ ضيف حاجة لليوم ده» adds a timed block to the day (`src/app/10-postpone-ui.js:121`), not a task. Tasks are
other data (a text, a type, an optional due date, done or open). Today shows only the open tasks due that day, or late,
and only when there is at least one (`src/app/10-postpone-ui.js:161`). Everything else lives only in the Tasks tab
(`src/app/14-tasks-view.js:119`):
- adding a task, and editing one;
- tasks with no due date;
- «الصق مهام من AI» (feature 004);
- the list of finished tasks;
- the weekly appointments.

The Course tab (`src/app/12-course-view.js:45`) is the only place that:
- ticks a course module done;
- shows the plan week by week;
- adds a course, removes one, or makes one the main course.

Today's target card («التارجت الأساسي») opens it (`src/app/09-today.js:44`).

No stored data changes: tasks, appointments, courses and module marks keep their shape, so backups, sync and settings
files stay valid both ways.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tasks live in Today (Priority: P1)

The tasks section in Today is always there, even when empty. It has «+ مهمة» and «الصق مهام من AI». It shows the
day's tasks (due that day, or late on today, as now), then the tasks with no date under «من غير ميعاد», a closed
«باقي المهام» part with every other open dated task, and a closed «خلصت» part with the recent finished ones. Each task can be ticked, edited, postponed (if dated) and deleted, as in the
Tasks tab today.

**Why this priority**: It is the owner's request, and nothing the Tasks tab does may be lost.

**Independent Test**: With no Tasks tab, add a task with a date and one without, paste tasks, edit one, tick one,
delete one, all from Today.

**Acceptance Scenarios**:

1. **Given** no open task, **When** Today shows, **Then** the tasks section shows with «+ مهمة», «الصق مهام من AI» and
   an empty line.
2. **Given** a task due on another day, **When** Today shows, **Then** it is not in the day's list; it is under
   «باقي المهام», and in the day's list on its day.
3. **Given** a task with no date, **When** any day shows, **Then** it is under «من غير ميعاد».
4. **Given** a ticked task, **When** the user opens «خلصت», **Then** it is there and can be unticked.
5. **Given** the old address `#tasks`, **When** the app opens, **Then** it opens Today.
6. **Given** a day today or later, **When** the user opens «+ مهمة», **Then** the form's date is that day; on a past day
   it is empty.

---

### User Story 2 - Weekly appointments in Settings (Priority: P2)

The weekly appointments list, with add, edit and delete, moves to Settings next to the schedule editor. Appointments
still show inside their day, as now.

**Why this priority**: It keeps a Tasks-tab feature that does not belong to a single day.

**Independent Test**: Add, edit and delete an appointment from Settings, and see it inside its day in Today.

**Acceptance Scenarios**:

1. **Given** Settings, **When** the user adds an appointment for a weekday and time, **Then** it shows inside that day.
2. **Given** an appointment, **When** it is edited or deleted in Settings, **Then** its day follows.

---

### User Story 3 - The course without its tab (Priority: P2)

The target card in Today shows the main course's modules for the current week, each with its own checkbox, and a
«الخطة كلها» part that opens the whole plan week by week, with checkboxes. Settings gets a «الكورسات» part: add a
course, remove an added one, choose the main course, and open the plan of a course that is not main, with checkboxes.
When there is no course, the target card does not show, as now.

**Why this priority**: Ticking modules must stay possible by the user's own tap (Principle II); only the tab goes.

**Independent Test**: With a course, tick and untick a module from Today; add a course in Settings, make it main, and
see the target card follow; delete it.

**Acceptance Scenarios**:

1. **Given** a main course, **When** Today shows, **Then** the card shows the modules of the week containing the day
   shown, with checkboxes, and the count and bar follow each tap.
2. **Given** «الخطة كلها», **When** it opens, **Then** every week shows with its modules and checkboxes, the current week
   marked.
3. **Given** Settings, **When** the user adds a course or makes one main, **Then** the target card shows it.
4. **Given** the old address `#course`, **When** the app opens, **Then** it opens Today.

---

### Edge Cases

- **Many tasks with no date**: the section shows them all; Today's other parts stay reachable by scrolling.
- **A course from the settings file**: it cannot be deleted, as now; it can be made main or not.
- **A week with no modules, or a plan not started yet**: the card shows the next modules, as the card does now. After
  the plan's end with modules open, it shows the next modules too. The card says the course is done only when no module
  is open.
- **On the phone**: the tasks section comes after the timeline.
- **Another tab's address from an old link or a shortcut** (`#tasks`, `#course`): opens Today, with no error.
- **Ticking**: every checkbox changes a mark only on the user's tap. Nothing ticks, bulk-ticks or clears marks.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The navigation band MUST show four tabs: اليوم، الأسبوع، تمارين، الإعدادات.
- **FR-002**: Today MUST let the user add, paste, see, tick, untick, edit, postpone and delete tasks, including tasks
  with no date and finished ones.
- **FR-003**: Settings MUST let the user add, edit and delete weekly appointments.
- **FR-004**: Today's target card MUST let the user tick and untick the main course's modules, for the week of the day
  shown and for the whole plan.
- **FR-005**: Settings MUST let the user add a course, delete an added one, choose the main course, and tick and untick
  the modules of a course that is not main.
- **FR-006**: Stored data MUST NOT change shape; old backups, settings files and synced copies MUST load as now.
- **FR-007**: The addresses `#tasks` and `#course` MUST open Today.
- **FR-008**: No mark may change without the user's tap (Principle II).
- **FR-009**: Code that only the removed tabs used MUST be removed (no dead code).
- **FR-010**: Every open task MUST be in exactly one list of Today's tasks section, on every day.
- **FR-011**: A change touching a mark MUST be tested at phone size and offline (constitution, Development Workflow).

## Success Criteria *(mandatory)*

- **SC-001**: Every action of the old Tasks and Course tabs has a place, checked one by one by E2E.
- **SC-002**: Parity 0: day plans are the same.
- **SC-003**: Every check and self-test passes; the full E2E passes on Chromium and WebKit.
- **SC-004**: At 375 px, the four tabs fit and nothing scrolls sideways.
