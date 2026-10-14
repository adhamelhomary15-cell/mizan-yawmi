# Research: Choose Which Block Absorbs a Prayer Shift

Decisions for feature 008. Each entry gives the decision, the rationale, and the alternatives considered.

## R1. Format: an `absorb` key on the anchor, naming the block by its fixed start

- **Decision**: The anchor object of feature 004 gains one optional key, `"absorb": "HH:MM"`. Its value is
  the fixed start time of the block that takes this anchor's shift:

  ```json
  ["16:30", "exercise", "Workout", "", "", {"prayer": "maghrib", "dir": "before", "min": 30, "absorb": "19:00"}]
  ```

- **Rationale**:
  - The sixth element keeps one meaning, "this block is anchored". So every place that reads `b[5]` today
    keeps working: the layout, the summary count, the dev checks, and parity.
  - Start times are already unique and ascending within a day, so they name a block without a new id.
  - An older copy of the app refuses the file with its existing "anchor has only prayer, dir and min"
    message, instead of misreading it.
- **Alternatives**:
  - **A mark on the absorbing block itself**, e.g. a sixth element `{"absorb": true}`. That would give the
    sixth element two meanings, and every reader of `b[5]` would have to tell them apart. It also needs extra
    rules for a mark with no anchor before it.
  - **An index number**: this breaks silently when a block is inserted.
  - **A day-level key**: it is far from the anchor it belongs to, and harder to read.

## R2. Validation

- **Decision**: In `checkBlocks`, the anchor's key check accepts `absorb` beside `prayer`, `dir` and `min`.
  When present, `absorb` must be:
  - a time in the `HH:MM` form already used for starts;
  - equal to the start of a block `j` in the same list, with `j` after the anchored block;
  - before the next anchored block. When there is no later anchor, any later block qualifies, including the
    last one.

  The messages, in the importer's style:
  - `absorb must be HH:MM`
  - `absorb must name the start of a later block on this day`
  - `absorb must name a block before the next block tied to a prayer`

  The path names the day, version and block (`week.6.blocks.A[9].anchor.absorb`). The settings format
  version stays 1: the key is optional, and older apps refuse it cleanly (R1).
- **Rationale**: FR-006. This reuses the error path 004 added. Naming the last block is allowed, and it is
  the same as today's default.
- **Alternatives**: a format version bump. It isn't needed, because old apps already refuse the file without
  harm, and a bump would make every existing file look old.

## R3. Layout rule

- **Decision**: In `layoutDay`, `delta` carries the current shift, as today. The algorithm:
  - At an anchored block with `absorb`, record the index `stop` of the named block.
  - Each later block starts at `fixed + delta`. At index `stop`, after its start is taken, `delta` is set
    back to 0. So the absorbing block ends at the next block's fixed start, and every block after it is at
    its fixed time.
  - The fit check adds the absorbing block to the set already checked (the block before each anchor and the
    last block). Its new length must be at least `min(15, its fixed length)`.
  - Keys still use the fixed start.
- **Rationale**: FR-002 to FR-005. It is the smallest change to a block that is already proven, and with no
  `absorb` key the code path is identical (FR-003, SC-006).
- **Alternatives**:
  - **Spreading the shift over several blocks**: it is harder to predict and needs more settings.
  - **Letting the absorbing block also move later blocks**: that is what 004 already does.

## R4. Import summary and example

- **Decision**:
  - `summaryOf` counts anchors that carry `absorb`. The settings import preview adds
    «· N بلوك بياخد فرق الصلاة» when N > 0.
  - The embedded example's anchored day (day 0) names its course block (`"19:00"`) as absorbing, and
    `settings.example.json` is regenerated from it with `check-settings.js --write-example`.
  - The worked example uses a study block before the anchor and a course block after it. That shows the
    user may pick a different kind; the per-kind totals then move by the shift, which the spec allows.
- **Rationale**: FR-007, and the same pattern 004 used.

## R5. Dev checks

- **Decision**:
  - **`tools/check-anchors.js`**:
    - Unit checks: a later shift and an earlier shift with an absorbing block; blocks after it at fixed
      times; equal and opposite length changes; the 15-minute rule on the absorbing block causing a fallback;
      two anchors, each with its own absorbing block; naming the last block equals today's behaviour.
    - An independent oracle, written differently from the app, compared on generated days.
    - Mutations: the shift does not stop; the absorbing block is left out of the fit check; the shift stops
      one block early.
    - The sweep's set of blocks allowed to change length includes absorbing blocks. Its "every other block
      keeps its length" check stays.
  - **`tools/check-settings.js`**: import cases for a valid name, a missing block, a block at or before the
    anchor, a block at or after the next anchor, and a bad time string. Each refusal leaves stored data
    unchanged.
- **Rationale**: FR-011, SC-001 to SC-005; the same discipline as 004 and 006.

## R6. The owner's own day (outside the repo)

- **Decision**: After the code ships, update `.private/settings.json`:
  - On gym days, in both versions, tie the gym to 30 minutes before Maghrib and name the evening work block
    as absorbing.
  - Tie the Friday recitation to Maghrib and the Wednesday recitation to Isha, each with an absorbing block
    the sweep shows fits.
  - Back the file up first. Validate it with `check-settings.js`, and sweep 2026 to 2028 with
    `check-anchors.js --settings .private/settings.json --require-fit`.
  - The owner re-imports the file on each device.
- **Rationale**: These are the owner's answers of 2026-10-14. A scratch run showed that, with the evening
  work absorbing the shift, the worst summer evening-work block is 30 minutes and the worst winter pre-gym
  work block is 55 minutes. Both are above the 15-minute minimum.
- **Not in the repo**: these values stay out of every tracked file (Principle VI).
