# Research: Paste Tasks from Any AI in a Fixed Format

Grounded in `src/planner.html` on `main` at `ed109d4`. No NEEDS CLARIFICATION remained after the spec.

## R1. What already exists and is reused

- A task is `{id, text, tag, due, done, created}`; `TasksView` adds one by hand and shows the list
  (feature 003). The task rules live in the pure `validateTaskFields(f, tags)` in the marked "edit rules"
  block: text trimmed and cut to 140, `tag` a key of `TASK_TAGS`, `due` empty or a real `YYYY-MM-DD`.
- `TASK_TAGS` maps a type id to its label (`{uni: 'محاضرات', ...}`); ids are the fixed category ids
  (`uni`, `study`, `course`, `work`, `gym`, `quran`, `personal`, `move`, `rest`), so they are stable ASCII
  even when labels are Arabic or user-written (settings validator, `taskTags`).
- `actEdit(text, fn, undoFn)` shows the 7-second toast whose undo runs a record-only function (feature 003).
  This feature reuses it, so the undo never restores a whole snapshot (Principle II).
- The course form already reads a pasted list, one item per line, up to 60 lines. This feature follows the
  same habit (a textarea, one item per line), with a stricter format.

## R2. The fixed line format

Decision: one task per line, three fields separated by `|`:

```text
type | task text | due date
```

- `type` is a type id from the user's list (`uni`, `work`, ...). The parser also accepts the type's label,
  matched case-insensitively after trimming, because an AI may copy the label instead of the id.
- `task text` is plain text up to 140 characters and must not contain `|`.
- `due date` is `YYYY-MM-DD` or empty; the third field (and its separator) may be left out.

Why this shape: a pipe-separated line is easy for any AI to follow from two examples, easy to read by eye,
and needs no quoting rules. Putting the type first keeps the variable-length text in the middle, so the
optional date is always the last field. A line with more than two separators is rejected, never guessed
(the text would be ambiguous).

Alternatives rejected: JSON (AIs often break quoting and users cannot read it), Markdown bullets with
inline tags such as `[uni]` and `(due: ...)` (several valid shapes, so guessing), a table (needs a header and
alignment, long to type and fragile).

## R3. Harmless wrapping the parser tolerates

AI answers usually wrap the lines in a code fence or number them. The parser skips, without a message:

- blank lines and lines that are only a code fence (` ``` ` with an optional language word);
- a leading list marker: `-`, `*`, `•`, or a number followed by `.` or `)` (Arabic-Indic digits included).

Everything else that is not a valid line is reported with a reason (FR-004): no separator, empty text,
too many separators, text too long, unknown or missing type, impossible date. A greeting such as "Here are
the tasks:" is therefore listed as "not a task line", never added and never hidden. Rejected lines never
block valid ones.

## R4. Unknown type: the user picks, the app never guesses

Spec US2 scenario 2 and FR-007: a line with a type not in the user's list is flagged and added only once the
user picks a valid type for it in the preview. Decision: such a line appears in the preview with a type
selector showing an empty "اختار النوع" option, unchecked until a type is chosen. This mirrors the edit
form's rule for a removed type (feature 003, R5).

## R5. Too-long text: reported, not cut

The by-hand form cuts at 140 characters. For a paste the user cannot edit the text in the preview (out of
scope), so a cut would silently change the AI's wording. Decision: a line over 140 characters is rejected
with its length shown; the user shortens it in the paste box and checks again. The paste box stays
editable after a check, so fixing a line takes seconds.

## R6. Duplicates

A line is marked "ممكن يكون مكرر" when its text, trimmed, with spaces collapsed and compared without
regard to case, equals an existing task's text (open or done) or an earlier line of the same paste.
Decision: duplicates are shown in the preview, unchecked by default, so adding one is a deliberate tick and
nothing is dropped silently (FR-011).

## R7. Limits

At most 50 lines are read (spec assumption). Counting happens after wrapping lines are skipped, so a code
fence does not use up a slot. The paste box has a character limit of 20,000; the parser reads only the first
50 candidate lines and reports `N more lines were left out`. These limits keep a runaway paste from freezing
a phone.

## R8. Batch and undo (Principle II)

Confirming builds all new tasks in one `update`, with ids made at that moment, `done: false`, and
`created` set to the current ISO date. The toast text says how many were added. Undo (via `actEdit`) removes a
batch task only while it is still exactly as added (open, same text, type and date). A batch task the user has
since ticked or edited stays, because it is theirs now; every other record is untouched. A pure
`undoBatch(list, batch)` does this and is tested by a dev script.

## R9. The instruction text

Decision: the app builds the text from one pure `buildAiPrompt(tags, todayIso)`. It states the format, lists
the user's current types as `id (label)`, says today's date so the AI can turn "next week" into a real date,
asks for a single code block with only the lines, no numbering and no explanation, shows two example lines
using the user's first two types, and ends with a line where the user writes their big task. It is written
in Egyptian Arabic, like the rest of the UI, and asks the AI to write the task text in the same language as
the user's big task. The format keywords (`|`, the ids, the date shape) are language independent, so the text
works for any AI and any language.

Copy button: `navigator.clipboard.writeText` when available; otherwise the text sits in a read-only box that
the user can select and copy by hand. No other clipboard use exists in the app today; nothing is read from
the clipboard (the user pastes into the box themselves).

## R10. Where the paste draft lives

The Tasks tab unmounts when the user switches tab, which would lose the pasted text. Decision: keep the draft
text in a plain variable in the app's script scope (memory only). It survives tab switches in one session and
is gone when the app closes; nothing goes to `localStorage` (FR-012).

## R11. Testing without a framework

The parser, the instruction builder, and the batch undo are pure functions in a marked block of
`src/planner.html`; a dev-only `tools/check-paste.js` extracts them (with the edit-rules block they use) and
checks: every valid shape, every wrapping variant, every rejection reason, the limits, duplicates, that no
output task is ever done, that every input line is either proposed or rejected (SC-002), and that the undo
removes only untouched batch tasks. A mutation self-test proves the checks have teeth, as in features 003 and
004. Sample AI answers in the script are made-up and generic.

## R12. Independence

No change to the settings format, the storage shape, or other tabs. The new code sits beside `TasksView`.

## R13. Impossible dates (found while building Phase 2)

`validateTaskFields` (feature 003) checked a date with `Date.parse(due + 'T00:00:00Z')`. In Chrome that accepts
`2026-02-30` and rolls it over to March 2, so an impossible date passed. By hand the date input prevents it,
but an AI can write one, and the spec says a date that does not exist is flagged (US2). Decision: the rule now
checks that the year, month and day round-trip through `Date.UTC`, in the shared function, so adding by hand,
editing, and pasting all agree. `tools/check-edit.js` and `tools/check-paste.js` cover `2026-02-30`,
`2026-02-29`, `2026-04-31` (rejected) and `2028-02-29` (accepted).
