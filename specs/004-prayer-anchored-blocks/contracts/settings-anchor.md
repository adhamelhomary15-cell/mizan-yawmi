# Contract: anchors in the settings file, and what the user sees

Extends [the settings-file contract of feature 002](../../002-separate-personal-settings/contracts/settings-file.md).
All example values below are generic.

## Settings file

A block may carry a sixth element:

```json
["16:30", "exercise", "Workout", "", "", { "prayer": "maghrib", "dir": "before", "min": 30 }]
```

Reads as: this block starts 30 minutes before Maghrib each day; if prayer times are unavailable it starts at
16:30 (its fixed time). Detail and subject use `""` when unused.

| Field | Allowed | Notes |
|---|---|---|
| `prayer` | `fajr`, `dhuhr`, `asr`, `maghrib`, `isha` | sunrise is not available |
| `dir` | `before`, `after` | |
| `min` | integer 0 to 180 | |

### Import rules (added)

| Case | Result |
|---|---|
| Block of 2 to 5 items | valid, as before |
| Block of 6 items, sixth is a valid anchor | valid, counted as anchored |
| Sixth element not an object, unknown prayer, unknown direction, `min` not an integer 0 to 180, extra keys | rejected; message names the day, version, block and field |
| Anchored block is the first or the last block of its list | rejected; message names the day and block |
| More than 6 items | rejected, as before (the old message lists the extra element) |

A rejected file never changes stored settings or progress. The import summary gains: `N بلوك مربوط بالصلاة`
(N anchored blocks) when N is more than 0.

## What the user sees

- The block shows at the computed time in Today, now/next, Week bars and totals, like any block.
- Under the day's note, one short line only when needed:
  - `'unavailable'`: «أوقات الصلاة مش متاحة، فالبلوكات المربوطة بالصلاة على مواعيدها الثابتة.»
  - `'nofit'`: «اليوم ده مش بيسع ربط البلوكات بالصلاة، فهي على مواعيدها الثابتة.»
- No new control, no new colour, no new component: the line uses the style of the existing day note.
- Ticks (done state) attach to the block's key (fixed start plus category), so they never move or reset
  when the anchor applies, falls back, or a prayer time changes.

## Guarantees (testable)

1. A file with no anchors produces identical plans to the build before this feature, for every date.
2. For an anchored day that fits, the first start and the last end are the same as without anchors.
3. Only the block before each anchored block and the last block change length; no block is under 15 minutes.
4. With prayer times unavailable or the day not fitting, every block is at its fixed time.
5. No network request, no stored data changed, no done state written or cleared.
