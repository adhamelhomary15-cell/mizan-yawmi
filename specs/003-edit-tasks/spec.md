# Feature Specification: Edit Existing Tasks and Weekly Appointments

**Feature Branch**: `003-edit-tasks`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "ميزة تعديل المهام: المستخدم يقدر يعدّل مهمة موجودة في تاب المهام (النص، النوع، آخر ميعاد) بدل ما يمسحها ويكتبها من جديد، من غير ما حالة "خلصت" بتاعتها تتغير بالغلط، وبنفس شكل اضافة المهمة."

## Clarifications

### Session 2026-10-13

- Q: Should the weekly fixed appointments on the Tasks tab also become editable, or only tasks? → A: Both. Appointments (name, day, time) are editable in this feature too, with the same pattern as tasks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fix a task without deleting and retyping it (Priority: P1)

A user added a task and later wants to change it: reword it, change its type, or move its due date.
Today the only way is to delete the task and add a new one, which loses its done state and its
creation date. The user taps an edit control on the task, sees the same form used for adding a task
already filled with the task's current text, type, and due date, changes what they want, and saves.
The task keeps its identity: it is still open (or still done), exactly as before.

**Why this priority**: This is the whole feature, and the most common reason to edit is a typo or a
changed deadline.

**Independent Test**: Add a task, tap edit, change the text and the due date, save. The task shows the
new text and date, keeps its position in the list according to the new date, and its done state is the
same as before the edit.

**Acceptance Scenarios**:

1. **Given** an open task, **When** the user opens edit, **Then** a form with the same fields as adding
   a task appears, filled with the task's current text, type, and due date.
2. **Given** the edit form, **When** the user changes any field and saves, **Then** the task shows the new
   values and nothing else about it changes.
3. **Given** an open task, **When** it is edited and saved, **Then** it is still open and is not marked
   done.
4. **Given** a completed task, **When** it is edited and saved, **Then** it is still completed.
5. **Given** the edit form, **When** the user cancels, **Then** the task is unchanged and the form closes.

---

### User Story 2 - Change or remove the due date and see the effect at once (Priority: P2)

The user changes a task's due date, or clears it so the task has no deadline. The list order and the
"late" marker follow the new date immediately.

**Why this priority**: Deadlines change often, and the list order and the late marker are what users
act on.

**Independent Test**: Edit a task that is marked late to a future date: the late marker disappears and
the task moves to its new place. Clear the date: the task moves to the group without dates.

**Acceptance Scenarios**:

1. **Given** a task marked late, **When** its due date is moved to a future date, **Then** it is no longer
   marked late and appears in its new position.
2. **Given** a task with a due date, **When** the date is cleared and saved, **Then** the task has no due
   date and appears among the tasks without dates.
3. **Given** a task without a date, **When** a date is added and saved, **Then** it appears with that date.

---

### User Story 3 - Mistakes are caught and reversible (Priority: P3)

If the user empties the text and tries to save, they get a clear message and the task stays as it was.
After a successful save, a short undo is available, like for other changes in the app.

**Why this priority**: Protects users from losing a task by accident.

**Independent Test**: Clear the text and save: a message appears and the task is unchanged. Change a
field, save, then undo within a few seconds: the task returns to its earlier values.

**Acceptance Scenarios**:

1. **Given** the edit form with the text emptied, **When** the user saves, **Then** a message says the text
   is needed and the task keeps its old values.
2. **Given** a saved edit, **When** the user taps undo within a few seconds, **Then** the task returns to
   its values from before the edit.

---

### User Story 4 - Edit a weekly fixed appointment (Priority: P2)

The same Tasks tab lists weekly fixed appointments (a name, a weekday, and a time). Today they can only
be added or deleted. The user taps edit on an appointment, sees the add-appointment form filled with its
name, day, and time, changes what they need, and saves. The appointment keeps appearing inside its day of
the schedule at its new time, and nothing else changes.

**Why this priority**: Weekly appointments move (a meeting changes day or time) as often as task deadlines.

**Independent Test**: Add an appointment on one day, edit it to another day and time: it disappears from
the old day, appears inside the new day at the new time, and the list on the Tasks tab shows the new values.

**Acceptance Scenarios**:

1. **Given** a weekly appointment, **When** the user opens edit, **Then** the add-appointment form appears
   filled with its current name, day, and time.
2. **Given** the edit form, **When** the user saves new values, **Then** the appointment shows them in the
   list and inside the matching day of the schedule.
