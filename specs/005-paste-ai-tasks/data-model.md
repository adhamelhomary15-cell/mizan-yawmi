# Data Model: Paste Tasks from Any AI in a Fixed Format

Stored data changes: **none**. Added tasks use the existing task shape; the pasted text and the preview live
in memory only. The format itself is in [contracts/paste-format.md](contracts/paste-format.md).

## Task (existing, unchanged)

`{id, text, tag, due, done, created}`: text up to 140 characters; `tag` a key of `TASK_TAGS`; `due` empty or
`YYYY-MM-DD`. Tasks from a paste get `done: false` and `created` = the day of adding.

## Pasted line (memory only)

| Field | Meaning |
|---|---|
| `n` | line number in the pasted text, 1-based, counting every line |
| `raw` | the line as pasted |

## Proposed task (memory only, in the preview)

| Field | Meaning |
|---|---|
| `n` | the line it came from |
| `text` | trimmed text, 1 to 140 characters |
| `tag` | a valid type id, or `''` while the user has not picked one (then not includable) |
| `due` | `''` or a real `YYYY-MM-DD` |
| `dupe` | `true` when it matches an existing task or an earlier line (R6) |
| `include` | whether the user will add it; default `true`, `false` for duplicates and for lines with no type yet |

## Rejected line (memory only)

| Field | Meaning |
|---|---|
| `n`, `raw` | as above |
| `reason` | one of the codes below, shown as a short Arabic message |

Reason codes: `no-separator`, `too-many-separators`, `empty-text`, `too-long` (with the length),
`bad-date`. A line with an unknown or missing type is **not** rejected; it becomes a proposed task with
`tag: ''` (R4).

## Parse result

`parseTaskLines(text, tags, existingTexts)` returns:

| Field | Meaning |
|---|---|
| `items` | proposed tasks, in line order |
| `rejected` | rejected lines, in line order |
| `skipped` | count of wrapping lines ignored (fences, blanks) |
| `leftOut` | number of candidate lines beyond the 50-line limit |

Rule: `items.length + rejected.length + leftOut` equals the number of candidate lines in the paste, so every
line is accounted for (SC-002).

## Batch (memory only, for undo)

The list of `{id, text, tag, due}` created by one confirmation. `undoBatch(list, batch)` removes a task only if
its `id` is in the batch, `done` is still `false`, and its `text`, `tag` and `due` equal the batch's values.

## State transitions

```text
closed --open paste area--> editing (draft kept in memory)
editing --check--> previewing (items, rejected)
previewing --edit the text, check again--> previewing (recomputed)
previewing --confirm--> closed (tasks added, undo offered 7 s, draft cleared)
previewing / editing --cancel or close--> closed (nothing added, draft kept for the session)
```

Done state is not part of any transition.
