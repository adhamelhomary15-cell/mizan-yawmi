# Data Model: Blocks Anchored to a Prayer Time

Stored data changes: **none**. Progress keeps its key and shape; the only new thing is an optional element
in the settings file. Rules and the example are in [contracts/settings-anchor.md](contracts/settings-anchor.md).

## Anchor (new, optional, inside a settings block)

The sixth element of a block tuple: `[start, category, title, detail, subject, anchor]`.

| Field | Type | Rule |
|---|---|---|
| `prayer` | string | one of `fajr`, `dhuhr`, `asr`, `maghrib`, `isha` |
| `dir` | string | `before` or `after` |
| `min` | integer | 0 to 180 |

The block's own `start` stays required and is the fixed time used for the fallback (FR-004).

### Structural rules (checked at import, per day and per version list)

- An anchored block is not the first and not the last block of its list (it needs an absorbing block before
  and the last block after).
- Anchors in one list keep the fixed order: the anchored blocks' fixed starts are already ascending, so no
  separate ordering rule is needed. Two anchors may not reference the same block (an element is one object).
- Unknown keys inside the anchor object are an error naming the path.

## Day layout (computed, never stored)

Input: one list of blocks (A or B version, chosen by the existing rule), the date, the prayer times for the
date (or none).

Output: `{blocks, notice}`.

| Field | Meaning |
|---|---|
| `blocks[i].s`, `.e` | start and end minutes, same shape as today's `blocksFor` result |
| `blocks[i].key` | unchanged: fixed start plus category (so ticks never move) |
| `notice` | `null`, `'unavailable'` (prayer times missing), or `'nofit'` (the day does not fit) |

### Layout rule (one pass)

1. If the list has no anchors: return today's layout, `notice = null`.
2. If prayer times are unavailable for the date, or any anchored prayer is not a finite number: fixed times
   everywhere, `notice = 'unavailable'`.
3. Otherwise, for each anchored block: `computed = round5(prayerMinute + sign * min)` (add 1440 when below
   `START`), `delta = computed - fixedStart`.
4. Walk the list carrying `delta` (0 before the first anchor): an anchored block starts at `computed` and
   sets the carried `delta`; any other block starts at `fixedStart + delta`.
5. Each block ends where the next starts; the last block ends at `END`.
6. Fit check: every block before an anchored block and the last block must be at least 15 minutes long.
   If not, discard the result: fixed times everywhere, `notice = 'nofit'`.

Lengths change only for the block before each anchored block and for the last block.

## State transitions

None stored. For a given date and settings the layout is a pure function of the prayer times; changing
location, method, or date changes the output on the next render.
