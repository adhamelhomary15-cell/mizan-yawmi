# Research: Postpone What Was Not Done

## R1. Which kinds move, and which kind is free: flags on the kind

- **Decision**: In `categories`, a kind may carry `"postpone": true` and `"free": true`. The validator checks
  that each is a boolean, like `track`. The example sets `postpone` on `study`, `course` and `quran`, and
  `free` on `personal`.
- **Rationale**:
  - Kind ids are fixed (`CATEGORY_IDS`), and the settings already describe each kind, so this is where such a
    property belongs.
  - The public app stays general (Principle VI).
  - Older builds ignore unknown keys on a kind, so a file with the flags still imports there; it just shows no
    «أجّلها».
- **Alternatives**:
  - **A fixed list in the code**: it imposes one person's idea of what is movable.
  - **A top-level `postpone` list**: further from the kinds it describes.

## R2. Pure rules

- **Decision**: a marked block with:
  - `freeStretches(blocks, extras, isFree)`: merged `[start, end]` minute ranges covered by free-kind blocks,
    minus the ranges of every extra block.
  - `proposePlaces(items, startIso, dayAt, isFree, days = 7)`:
    - Items are `{len}` in the user's order; `dayAt(iso)` gives `{blocks, extras}`.
    - For each item in order, it picks the first date from `startIso`, and within it the earliest stretch
      where `len` fits.
    - It starts the item at the stretch's start, and treats that range as taken for the next items, so the
      items never overlap.
    - It returns `{iso, s, e}` per item, or `null` when nothing fits within `days`.
  - `checkManualPlace(blocks, extras, s, len)`: refuses a range that overlaps any tracked block or any extra,
    or that runs past the day's end. Returns `{ok}` or `{ok: false, error}` in Arabic.
- **Rationale**: same pattern as the other rule blocks; testable in Node with an oracle (a minute-by-minute
  occupancy grid).
- **Alternatives**: computing inside the Review component (untestable without a browser).

## R3. Moved status

- **Decision**:
  - Storage: `checks[iso][key] = {moved: 'YYYY-MM-DD'}`.
  - `statusOf` returns `'moved'` for an object with a valid `moved` date.
  - `setStatus` keeps its two values; the move is written only by the postpone action.
  - `dayCounts` excludes moved blocks from `total` and reports `moved`. `balanceOf` and the week view skip
    them, like `skip`, without adding them to the cancelled minutes.
  - The Today row shows «اتأجل لـ <اليوم>», with the same quiet style as a skipped row.
- **Rationale**:
  - FR-008: the planned time counts once, on the new day.
  - Older builds read the object as "open". Nothing breaks, and the extra still appears on the new day.
- **Alternatives**:
  - **A string `'moved:2026-10-15'`**: works, but an object is clearer and leaves room for more fields.
  - **Deleting the original block for the day**: hides the history.

## R4. Extra block fields

- **Decision**: an extra may carry `from` (ISO date) and `subj` (a subject id). `normalize` already keeps unknown
  fields on extras, and they are now read:
  - `detail` becomes «اتأجلت من <التاريخ>» when `from` is set;
  - `subj` is passed through, so the week's per-subject totals count it.

  Postponing an extra again copies its `from`, so the first planned date is kept (US1 scenario 4).
- **Rationale**: it reuses the existing one-off block mechanism. Backups carry it unchanged (FR-011).

## R5. Review UI

- **Decision**:
  - Each open postponable block in the review gets «أجّلها». Tapping it opens, under the row:
    - the line «هتتحط <اليوم> من <s> لحد <e>»;
    - «تمام» (confirm), «غيّر» and «لأ».
  - «غيّر» shows a select of the next 14 dates and a time input. The choice is checked with
    `checkManualPlace`, and its error shows inline.
  - When nothing fits, the line reads «مفيش وقت فاضي يسعها في الأسبوع الجاي، اختار يوم وميعاد», and the picker
    opens.
  - «أجّل اللي فاضل كله» shows the list of proposals, with one «تمام».
  - Tasks due that day are listed with «أجّلها», which moves the due date to the next day.
  - All writes go through `act`, which snapshots the store, so there is one undo for a single item or a batch.
- **Rationale**: FR-001 to FR-009 and SC-001 (2 taps). It reuses existing patterns (inline confirm, toast undo).

## R6. Start date and limits

- **Decision**: proposals start at the later of the day after the reviewed day and today, and look 7 days
  ahead. The manual picker offers 14.
- **Rationale**: the spec's edge cases (reviewing a past day) and assumptions.
