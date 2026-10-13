# Quickstart: validate Paste Tasks from Any AI

Format and screens: [contracts/paste-format.md](contracts/paste-format.md). Data rules:
[data-model.md](data-model.md).

## Prerequisites

- Branch `005-paste-ai-tasks`, built with `PYTHONUTF8=1 python tools/build.py` (then `git checkout` the icon
  files if Pillow re-rendered them).
- A local static server on the repository folder and a 375 px wide viewport.
- The example settings. The made-up AI answers below stand in for a real AI, so no account is needed.

## 1. Script checks (no browser)

```bash
node tools/check-paste.js
node tools/check-paste.js --self-test
node tools/check-edit.js
node tools/check-settings.js --self-test
node tools/check-anchors.js --require-fit
node tools/check-private.js
```

Expected: all pass. `check-paste.js` covers FR-003 to FR-012 and SC-002 to SC-004 over many generated
inputs.

## 2. Copy the instruction (US1)

1. Open the Tasks tab, tap «الصق مهام من AI». The instruction text is shown with the example types and
   today's date; «انسخ التعليمات» copies it (or the box can be selected by hand).
2. Paste it into any AI chat with a made-up big task and check that the AI answers in the format. If you
   have no AI at hand, skip to step 3 with the made-up answers.

## 3. Paste and preview (US1, US2)

Paste this made-up answer, then «افحص»:

````text
Here are your tasks:
```
1. uni | Read chapter one | 2026-10-20
- work | Review the draft
personal | Plan the weekend |
* course | Watch lesson two | 2026-13-40
unknown | Do something | 2026-10-21
| Missing type |
no separator here
work | Text with | too | many separators
```
````

Expected preview:
- Proposed: «Read chapter one» (uni, 2026-10-20), «Review the draft» (work, no date), «Plan the weekend»
  (personal, no date), «Do something» with the type picker empty and unchecked, and «Missing type» with the
  type picker empty and unchecked.
- Rejected, each with its line number and reason: the greeting (`no-separator`), «Watch lesson two»
  (`bad-date`), «no separator here» (`no-separator`), the last line (`too-many-separators`).
- The count line says 5 tasks in the preview (3 can be added now) and 4 lines not understood.

## 4. Choose and confirm (US1, FR-006, FR-008)

1. Pick a type for «Do something», leave «Missing type» unpicked, tap «ضيف N مهمة».
2. Expected: the area closes, the tasks appear in the list as open, the toast says how many were added, and
   no task is ticked. Cancelling instead (separate run) adds nothing.

## 5. Undo is exact (US3, FR-009)

1. Right after adding, tick one older task, then tap «رجّعها». Expected: the added tasks disappear, the older
   task is still ticked.
2. Repeat, but also tick one of the added tasks before undoing. Expected: that ticked task stays (it is the
   user's now) and the other added tasks go. (Editing a task replaces the undo message with the edit's own, so a
   tick is how a batch task is changed while the batch undo is still on screen.)

## 6. Limits and duplicates (US3, FR-010, FR-011)

- Paste 60 valid lines: 50 are previewed and the note says 10 were left out.
- Paste a line equal to an existing task and the same line twice: both are marked «ممكن يكون مكرر» and are
  unchecked.
- Paste an over-long line (150 characters): it is rejected with its length; the other lines are unaffected.

## 7. Session draft and stale preview

Type text in the paste box, switch to another tab and back: the text is still there. Close the app and open
it again: it is gone. Edit the text after «افحص»: the preview disappears until «افحص» is pressed again.

## 8. Layout, keyboard, offline, privacy

- 375 px: no horizontal scroll in the paste area, the preview, or the rejected list.
- Keyboard only: open the area, Tab through the controls, Escape closes it, focus returns to the opening
  button.
- Airplane mode and the network panel: everything above works; 0 requests.
- `node tools/check-private.js` is clean; `git diff main` shows no write to `checks`, `modules` or `done`
  beyond `done: false` on new tasks.
