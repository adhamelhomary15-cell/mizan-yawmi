# Research: Blocks Anchored to a Prayer Time

Grounded in `src/planner.html` on `main` at `327d63d`. No NEEDS CLARIFICATION remained after the spec.

## R1. One place builds every day

`blocksFor(iso)` (`src/planner.html:857`) turns a day's tuples into `{s, e, cat, title, detail, subj, key}`.
`dayBlocks` (`:996`) adds one-off extras on top, and every screen reads `dayBlocks`: Today (`:1245`), the
now/next card (`:1154`), day counts (`:1010`), Week totals (`:1083`, `:1344`) and the week bars (`:1388`).
Decision: do all anchoring inside `blocksFor`, so every view gets the same times with no per-view code
(FR-010). Alternative (anchor in each view) rejected: it would let views disagree.

## R2. The model has no gaps

A block's end is the next block's start, and the last block ends at `END` (1500, i.e. 01:00 the next day;
`START` is 420). So "keep every other block's length" is exactly this rule:

- an anchored block takes the computed start, and shifts by `delta = computed - fixed`;
- every non-anchored block after it takes the same `delta` until the next anchored block;
- the block just before an anchored block therefore ends at its new start (its length changes by the
  difference of the two deltas);
- the last block's end is still `END`, so it absorbs whatever remains.

Decision: lay out with one pass over the list that carries the current `delta`. Blocks whose neighbours
both keep their delta keep their length by construction. Lengths change only for the block before each
anchored block and for the last block (the "absorbing blocks" of the spec).

## R3. Fit rule and whole-day fallback

A layout fits when every absorbing block keeps at least 15 minutes and starts stay strictly increasing
(which follows from the 15-minute floor). If any date fails the rule, the whole day uses the fixed times
for all its anchored blocks and shows one notice, not a mix. Rationale: predictable and honest; a half
anchored day would be hard to explain. Alternative (fall back per block) rejected for that reason.

## R4. Settings format: a sixth element

Blocks are `[start, category, title, detail?, subject?]` (validator, `:653`, requires 2 to 5 items). Decision:
allow a sixth element, an object `{"prayer": "maghrib", "dir": "before", "min": 30}`. Files without it stay
valid and unchanged (SC-006). The fixed time stays the block's `start`, which is also the fallback
(FR-004). When a block has no detail or subject, those positions hold `""`, which the validator already
accepts.

Alternatives: an object form of a block (breaks every existing reader of tuples, bigger change), or a
separate `anchors` table keyed by day and index (fragile when blocks are reordered). Both rejected.

## R5. Progress keys must not move

A block's tick key is `start + "-" + category` (`:862`, stored under `checks[iso]`). Decision: keep using
the tuple's fixed `start` in the key, never the computed start. Then a tick stays attached to the block
whether the anchor applied that day, the fallback did, or the prayer time changed (spec edge case,
Principle II). No tick is ever written or removed by this feature.

## R6. Prayer times and edge cases

`prayers(iso)` (`:822`) returns minutes since midnight per prayer, or `null` when the library or location is
missing or the calculation throws, and it caches per date. Decisions:

- Unavailable means `prayers(iso) === null` or the chosen prayer is not a finite number (high latitudes).
  Use the fixed times and show the "unavailable" notice (US3).
- A computed minute below `START` is on the next calendar day: add 1440, the same rule as `hmToMin` (`:995`).
- Round with `Math.round(m / 5) * 5`, matching how times are shown.
- No cache invalidation is needed: layouts are computed per call from cached prayer times, and a day has
  at most a few dozen blocks.

## R7. Versions A and B

`phaseFor` picks the list (A or B) first; the anchor is read from the chosen list's blocks, so both
versions can carry anchors with no change to the version rule (FR-009). Today `phaseFor` itself reads the
prayer times; there is no circularity because anchoring runs after it.

## R8. Notices

The day's note is shown at `:1313`. Decision: `layoutDay` returns `{blocks, notice}` with `notice` one of
`null`, `'unavailable'`, `'nofit'`. Today shows a short line under the day's note; Week shows nothing.
The text is Arabic and generic (see the contract).

## R9. Testing without a framework

Decision: the layout and the anchor validation are pure functions in marked blocks of `src/planner.html`;
a new dev-only `tools/check-anchors.js` extracts them (like `check-edit.js` and `check-settings.js`) and
runs two kinds of checks:

1. Synthetic: hand-made blocks and prayer times, including the edge cases (first or last block, two
   anchors, floor of 15 minutes, `null` prayer times).
2. Year sweep: the real prayer calculation (vendored adhan) for the example settings over several
   years, for all seven weekdays: SC-001 (start equals prayer time plus or minus minutes within rounding),
   SC-002 (no overlap, only absorbing blocks change length), SC-003 (start and end of the day unchanged).

`tools/check-parity.js` (feature 002) covers SC-006: the old build and the new build, loaded with a
settings file that has no anchors, produce identical plans for every date.

## R10. Spec correction found during planning

User Story 2, scenario 3 says "planned hours per category for that weekday do not change because of the
shift". That contradicts the clarified rule: the two absorbing blocks change length, so their categories'
hours move by the shift (one gains what the other loses). Decision: amend the scenario to say that hours
of every other block do not change and the absorbing blocks change by equal and opposite amounts. The
amendment is part of the plan's commit. No other requirement changes.

## R11. Example settings

The embedded example gets one anchored block in a day that has a neighbour before and after it
(the "exercise" block, 30 minutes before Maghrib, fixed time as today). The Phase 4 sweep must show it fits
all year for the example's city, so the example does not demonstrate the fallback by accident.
