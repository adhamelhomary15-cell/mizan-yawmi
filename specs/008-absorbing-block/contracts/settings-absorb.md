# Contract: naming the block that absorbs a prayer shift

Extends [the anchor contract of feature 004](../../004-prayer-anchored-blocks/contracts/settings-anchor.md).
All example values are generic.

## Settings file

An anchor may carry `absorb`, the fixed start of the block that takes its shift:

```json
["14:30", "study",    "Study", ""],
["16:30", "exercise", "Workout", "", "", {"prayer": "maghrib", "dir": "before", "min": 30, "absorb": "19:00"}],
["18:00", "rest",     "Dinner"],
["19:00", "course",   "Course"],
["21:00", "personal", "Free time"]
```

This reads: the workout starts 30 minutes before Maghrib. Dinner moves with it. The course block starts
when dinner ends and always ends at 21:00, its usual end, so free time is not touched.

## Import rules (added)

| Case | Result |
|---|---|
| No `absorb` | as in 004 |
| `absorb` names a later block before the next anchor (or any later block when none follows, the last included) | valid; counted in the summary |
| `absorb` is not `HH:MM` | refused: `absorb must be HH:MM` |
| `absorb` matches no start on this day, or a start at or before the anchored block | refused: `absorb must name the start of a later block on this day` |
| `absorb` names a block at or after the next anchored block | refused: `absorb must name a block before the next block tied to a prayer` |

Every message carries the path (day, version, block). A refused file changes neither the stored settings nor
the progress. The import preview gains «· N بلوك بياخد فرق الصلاة» when N > 0.

## What the user sees

- The blocks from the anchor to the absorbing block move together. The absorbing block is shorter or longer
  by the shift, and every block after it is at its usual time.
- The notes do not change. A day that cannot fit shows the existing 004 line,
  «اليوم ده مش بيسع ربط البلوكات بالصلاة، فهي على مواعيدها الثابتة.», with all blocks at their fixed times.
- No new control, colour or component.

## Guarantees (testable)

1. A file with no `absorb` produces identical plans to the build before this feature, for every date.
2. On a fitting day, the blocks after an absorbing block start at their fixed times.
3. Only the absorbing set changes length (the block before each anchor, each named block, and the last
   block). With one anchor and a named block, the two changes are equal and opposite, and the last block
   keeps its length.
4. No block in the absorbing set is under `min(15, its fixed length)`. Otherwise the whole day is at its
   fixed times.
5. Keys use the fixed start: no tick moves. No network request, and no stored data changed.
