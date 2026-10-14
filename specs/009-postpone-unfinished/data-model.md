# Data Model: Postpone What Was Not Done

## Settings: a kind (in `categories`), extended

| Field | Rule |
|---|---|
| `label`, `long`, `track` | unchanged |
| `postpone` | optional boolean; `true` means open blocks of this kind can be postponed |
| `free` | optional boolean; `true` means this kind's time can receive postponed items |

## Progress store, extended (shape unchanged)

| Place | Value | Meaning |
|---|---|---|
| `checks[iso][key]` | `true` | done (unchanged) |
| | `'skip'` | cancelled that day (unchanged) |
| | `{moved: 'YYYY-MM-DD'}` | **new**: postponed to that date |
| `extras[iso][]` | `{id, s, e, cat, title}` | one-off block (unchanged) |
| | `+ from: 'YYYY-MM-DD'` | **new, optional**: the date it was first planned for |
| | `+ subj: '<subject id>'` | **new, optional**: subject, for per-subject totals |
| `tasks[].due` | `'YYYY-MM-DD'` or `''` | unchanged; postponing a task sets it to the next day |

## Derived

- **Free stretches of a date**: the ranges of free-kind blocks on that date's layout (anchors applied), minus
  every extra block's range, merged and sorted.
- **Proposal**: `{iso, s, e}` per item, or `null`.

## State transitions (one block)

```text
open --«خلّصته»--> done
open --«اتلغى»--> skip
open --«أجّلها» + confirm--> moved(to date)   and   a new open extra on that date
moved --undo--> open (and the extra is removed)
```
