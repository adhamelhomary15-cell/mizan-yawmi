# Data Model: Edit Tasks and Weekly Appointments

No new stored fields and no storage migration. Records live in the progress object under
`fall26-planner-v1` (`tasks[]`, `appts[]`), unchanged in shape.

## Task (existing)

| Field | Type | Edit changes it? | Rule |
|---|---|---|---|
| id | string | never | identity |
| text | string | yes | required after trim; at most 140 characters |
| tag | string | yes | a key of `TASK_TAGS` |
| due | string | yes | `YYYY-MM-DD` or `''` (no date) |
| done | boolean | **never** | only the check control changes it (Principle II) |
| created | string (ISO date) | never | creation date |

## Weekly appointment (existing)

| Field | Type | Edit changes it? | Rule |
|---|---|---|---|
| id | string | never | identity |
| label | string | yes | required after trim; at most 60 characters |
| day | number 0..6 | yes | one of `WEEK_ORDER` |
| time | string `HH:MM` | yes | required |

## Edit session (UI state only, never stored)

| Field | Meaning |
|---|---|
| `editing` | `null`, or `{kind: 'task' \| 'appt', id}`; at most one at a time |
| form draft | the values typed in the open form; discarded on cancel, replace, or save |
| `before` | the record's old editable values, captured at save time for undo |

## Pure functions (in `src/planner.html`, covered by `tools/check-edit.js`)

- `validateTaskFields({text, tag, due}, tags)` returns `{ok, error?, value?}`; `value` is trimmed and cut to the
  limit. Error cases: empty text, tag not in `TASK_TAGS`, due not a real date.
- `validateApptFields({label, day, time}, days)` returns `{ok, error?, value?}`. Error cases: empty name, no
  time, day outside the week (`اختار اليوم.`).
- `applyEdit(list, id, patch, allowedKeys)` returns the list with only the record `id` changed, only for the allowed
  fields; any other key in `patch` is ignored; an unknown id returns the list unchanged.
- `restoreFields(list, id, before, allowedKeys)` is the undo: puts the old values back into the record `id` if it
  still exists; otherwise returns the list unchanged.

## State transitions

```text
closed --edit tap--> open(kind,id) --save valid--> closed (record changed, undo offered 7 s)
open --save invalid--> open (message shown, record unchanged)
open --cancel / Escape--> closed (record unchanged)
open --edit tap on another row--> open(other) (first draft dropped, record unchanged)
```

Done state is not part of any transition above.
