# Implementation Plan: Choose Which Block Absorbs a Prayer Shift

**Branch**: `008-absorbing-block` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-absorbing-block/spec.md`

## Summary

An anchored block (feature 004) may name a later block on the same day that takes its shift. The blocks from
the anchor up to that block move with the anchor, that block ends at its fixed end, and every block after it
stays at its fixed time. The block before the anchor still grows or shrinks as in 004. Days that name no
block lay out exactly as before.

Technical approach (details in [research.md](research.md)):

1. **Format** (R1): one optional key on the existing anchor object, `"absorb": "HH:MM"`, naming the absorbing
   block by its fixed start. The sixth element stays "the anchor", so nothing else that reads it changes
   meaning. An older copy of the app refuses the file cleanly, because the key is unknown to it.
2. **Validation** (R2): `validateSettings` accepts `absorb` only when it equals the fixed start of a block
   after the anchored block and before the next anchored block (the last block is allowed). Anything else is
   refused with a message naming the day, version and block.
3. **Layout** (R3): in `layoutDay`, the shift carried from an anchor stops after its absorbing block. The fit
   rule treats the absorbing block like the other absorbing blocks: at least 15 minutes, or its fixed length
   when that is less.
4. **Import summary and example** (R4): the summary counts blocks with `absorb`. The example's anchored day
   names its course block, with generic values.
5. **Checks** (R5): `tools/check-anchors.js` gets absorbing-block checks, an independent oracle, mutations,
   and a sweep that knows the new absorbing set. `tools/check-settings.js` gets the import cases. Parity
   against `main` with files that do not use the key shows 0 differences.

## Technical Context

**Language/Version**: JavaScript inline in `src/planner.html`; Node for the dev-only checks; Python 3 only for
`tools/build.py`

**Primary Dependencies**: unchanged (Preact + htm, adhan, all vendored). No new dependency

**Storage**: no stored data changes. Only the settings format gains one optional key

**Testing**: `tools/check-anchors.js` (unit checks, oracle, year sweep, self-test), `tools/check-settings.js`
(import cases, self-test), `tools/check-parity.js` (old build against new, files without the key)

**Target Platform**: installed PWA on phone and laptop browsers, offline

**Project Type**: single-file web app (PWA)

**Performance Goals**: the layout stays linear in the number of blocks; the two-year sweep stays under a second

**Constraints**:
- No change for files without the key.
- No overlap; the day's start and end never move.
- No absorbing block under 15 minutes.
- Ticks keep their keys, which use the fixed start.
- Generic values only in tracked files.

**Scale/Scope**: about 15 lines in `layoutDay`, about 12 in `validateSettings`, 2 in the import summary, one
example change, and new checks in two dev scripts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v2.0.0.

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. Human review before any AI action | Pass | Plan only; each phase needs the owner's go-ahead |
| II. Checking off is a human act | Pass | Layout only; keys keep the fixed start (as in 004), so no mark moves; the anchor layout block is still checked for never mentioning done, checks or modules |
| III. Private progress stays on device | Pass | No network, no storage change |
| IV. Honest, offline-capable day | Pass | This is the point of the feature: the shift is taken by the block the user chose, not hidden in their free time. A day that cannot fit still falls back with the existing note |
| V. Simple, single file, Egyptian Arabic | Pass | Still one HTML file; the one new message reuses the importer's existing style |
| VI. General public repo, private settings | Pass | Generic example and specs; the owner's own use stays in `.private/`; `check-private.js` before each commit |

Post-design re-check: all pass. No Complexity Tracking entries.

## Phases

Each phase can be committed on its own and needs the owner's go-ahead (Principle I).

| # | Phase | Story | Touches | Gate |
|---|---|---|---|---|
| 1 | **Layout rule and its checks**: the shift stops at the named block; the fit rule includes it; oracle, unit checks, mutations, and the sweep's absorbing set | US1 | `src/planner.html` (`layoutDay`), `tools/check-anchors.js` | Checks and self-test pass; parity against main with the current example and a no-key file gives 0 differences |
| 2 | **Format, import and example**: validation and messages, summary count, worked example, contract | US2 | `src/planner.html` (`validateSettings`, summary, embedded example), `settings.example.json` (generated), `tools/check-settings.js` | Import cases pass; the example sweep fits with 0 rule breaks |
| 3 | **Docs and ship**: README anchor paragraph, PRODUCT line, rebuild, quickstart in the browser | all | docs, generated files | Quickstart passes; the owner approves the diff before push |
| 4 | **Owner's own settings** (outside the repo): name the absorbing blocks in `.private/settings.json` and add the anchors the owner chose. That is the gym before Maghrib on gym days, and the Friday and Wednesday recitation tied to Maghrib and Isha. Sweep two years with `--require-fit`, then the owner re-imports | the paused private 002 | `.private/settings.json` only (git-ignored) | Sweep fits on 100% of dates, or every non-fitting date is shown to the owner with a proposal |

## Project Structure

### Documentation (this feature)

```text
specs/008-absorbing-block/
├── spec.md
├── plan.md                 # this file
├── research.md             # decisions R1..R6
├── data-model.md           # the anchor's new key and the layout rule
├── quickstart.md           # validation guide
├── contracts/
│   └── settings-absorb.md  # format, import rules, what the user sees, guarantees
├── checklists/
│   └── requirements.md
└── tasks.md                # /speckit-tasks
```

### Source Code (repository root)

```text
src/planner.html          # layoutDay, validateSettings, import summary, embedded example (edited)
tools/check-anchors.js    # absorbing checks, oracle, sweep set, mutations (edited)
tools/check-settings.js   # import cases for absorb (edited)
settings.example.json     # regenerated by check-settings.js --write-example
README.md, PRODUCT.md     # one paragraph and one line
index.html, sw.js, ...    # generated by tools/build.py
```

**Structure Decision**: single-file app; the change stays inside the existing anchor layout block and the
settings validator, with no new file.

## Complexity Tracking

No violations to justify.
