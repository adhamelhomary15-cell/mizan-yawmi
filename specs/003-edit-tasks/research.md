# Research: Edit Tasks and Weekly Appointments

All findings are grounded in `src/planner.html` on `003-edit-tasks` (merged with `main` at `06c514f`).
No NEEDS CLARIFICATION remained after the spec; the items below are design decisions the code forced.

## R1. Where the current code stands

- `TasksView` (`src/planner.html:1540`) holds the add forms as local state (`taskForm`, `apptForm`).
  A task is `{id, text, tag, due, done, created}` (`:1563`); an appointment is `{id, label, day, time}`
  (`:1557`). `normalize()` keeps `tasks` and `appts` arrays as they are (`:919`), so an edit that only
  changes fields needs no storage migration.
- Today's schedule reads appointments live from the store (`apptsFor`, `:856`, used at `:1237`), so
  changing `day` or `time` in the store moves the appointment inside the schedule with no extra code
  (SC-008).
- The late marker and the order are computed at render from `t.due` (`:1567`, `:1595`), so FR-008 comes
  free once `due` is stored.
- The "done" list is the last 20 in insertion order (`:1568`); editing does not change insertion order,
  so an edited done task stays where it was (spec edge case).

## R2. Undo must not restore the whole store

Decision: edits get their own undo that restores **only the edited record**.

The existing helper `act` (`:1753`) snapshots the whole store and its undo replaces the store with that
snapshot. For a deletion that is acceptable. For an edit it is not: if the owner ticks a block within
the 7 seconds before tapping undo, the whole-store restore would clear that tick. That is a path that
clears a done state without a deliberate tap on it, which Principle II forbids.

- Alternatives: reuse `act` as is (rejected: Principle II risk above); no undo (rejected: FR-009).
- Approach: a small variant that takes an `undo` function. Undo writes the old `text/tag/due` (or
  `label/day/time`) back into the record with the same id, and does nothing if the record is gone.
  The existing deletion undo is out of scope and is not changed (surface it as a suggestion).

## R3. Edit form placement

Decision: the edit form opens **inline, in place of the row** being edited, and uses one shared form
component with the add form (same fields, same limits, same classes).

- Rationale: the list can be long; opening a form at the top would scroll the user away from the row
  (FR-012, SC-001). One component means the add and edit rules cannot drift apart (FR-003, FR-014).
- Alternatives: reuse the top add form in "edit mode" (rejected: scroll jump, and the add form keeps
  its own draft); a modal dialog (rejected: new pattern, focus handling cost, not in `DESIGN.md`).

## R4. One form at a time

Decision: one `editing` state `{kind: 'task' | 'appt', id}` in `TasksView`. Opening edit replaces it
(the previous form is discarded unsaved). Opening an edit also closes the two add forms, so the screen
never has two open forms (FR-010, FR-015). Each form keeps its draft values inside the form component,
so replacing it discards them.

## R5. A type that no longer exists

Decision: if `tag` is not a key of `TASK_TAGS` (settings changed), the type select opens on an empty
"اختار النوع" option and saving is blocked with a message until a valid type is chosen.

- Rationale: the spec asks for the closest valid choice that the user confirms. With no way to rank
  "closest" between arbitrary labels, forcing an explicit choice is the honest version of that and
  needs no guessing.
- Alternatives: silently map to the first type (rejected: changes data without the owner noticing).

## R6. Empty text message

The add task form today returns silently on empty text (`:1562`). The spec requires a message on edit
(FR-007). Decision: the shared form shows an inline `form-err` message (same style as the appointment
form, `:1617`) for both add and edit, so the two forms behave the same. This is a small visible change
to the add form, listed in the UI contract.

## R7. Keyboard and screen readers

Decision: the edit button is a real `<button>` with `aria-label="عدّل " + text`. On open, focus moves to
the first field; Escape cancels; after save or cancel, focus returns to the edit button of that row (or
the row's container if the row moved). The error message uses `role="alert"` like the existing one.

## R8. Layout at 375 px

The task row is a 3-column grid (`.titem`, `:193`) and the appointment row is `minmax(0,1fr) auto auto`
(`.appt`, `:260`). Adding a button fits the task row; the appointment row would hold three buttons
(open day, edit, delete). Decision: put the buttons in a wrapping flex group so they drop under the text
when narrow. Verify at 375 px (SC-007).

## R9. How to test with no test framework

Decision: keep the edit rules as small **pure functions** in `src/planner.html` (apply a task edit,
apply an appointment edit, validate fields, build the undo patch), and add `tools/check-edit.js`, a
dev-only Node script that extracts and runs them, like `tools/check-settings.js` does. It checks that
`done`, `created`, `id`, and every other record are unchanged (SC-002, FR-005), plus validation and undo.

- Rationale: SC-002/003/005 are "100% of cases" claims; a script can check them over many inputs, a
  manual pass cannot. No new dependency and nothing ships to the user.
- Alternatives: manual quickstart only (rejected for the reason above); a test framework (rejected:
  Principle V, "no new build step or framework").

## R10. Independence from feature 002

Feature 002 is merged; `TasksView` was not changed by it except through the settings-derived
`TASK_TAGS`, which this plan uses. Nothing here touches settings, the example, or `tools/check-private.js`
rules. New copy is generic (no owner-specific values).
