# Data Model: Choose Which Block Absorbs a Prayer Shift

No stored data changes. The settings file gains one optional key, and the day layout gains one rule.

## Anchor (sixth element of a block), extended

| Field | Rule |
|---|---|
| `prayer` | from 004: `fajr`, `dhuhr`, `asr`, `maghrib`, `isha` |
| `dir` | from 004: `before`, `after` |
| `min` | from 004: whole number 0 to 180 |
| `absorb` | **new, optional**: `HH:MM`, equal to the fixed start of a block after this one in the same list and before the next anchored block (any later block, including the last, when no anchor follows) |

## Derived layout for one day (never stored)

For a day's list with fixed starts `f[0..n-1]`, the day end `END`, and the computed anchored starts:

- `delta` starts at 0.
- At an anchored block `i`: start `s[i]` = the prayer time ± `min`, rounded to 5 minutes; `delta = s[i] - f[i]`;
  if it has `absorb`, `stop = j`, where `f[j]` equals `absorb`.
- At any other block `k`: `s[k] = f[k] + delta`. If `k === stop`, then `delta = 0` after it.
- End of block `k` = `s[k+1]`, or `END` for the last block.

**Absorbing set**: the block before each anchor, each named block, and the last block. These are the only
blocks whose length may change. Each must be at least `min(15, fixed length)`, or the whole day uses fixed
times with notice `nofit`. Prayer times unavailable gives fixed times with notice `unavailable`, unchanged
from 004.

**Key**: `f[k] + '-' + category`, unchanged from 004, so ticks never move.

## Import summary (derived)

`anchored` (from 004) and `absorbing`: the number of anchors that carry `absorb`.
