# Quickstart: validate Edit Tasks and Weekly Appointments

Rules and field limits: see [data-model.md](data-model.md). Visible behavior: see
[contracts/ui-contract.md](contracts/ui-contract.md).

## Prerequisites

- Branch `003-edit-tasks`, built with `PYTHONUTF8=1 python tools/build.py`, then `git checkout` the icon
  files if Pillow re-rendered them.
- Serve the folder locally (any static server) and open it at a 375 px wide viewport.
- Start from the example settings (or your own file) with a few tasks and two appointments added.

## 1. Script checks (no browser)

```bash
node tools/check-edit.js
node tools/check-settings.js --self-test
node tools/check-private.js
```

Expected: all three pass. `check-edit.js` covers FR-003/004/005/007/014 and SC-002/003/005 over many
generated inputs.

## 2. Task edit (US1, FR-001..006)

1. Add a task, tick it done, switch to the "خلصت" filter.
2. Tap `عدّل` on it. Expect the form in place of the row, filled with its text, type, date.
3. Change text and type, save. Expect the new values, still done, still in the "خلصت" list.
4. Repeat with an open task: expect it still open.
5. Open edit and press `إلغاء`, then open edit and press Escape. Expect no change both times.

## 3. Due date effects (US2, FR-008)

1. Edit a late task to a future date: expect the late marker gone and the new position.
2. Clear the date: expect it among the tasks without dates. Add a date back: expect it shown.

## 4. Mistakes and undo (US3, FR-007, FR-009)

1. Empty the text (and try spaces only) and save: expect `اكتب نص المهمة.` and no change.
2. Save a real change, tap `رجّعها` within 7 seconds: expect the old values.
3. **Done-state safety:** save a change, then tick any block or task, then tap `رجّعها`. Expect the old
   values back and the tick you just made still ticked.
4. Settings with a changed type list (or edit `tag` of a task through an import that removes that type):
   expect `اختار النوع` and a blocked save until chosen.

## 5. Appointment edit (US4, FR-013..015, SC-008)

1. Add an appointment for one day, then edit its day and time. Expect the list to show the new values,
   the old day to no longer show it, and the new day to show it at the new time (Today tab, open that
   day via `افتح اليوم`).
2. Empty name, or no time: expect the existing messages and no change. Cancel and undo behave as in 2 and 4.

## 6. One form at a time (FR-010, FR-015)

Open edit on one task, then tap `عدّل` on another task or an appointment: expect the first form gone
(unsaved) and the add forms closed.

## 7. Layout, keyboard, offline (FR-001, FR-012, SC-006, SC-007)

- 375 px: no horizontal scroll; the three appointment buttons wrap cleanly.
- Keyboard only: Tab to `عدّل`, Enter opens, focus lands on the first field, Escape closes, focus returns.
- Network panel (or airplane mode) while editing, saving and undoing: 0 requests.
- Reload after saving: the edit is still there. Installed copy with the network off: edit works.

## 8. Final checks

- `git diff main -- src/planner.html` shows no write to `checks`, `modules`, or `done` added by this
  feature (Principle II).
- `node tools/check-private.js` is clean before the commit.
