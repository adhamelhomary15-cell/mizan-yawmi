# Feature Specification: Postpone a Task from Anywhere

**Feature Branch**: `028-postpone-a-task`

**Created**: 2026-10-30

**Status**: Draft

**Input**: The owner postpones tasks every day and found it missing (2026-10-30). Today an open task (مهمة) can be
postponed only when it is overdue, and only from Today's task list; a task due today has no «أجّلها», and the Tasks tab
has none at all, so the only way is the pencil and a new date. The owner's choice: **one tap moves it to the next day**,
with an undo, as overdue tasks already work.

## Background

A task has a text, a type and an optional date (`due`). Open tasks show in three places:

- **Today**, in «مهام النهارده» (or «مهام اليوم ده» on another day): the tasks due that day, and on today also the overdue
  ones. Only an overdue task has «أجّلها» there, and it goes to tomorrow (feature 019).
- **The day review** («راجع يومك»): the tasks due that day, each with «أجّلها», which moves it to the day after the
  reviewed one, never to a day already past (feature 009). This stays as it is.
- **The Tasks tab**: every open task, earliest date first, with a pencil and «امسح». No «أجّلها».

The question about ended days («فيه N حاجات ماتعملتش امبارح», feature 015) also moves tasks, to today; it stays as it is.

Every postpone goes through the app's undo: a message «اتأجلت المهمة لـ …» with «رجّعها».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Postpone a task from Today (Priority: P1)

On Today, every open task in the day's list has «أجّلها». One tap moves it to the next day and says so, with an undo.

**Why this priority**: This is where the owner meets the day's tasks every day, and where a task due today could not
be postponed at all.

**Independent Test**: With a task due today, open Today and tap its «أجّلها»: it leaves today's list, the message says
it went to tomorrow, and «رجّعها» brings it back as it was.

**Acceptance Scenarios**:

1. **Given** a task due today, **When** the user taps «أجّلها» on Today, **Then** its date becomes tomorrow, it leaves
   today's list, and the message «اتأجلت المهمة لـ <tomorrow>» shows with «رجّعها».
2. **Given** an overdue task, **When** the user taps «أجّلها» on Today, **Then** it goes to tomorrow, as today.
3. **Given** the user just postponed a task, **When** they tap «رجّعها», **Then** the task has its old date again and is
   back in the list.
4. **Given** Today shows another day (a future day picked in the day strip), **When** the user postpones a task due that
   day, **Then** it goes to the day after that day.

---

### User Story 2 - Postpone a task from the Tasks tab (Priority: P2)

In the Tasks tab, every open task with a date has «أجّلها» next to the pencil, with the same rule and the same undo.

**Why this priority**: The Tasks tab is where all tasks are seen together, including those not due today; postponing
there saves opening the pencil and picking a date.

**Independent Test**: In the Tasks tab, tap «أجّلها» on a task due in three days: its date becomes the day after, the
list order follows, and «رجّعها» puts it back.

**Acceptance Scenarios**:

1. **Given** an open task due today or overdue, **When** the user taps «أجّلها» in the Tasks tab, **Then** its date
   becomes tomorrow.
2. **Given** an open task due on a later day, **When** the user taps «أجّلها», **Then** its date becomes the day after
   that date, and the list stays ordered by date.
3. **Given** a task with no date, or a done task, **When** the user looks at it, **Then** it has no «أجّلها».
4. **Given** the user taps «أجّلها» twice on the same task, **When** they look, **Then** it moved one day each time.

---

### Edge Cases

- **The rule in one line**: a postponed task goes to the day after its date, and never earlier than tomorrow. So a task
  due today or overdue goes to tomorrow, and a task due on a later day goes one day later.
- **The day's end** (feature 018): "today" and "tomorrow" are the app's days, so at 00:30 with the day ending at 01:00,
  tomorrow is the day after the day still in progress.
- **A task being edited**: while its pencil form is open, the task shows the form only, so it has no «أجّلها».
- **The day review and the ended-days question** keep their own rules and buttons (above).
- **Nothing else changes**: postponing never marks a task done, never changes its text or type, and never moves a block.
- **Several quick taps on different tasks**: each is its own change with its own undo message; the last message's
  «رجّعها» undoes the last one.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every open task with a date in Today's task list MUST have «أجّلها», whether it is due that day or overdue.
- **FR-002**: Every open task with a date in the Tasks tab MUST have «أجّلها». A task with no date, a done task and a task
  being edited MUST NOT have it.
- **FR-003**: «أجّلها» MUST move the task's date to the day after its date, and never to a day earlier than tomorrow,
  in one tap with no further question.
- **FR-004**: After a postpone, the app MUST show «اتأجلت المهمة لـ <day>», naming the day, with «رجّعها», which puts the
  date back exactly as it was.
- **FR-005**: Postponing MUST change only the task's date: never its done state, text or type, and nothing else in the
  day.
- **FR-006**: The day review and the ended-days question MUST send items where they did before. A single task's
  «رجّعها» MUST undo that task's date only, everywhere, so a block ticked in the meantime stays ticked.
- **FR-007**: «أجّلها» MUST be reachable by keyboard and name its task for screen readers (for example «أجّل: <text>»).

## Success Criteria *(mandatory)*

- **SC-001**: Any open, dated task can be postponed with one tap from Today and from the Tasks tab, in 100% of tested
  cases.
- **SC-002**: After a postpone and its undo, the stored tasks are byte for byte as before, in 100% of tested cases.
- **SC-003**: No postpone marks a task done or changes anything but its date (0 cases in tests).
- **SC-004**: Parity 0: day plans are the same as before this feature.

## Assumptions

- "Next day" for a task due on a later day means the day after its own date, not tomorrow, so «أجّلها» never moves a
  task earlier.
- An undated task has no day to move from, so it gets no «أجّلها»; giving it a date stays the pencil's job.
- The button's place and look follow the existing task rows (a small button like the overdue one on Today, next to the
  pencil in the Tasks tab); the plan settles the details.
- Weekly appointments («مواعيد كل أسبوع») are not tasks and are out of scope.
