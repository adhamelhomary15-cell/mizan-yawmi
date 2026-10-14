---

description: "Task list for feature 008: choose which block absorbs a prayer shift"
---

# Tasks: Choose Which Block Absorbs a Prayer Shift

**Input**: Design documents from `specs/008-absorbing-block/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/settings-absorb.md](contracts/settings-absorb.md), [quickstart.md](quickstart.md)

**Tests**: Requested by the spec (FR-011) and the plan (R5). They go in the existing dev scripts
`tools/check-anchors.js` and `tools/check-settings.js`, with self-tests, and run in CI.

**Organization**: Plan phase 1 = Phase 3 here (US1), plan phase 2 = Phase 4 (US2), plan phase 3 = Phase 5,
and plan phase 4 = Phase 6 (the owner's private file, outside the repo).

**Cut point**: one PR after Phase 5. Phase 6 changes no tracked file.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (the named block takes the shift), US2 (naming it is checked at import)

## Binding rules for every task

- **No change without the key**: a file without `absorb` must lay out exactly as before (parity: 0
  differences).
- **Principle II**: keys keep the fixed start, and the layout never mentions done, checks or modules.
- **Principle VI**: generic values only in tracked files. Run `node tools/check-private.js` with the files
  staged before every commit, and **commit only if it prints `RESULT: clean`**.

---

## Phase 1: Setup

- [x] T001 Run and record the baseline in the Phase 3 commit message:
  - `check-anchors.js`, its `--self-test` and `--require-fit`;
  - `check-settings.js` and its `--self-test`;
  - `check-workout.js`, `check-backup.js`, `check-paste.js`, `check-edit.js`;
  - then save `git show main:src/planner.html` as the parity baseline outside the repo.

## Phase 2: Foundational

- [x] T002 Make a generic test settings file outside the repo: the example with one anchor and no `absorb`.
  Run `check-parity.js` against main with it, with and without `--no-adhan`. Expect 0 differences now; this
  is the guard for SC-006, and it must stay 0 after every phase.

---

## Phase 3: User Story 1 - The named block takes the shift (Priority: P1) 🎯 MVP

**Goal**: The shift from an anchor stops at the block its `absorb` names (data-model "Derived layout").

**Independent Test**: The unit checks below, plus quickstart sections 1 and 2.

- [x] T003 [US1] In `layoutDay` (between `// start of anchor layout` and `// end of anchor layout` in
  `src/planner.html`):
  - At an anchored block whose anchor has `absorb`, record `stop`: the index of the later block whose fixed
    start (`list[j][0]`) equals `absorb`.
  - For a non-anchored block `k`: start at `fixed[k] + delta`, then if `k === stop` set `delta = 0` and clear
    `stop`.
  - In the fit check, the absorbing set is: the block before each anchor, each `stop` block, and the last
    block. Each must keep at least `min(15, its fixed length)`.
  - Update the block's comment to describe the rule.
  - A name that matches no later block is treated as no name. The validator refuses such a file anyway; this
    keeps the layout total.
- [x] T004 [US1] In `tools/check-anchors.js`, add unit checks using the generic `day()`:
  - **Later shift**, with `absorb: '19:00'`: the study block (index 2) grows by the shift and the course block
    (index 5) shrinks by it. The free-time block starts at 21:00 and keeps its length. Dinner moves by the
    shift with its length unchanged.
  - **Earlier shift**: the opposite.
  - **The course block falls under 15 minutes**: `nofit`, with all blocks at fixed times.
  - **`absorb` names the last block**: the result equals the same day with no `absorb`.
  - **Two anchors, each with its own `absorb`**: the second anchor starts fresh; the blocks after each
    absorbing block are at fixed times.
  - **Keys**: still the fixed start, whatever the shift.
- [x] T005 [US1] In `tools/check-anchors.js`, add an independent oracle that lays out the same day differently:
  - Walk the segments between anchors.
  - Compute every block's end from the fixed ends.
  - Apply the shift only inside a segment up to its absorbing block.

  Compare it with `layoutDay` on 300 generated days: random block counts; one or two anchors; random
  `absorb` choices including none and the last block; and random prayer times. They must agree on starts,
  ends and notices.
- [x] T006 [US1] Update the year sweep in `tools/check-anchors.js`:
  - The absorbing set includes the blocks named by `absorb`.
  - The "only absorbing blocks change length" check uses that set.
  - The single-anchor balance check stays.
  - New check: every block after a named block starts at its fixed time on fitting days.
- [x] T007 [US1] Add `--self-test` mutations to `tools/check-anchors.js`:
  - the shift never stops (`delta` is not reset);
  - the named block is left out of the fit check;
  - the shift stops one block early.

  The unmodified source must still pass.
- [x] T008 [US1] Rebuild and run every check, then the parity of T002. Results:
  - **0 differences** for the no-`absorb` file, and for the current example, which has no `absorb` yet.
  - **Commit**: `feat(anchors): a named block takes the prayer shift (008, US1)`.

