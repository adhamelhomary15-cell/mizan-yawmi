# Implementation Plan: Blocks Anchored to a Prayer Time

**Branch**: `004-prayer-anchored-blocks` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-prayer-anchored-blocks/spec.md`

## Summary

A schedule block in the settings file can carry an **anchor**: a prayer, a direction (before or after), and
up to 180 minutes. On each date the block starts at that date's prayer time plus or minus the minutes,
rounded to 5 minutes. Blocks after it shift together, the block just before it ends where it starts, and
the last block of the day absorbs the rest; the day's start and end never move. If prayer times are
unavailable, or the day would leave an absorbing block under 15 minutes, every block uses its fixed time
and a one-line notice says so.

Technical approach (details in [research.md](research.md)):

1. One pure `layoutDay` function inside `blocksFor`, so every screen (Today, now/next, Week, totals)
   reads the same times.
2. An optional sixth element on a block tuple, validated at import. Files without it behave exactly as
   today.
3. Progress keys keep using the block's fixed start, so ticks never move.
4. A dev-only `tools/check-anchors.js` proves the rules over a full year with the real prayer calculation.

## Technical Context

**Language/Version**: JavaScript inline in one HTML file (`src/planner.html`); Node for dev-only checks; Python 3 only for `tools/build.py`

**Primary Dependencies**: Preact 10.26.4 + hooks, htm 3.1.1, adhan 4.4.3 (all vendored). No new dependencies

**Storage**: none new. Settings stay under `mizan-settings-v1`; progress stays under `fall26-planner-v1`. The anchor lives only in the settings file

**Testing**: `tools/check-anchors.js` (new, dev-only: synthetic cases, a year sweep with real prayer times, and a mutation self-test), existing `check-settings.js`, `check-parity.js`, `check-edit.js`, `check-private.js`; browser pass per [quickstart.md](quickstart.md) at 375 px and offline

**Target Platform**: Installed PWA on phone (main) and laptop browsers, offline-capable

**Project Type**: Single-file web app (PWA)

**Performance Goals**: A day layout is one pass over tens of blocks; no visible delay. Prayer times are already cached per date

**Constraints**: Offline; no network calls; no stored-data change; no write to done state; single HTML file; no new build step; generic repo (no personal schedule or location)

**Scale/Scope**: One user per device; one function (about 40 lines), one validator addition (about 15 lines), one notice line in the Today view, one example block, one new dev script

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against the constitution v1.1.1.

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. Human review before any AI action | Pass | Plan only; each phase below ends at a checkpoint and nothing in `src/` changes without the owner's go-ahead |
| II. Checking off is a human act | Pass | Layout reads and writes no done state; ticks stay on the fixed-start key (research R5); the Phase 4 diff scan and quickstart 7 check this |
| III. Private progress stays on device | Pass | Settings come from the local file; prayer times come from the bundled library; no network call, no new data stored |
| IV. Honest, offline-capable day | Pass | This is the principle the feature serves: nothing is squeezed (15-minute floor, whole-day fallback with a notice), and prayer method and location come from the settings; works offline |
| V. Simple, single-file, Egyptian Arabic | Pass | Still one HTML file; the notices are Egyptian Arabic; no framework; the one new script is dev-only and not shipped |
| VI. General public repo, private settings | Pass | The example block is generic; spec, contract and quickstart contain no real schedule or place; `check-private.js` runs before each commit |

Post-design re-check: all pass. No Complexity Tracking entries.

## Phases

Four small phases, each committable and reversible alone, each needing the owner's go-ahead (Principle I).

| # | Phase | Touches | Gate |
|---|---|---|---|
| 1 | **Layout function and its check**: pure `layoutDay` (anchors, delta walk, fit rule, notices) in a marked block of `src/planner.html`, not yet used; `tools/check-anchors.js` with synthetic cases and a mutation self-test; correct US2 scenario 3 in the spec (research R10) | `src/planner.html` (new unused code), `tools/check-anchors.js`, `spec.md` | `check-anchors.js` synthetic cases pass and the self-test catches every mutation; app unchanged |
| 2 | **Format and import**: accept the sixth element, validate it (prayer, direction, minutes, not first or last block, no extra keys), import summary count, example block in the embedded example, regenerate `settings.example.json`, extend `check-settings.js` self-test | `src/planner.html`, `settings.example.json`, `tools/check-settings.js` | Self-test passes with the new cases; an anchored file imports; invalid anchors are rejected naming day and block; plans are still identical (no layout wired yet) |
| 3 | **Wire it in**: `blocksFor` uses `layoutDay` and returns the notice through a small companion function; keys keep the fixed start; one notice line in the Today view under the day note | `src/planner.html` | Quickstart sections 3, 4, 5, 7 pass at 375 px; `check-parity.js` shows 0 differences for a file without anchors |
| 4 | **Sweep, docs, ship**: year sweep with real prayer times over several years for all weekdays (SC-001 to SC-003), parity with and without the prayer library, README and `PRODUCT.md` lines, rebuild, full quickstart including offline, final diff scan for done-state writes | generated files via build, `README.md`, `PRODUCT.md` | All quickstart steps pass; the owner approves the diff before any push |

Notes:
- Phases 1 and 2 add capability without changing any visible behavior, so they are safe to merge alone.
- Phase 3 is the only one that changes what a day looks like, and only for files that contain anchors.
- The owner's own settings file (in `.private/`) is not touched by this feature. If they want to use an
  anchor they edit their local file; the repo never learns which block or prayer they chose.

## Project Structure

### Documentation (this feature)

```text
specs/004-prayer-anchored-blocks/
├── spec.md
├── plan.md              # this file
├── research.md          # decisions R1..R11
├── data-model.md        # anchor, day layout, layout rule
├── quickstart.md        # validation guide
├── contracts/
│   └── settings-anchor.md   # file format, import rules, what the user sees
├── checklists/
└── tasks.md             # created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/planner.html            # layoutDay, anchor validation, blocksFor wiring, notice line, example block (edited)
settings.example.json       # regenerated from the embedded example (edited)
tools/check-anchors.js      # dev-only check of the layout rule and a year sweep (new)
tools/check-settings.js     # more self-test cases for anchors (edited)
README.md, PRODUCT.md       # one line each about anchoring (Phase 4)
index.html, sw.js, ...      # generated by tools/build.py, never edited by hand
```

**Structure Decision**: single-file app. All behavior stays in `src/planner.html`; the only new file is a
dev-only script beside the existing check scripts.

## Complexity Tracking

No violations to justify.