3. **Given** the edit form, **When** the user cancels, **Then** the appointment is unchanged.
4. **Given** an empty name or no time, **When** the user saves, **Then** a message explains what is missing
   and the appointment is unchanged.
5. **Given** a saved appointment edit, **When** the user taps undo within a few seconds, **Then** the
   appointment returns to its earlier values.

---

### Edge Cases

- Text longer than the allowed length: the same limit as adding a task applies; the extra is cut or the
  user is told, exactly as in the add form.
- Text with only spaces: rejected as empty.
- Editing while the task is shown under the "done" filter: it stays in that list after saving.
- Opening edit on a second task while one is already being edited: the first form closes without saving.
- The task's type is no longer one of the available types (for example after the settings changed): the
  form shows the closest valid choice and the user must confirm it before saving.
- The device has no storage available: the edit works for the session and the app already warns that
  changes are not kept.
- Offline: editing works with no network.
- The same task is edited twice quickly: the last save wins and nothing is duplicated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every task in the Tasks list, open or done, MUST have an edit control that is reachable by
  keyboard and touch and labelled for screen readers.
- **FR-002**: Opening edit MUST show the same fields as adding a task (text, type, due date), filled with
  the task's current values.
- **FR-003**: The edit form MUST apply the same rules as adding: text is required after trimming spaces and
  has the same maximum length; type comes from the same list; the due date is optional.
- **FR-004**: Saving MUST change only the task's text, type, and due date, and MUST keep its done state and
  its creation date.
- **FR-005**: Editing MUST NOT mark a task done or not done in any case (constitution Principle II); only
  the existing check control does.
- **FR-006**: Cancelling MUST leave the task unchanged and close the form.
- **FR-007**: Saving with empty text MUST show a clear message and leave the task unchanged.
- **FR-008**: After saving, the list order and the late marker MUST reflect the new due date immediately.
- **FR-009**: After saving, the system MUST offer a short undo that restores the task's values from before
  the edit, consistent with other changes in the app.
- **FR-010**: Only one task MAY be in edit mode at a time; opening another closes the first without saving.
- **FR-011**: Edits MUST be stored on the device, work offline, and MUST NOT send any data off the device
  (constitution Principle III).
- **FR-012**: The edit form MUST be usable on a phone-width screen with the same look as the add form,
  using the existing design tokens.
- **FR-013**: Every weekly fixed appointment MUST have an edit control, reachable by keyboard and touch and
  labelled for screen readers, that opens the add-appointment form filled with its current name, day, and
  time.
- **FR-014**: Appointment edits MUST follow the add form's rules (name required after trimming spaces and
  within the same length limit, a time required, a day chosen from the week) and MUST keep the appointment's
  identity; saving MUST update the Tasks list and the matching day of the schedule at once.
- **FR-015**: Cancelling, rejecting an invalid appointment, undo after saving, and the one-form-at-a-time
  rule MUST behave as for tasks (FR-006, FR-007, FR-009, FR-010).

### Key Entities

- **Task**: text (required, limited length), type (from the available types), optional due date, done state,
  creation date, identity. Edit changes only text, type, and due date.
- **Weekly appointment**: name (required, limited length), weekday, time, identity. Edit changes name, day,
  and time.
- **Edit session**: the form for one task or appointment, with its starting values, so cancel and undo can
  restore them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can change a task's due date in under 10 seconds from opening the Tasks tab.
- **SC-002**: In 100% of edits, the task's done state and creation date are the same before and after.
- **SC-003**: In 100% of attempts to save empty or whitespace-only text, the task stays unchanged and a
  message is shown.
- **SC-004**: After an edit, the list order and late marker match the new due date in 100% of cases.
- **SC-005**: Undo restores the earlier values in 100% of cases within its available time.
- **SC-006**: Editing makes 0 network requests and works in airplane mode.
- **SC-007**: The edit forms (task and appointment) fit a 375-pixel-wide screen with no horizontal scroll.
- **SC-008**: After editing an appointment's day or time, it appears in the matching day of the schedule at
  the new time and no longer appears at the old one, in 100% of cases.

## Assumptions

- Tasks keep their current limits: text up to 140 characters, one type, and an optional due date.
- The edit control sits on each task row next to the existing check and delete controls.
- Undo uses the same short-lived undo message the app already shows for deletions.
- Weekly appointments keep their current fields: a name up to 60 characters, a weekday, and a time.
- Out of scope: editing several tasks at once, changing a task's done state from the edit form, recurring
  tasks, reminders, and syncing tasks between devices.
- Independent of feature 002; if both change the same view, whichever merges second adapts.