---

## Phase 4: User Story 2 - Naming the block is checked at import (Priority: P2)

**Goal**: The importer accepts only a valid `absorb`, and the summary and example show it.

**Independent Test**: [quickstart.md](quickstart.md) section 4.

- [x] T009 [US2] In `validateSettings` (`checkBlocks`) in `src/planner.html`:
  - Allow the `absorb` key in an anchor. The unknown-key message becomes
    'anchor has only prayer, dir, min and absorb'.
  - When `absorb` is present, check it in this order:
    - not `HH:MM` gives `absorb must be HH:MM`;
    - no block in this list starts at it, or the one that does is at or before the anchored block, gives
      `absorb must name the start of a later block on this day`;
    - the block is at or after the next anchored block in the list gives
      `absorb must name a block before the next block tied to a prayer`.
  - Each message uses the path `<day path>[i].anchor.absorb`.
- [x] T010 [US2] In `summaryOf`, add `absorbing`: the number of anchors carrying `absorb`. In the settings import
  preview, after the anchored count, add «· N بلوك بياخد فرق الصلاة» when N > 0.
- [x] T011 [US2] In the embedded example (`<script id="example-settings">`), give the day-0 workout anchor
  `"absorb": "19:00"` (the course block). Regenerate `settings.example.json` with
  `node tools/check-settings.js --write-example`, and check that `check-anchors.js --require-fit` still fits
  every date for 2026 to 2028.
- [x] T012 [US2] In `tools/check-settings.js`, add import cases built from the example:
  - a valid `absorb` is accepted;
  - a time that matches no block is refused with the second message;
  - a time at the anchored block's own start is refused with the second message;
  - on a generic day with two anchors, the first naming a block after the second is refused with the third
    message;
  - `"7pm"` is refused with the first message;
  - an extra unknown key still gets the unknown-key message.

  Add self-test mutations that drop each rule.
- [x] T013 [US2] Run quickstart section 4 in the browser at 375 px. Each bad file shows its message, and the
  stored settings key is byte-identical before and after. The valid file shows the new summary text. **Commit**:
  `feat(anchors): check and count the absorbing block at import (008, US2)`.

---

## Phase 5: Polish

- [x] T014 [P] In `README.md`, add a few lines after the anchored-block paragraph: what `absorb` does, with the
  generic example, and that only the anchor's block and the named block change length. In `PRODUCT.md`, extend
  the anchor sentence by a clause.
- [x] T015 Run quickstart section 3 in the browser at 375 px. On a summer date and a winter date on the
  example's day 0:
  - the course block changes by the shift and ends at 21:00;
  - free time is unchanged;
  - Week agrees with Today.
- [x] T016 Rebuild and run every check and both parity runs (0 differences for the no-`absorb` file). Search
  the diff: no `checks`, `modules` or `.done` in the layout block, and no network call. **Commit**:
  `docs(anchors): document the absorbing block (008)`.
- [ ] T017 Tick the tasks here. Show the owner the diff, and wait for explicit approval before any push or PR
  (AGENTS.md rule 5).

---

## Phase 6: The owner's own day (outside the repo, after the PR is merged)

- [ ] T018 Back up `.private/settings.json` to `C:\Users\User\Documents\mizan-private-backup\`. Then:
  - On gym days (both versions), tie the gym to `maghrib`, `before`, `30` minutes, with `absorb` naming the
    evening work block after it.
  - Tie the Friday recitation to Maghrib, and the Wednesday recitation to Isha, each with an absorbing block.
    Show the owner the before and after of each changed day first.
- [ ] T019 Validate with `node tools/check-settings.js .private/settings.json`. Sweep 2026 to 2028 with
  `node tools/check-anchors.js --settings .private/settings.json --require-fit`. If any date does not fit,
  show the dates and a proposal to the owner instead of squeezing blocks.
- [ ] T020 The owner re-imports the file on each device. Confirm on a gym day that the gym is 30 minutes before
  that day's Maghrib, and that "وقتك" at the end of the day keeps its usual length.

---

## Dependencies & Execution Order

- T001-T002 come first.
- Phase 3 (US1) needs Phase 2. Phase 4 (US2) needs Phase 3, because the example's `absorb` needs the layout
  rule.
- Phase 5 needs Phases 3 and 4. Phase 6 needs the merged PR and the owner's go-ahead.
- Every task except T014 edits `src/planner.html` or a check script, so they run in order.

## Implementation Strategy

1. Phases 1 to 3: the rule and its checks, with no visible change for any existing file. This is the MVP.
2. Phase 4: import checks and the example.
3. Phase 5: docs, then **one PR**, with the owner's review.
4. Phase 6: the owner's file, applied after the merge.

## Summary

- Total: 20 tasks.
  - Setup and foundational: 2.
  - US1: 6 (T003-T008).
  - US2: 5 (T009-T013).
  - Polish: 4 (T014-T017).
  - Owner's file: 3 (T018-T020).
- MVP: Phase 3.
