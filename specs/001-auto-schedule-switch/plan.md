# Implementation Plan: Automatic Schedule Switch at Maghrib 5:45pm

**Branch**: `001-auto-schedule-switch` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-auto-schedule-switch/spec.md`

## Summary

The app already chooses the late or early day version per date from that date's computed Maghrib
(`phaseFor`, `src/planner.html:633`). Verified 2026-10-13 with the bundled prayer library: late
through 2026-10-29 (Maghrib 18:11), early from 2026-10-30 (17:10). This plan therefore adds only
what the spec still needs:

1. **A yearly fallback rule** in `phaseFor` to replace the hardcoded `2026-10-30` date (FR-008).
2. **A one-time dismissible notice** after a version switch, driven by one new stored value, the
   last version the owner acknowledged (FR-010).
3. **A date-by-date check script** that proves FR-001 and FR-008 agree across several years
   (SC-001), plus a manual phone/offline pass.

No change to the schedule data, the 17:45 threshold, or done-state logic.

## Technical Context

**Language/Version**: JavaScript (browser, inline in one HTML file); Python 3 only for `tools/build.py`

**Primary Dependencies**: Preact 10.26.4 + hooks, htm 3.1.1, adhan 4.4.3 (all vendored in `tools/vendor`, inlined at build); no new dependencies

**Storage**: `localStorage` key `fall26-planner-v1`, state shape `{v:1, ...}` normalized by `normalize()`; the claude.ai artifact copy syncs the same object. One optional field is added; no version bump (see data-model.md)

**Testing**: A Node script (`tools/check-phase.js`, dev-only, not shipped) for the rule check; manual browser checks at phone width and offline (see quickstart.md). The repo has no test framework and none is added

**Target Platform**: Installed PWA on a phone (main use) and laptop browsers, offline-capable

**Project Type**: Single-file web app (PWA)

**Performance Goals**: No visible change; `phaseFor` is already called per rendered date and results are cached per ISO date in `prayers()`

**Constraints**: Offline; no network calls; Egyptian colloquial Arabic RTL copy; DESIGN.md tokens only; Cairo date decides the version

**Scale/Scope**: One user, about 4 small code edits in `src/planner.html`, 1 new dev script

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. Human review before any AI action | Pass | This plan, research, and data model are proposals; nothing in `src/` changes until the owner approves `/speckit-tasks` and implementation |
| II. Checking off is a human act | Pass | The new field is a notice bookkeeping value, not a done state. No code path writes `checks`; the quickstart includes a check that `checks` is byte-identical before and after a switch |
| III. Private progress stays on device | Pass | No network call added. The new value lives in the same local store |
| IV. Honest, offline-capable day | Pass | Rule uses only dates and the vendored library; works offline. Prayer method and location unchanged |
| V. Simple, single-file, Egyptian Arabic | Pass | Edits only `src/planner.html`; generated files are rebuilt by `tools/build.py`, not hand-edited; notice copy is Egyptian Arabic |

Post-design re-check (after Phase 1): all five still pass; no complexity violations.

## Phases

Five small phases, each independently committable and reversible. Do them in order; each ends with
a gate that must pass before the next starts. Each phase needs the owner's go-ahead (Principle I).

| # | Phase | Touches | Gate (done when) |
|---|---|---|---|
| 1 | **Baseline check script**: write `tools/check-phase.js` and run it against the app as it is now | `tools/check-phase.js` only | Script runs and prints, per year 2026-2035, the computed transition dates. It also lists where the current hardcoded fallback disagrees (expected: every year after 2026). No app change |
| 2 | **Yearly fallback rule**: replace the `2026-10-30` fallback in `phaseFor` with 16 Feb to the last Thursday of October | `src/planner.html` (`phaseFor` only) | Script reports at most one mismatching day per year around 16 Feb and none in October; if it does not, adjust the rule here before moving on |
| 3 | **Store field**: add `phaseSeen` to `EMPTY()` and `normalize()`, silent first-run set | `src/planner.html` (store code) | Saved data without the field loads as `null`; with `'A'`/`'B'` it survives an `update()` round trip; bad values become `null`; `checks` unchanged |
| 4 | **Notice banner**: show the dismissible notice in `App` when `phaseSeen` differs from today's version | `src/planner.html` (`App`, one small style block) | Quickstart section 4 passes on all four tabs; wording matches the approved copy; no timer, no network |
| 5 | **Build, verify, ship**: run `tools/build.py`, then quickstart sections 2, 3 and 5 on a phone width, offline | generated files (via build), `README.md` untouched | All quickstart steps pass; regenerated files committed with the source change; PR opened for review |

Notes:
- Phase 1 is read-only for the app, so it can run first to confirm the plan's assumptions.
- Phases 2, 3 and 4 each end with a commit of their own, so any one can be reverted alone.
- Nothing in phases 2-4 may write `checks`; phase 5 re-confirms this.

## Project Structure

### Documentation (this feature)

```text
specs/001-auto-schedule-switch/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── store-and-ui.md  # Phase 1 output (stored field + notice UI contract)
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
src/
└── planner.html         # edit: phaseFor fallback, store field, notice in App
tools/
├── build.py             # run to regenerate index.html, sw.js, manifest, icons
└── check-phase.js       # new, dev-only date-by-date rule check (not shipped)
index.html, sw.js, ...   # regenerated by build.py (never hand-edited)
```

**Structure Decision**: Keep the existing single-file layout. The only new file is a dev-only
check script under `tools/`, next to `build.py`.

## Complexity Tracking

No constitution violations to justify. The dev script is not part of the shipped app and adds no
runtime dependency; it needs Node, which is already present on the owner's machine, and is optional.
