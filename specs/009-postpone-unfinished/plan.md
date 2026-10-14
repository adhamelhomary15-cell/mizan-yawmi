# Implementation Plan: Postpone What Was Not Done

**Branch**: `009-postpone-unfinished` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-postpone-unfinished/spec.md`

## Summary

The day review gets «أجّلها» on each open block of a postponable kind and on each open task due that day, plus
«أجّل اللي فاضل كله». A block is placed in the first free stretch that holds it, from the next day on, and the
user can accept the proposal or pick a day and time. It becomes an extra block on that date, and the original
gets a "moved" status. A task's due date moves to the next day. One undo reverses a single postponement or a
batch. Nothing moves without a tap, and nothing is marked done.

Technical approach (details in [research.md](research.md)):

1. **Settings** (R1): two optional flags on a kind in `categories`, `postpone: true` and `free: true`, validated
   as booleans. The example marks study, course and Quran as postponable and «وقتك» as free.
2. **Pure rules** (R2): a block `// start of postpone rules` … `// end of postpone rules`:
   - `freeStretches(blocks, extras, isFree)`;
   - `proposePlaces(items, startIso, dayAt, isFree, days)`;
   - `checkManualPlace(blocks, extras, s, len)`.

   It is tested by a new dev-only `tools/check-postpone.js`, with an oracle and mutations, and added to CI.
3. **Status** (R3): the original block's entry in `checks` becomes `{moved: 'YYYY-MM-DD'}`.
   - `statusOf` returns `'moved'`.
   - The day counts, the balance and the week totals leave it out of the plan, like a cancelled block, but
     show it as postponed, not cancelled.
   - The moved item counts on its new day.
4. **Extra blocks** (R4): an extra may carry `from` (the date first planned for) and `subj`. `dayBlocks` shows
   «اتأجلت من <التاريخ>» and keeps the subject for the week's per-subject totals.
5. **UI** (R5): the review rows get «أجّلها». A small inline proposal offers «تمام», «غيّر» (a day picker over
   the next 14 days and a time) and «لأ». The batch button shows one list with one confirm. Everything goes
   through the existing `act` undo.

## Technical Context

**Language/Version**: JavaScript inline in `src/planner.html`; Node for dev-only checks; Python 3 only for
`tools/build.py`

**Primary Dependencies**: unchanged (Preact + htm, adhan, vendored). No new dependency

**Storage**: the progress store keeps its shape. `checks[date][key]` may hold `{moved: date}`, and an extra may
carry `from` and `subj`. The settings get two optional booleans per kind

**Testing**: new `tools/check-postpone.js` (rules, oracle, mutations) in CI, `check-settings.js` cases, parity
for files without the flags, and the browser at 375 px

**Target Platform**: installed PWA on phone and laptop browsers, offline

**Project Type**: single-file web app (PWA)

**Performance Goals**: a proposal for one item or a batch over 7 days is computed instantly (under 50 ms)

**Constraints**:
- No automatic moves, and no done mark written.
- Postponed items never overlap each other or a scheduled tracked block.
- Free time is only the kind flagged free.
- Files without the flags behave as today.

**Scale/Scope**: about 80 lines of pure rules; the review UI; small changes to `statusOf` and the three places
that count statuses; the validator flags; the example; one new dev script; one CI step

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against the constitution v2.0.0.

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. Human review before any AI action | Pass | Plan only; each phase needs the owner's go-ahead |
| II. Checking off is a human act | Pass | Postponing writes a "moved" status and an open extra; it never writes `true` (done). Checked by `check-postpone.js` and a diff search |
| III. Private progress stays on device | Pass | No network; the data stays in the existing local store and backups |
| IV. Honest, offline-capable day | Pass | Unfinished work stays visible and gets real time; a moved block counts once, where it really goes; nothing is squeezed (items are never split or shortened) |
| V. Simple, single file, Egyptian Arabic | Pass | One HTML file; Arabic copy; one dev script |
| VI. General public repo, private settings | Pass | Kinds are flagged in settings; the example is generic; the owner sets their own flags in `.private/` |

Post-design re-check: all pass. No Complexity Tracking entries.

## Phases

Each phase can be committed on its own and needs the owner's go-ahead.

| # | Phase | Story | Touches | Gate |
|---|---|---|---|---|
| 1 | **Rules and their check**: settings flags, pure postpone rules, `check-postpone.js`, CI step | all | `src/planner.html` (unused code and validator), `tools/check-postpone.js`, `.github/workflows/checks.yml`, `tools/check-settings.js` | Checks pass; parity 0 differences; app unchanged |
| 2 | **Postpone one block**: moved status in counts, extra `from` and `subj`, review button, proposal, change, undo | US1 | `src/planner.html` | Quickstart 2 |
| 3 | **Batch and tasks**: «أجّل اللي فاضل كله», tasks due that day | US2, US3 | `src/planner.html` | Quickstart 3 and 4 |
| 4 | **Example, docs, ship**: example flags, README and PRODUCT, full quickstart | all | example, docs, generated files | All quickstart steps; the owner approves before push |
| 5 | **Owner's file** (outside the repo): set `postpone` on study, course and Quran, and `free` on «وقتك», in `.private/settings.json`; the owner re-imports | — | `.private/` only | Validator passes |

## Project Structure

```text
specs/009-postpone-unfinished/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/postpone.md
├── checklists/requirements.md
└── tasks.md

src/planner.html            # validator flags, postpone rules block, statusOf and counts, dayBlocks, Review UI
tools/check-postpone.js     # new dev-only check
tools/check-settings.js     # flag cases
.github/workflows/checks.yml
README.md, PRODUCT.md
```

**Structure Decision**: single-file app; one new marked rules block, beside the existing ones.

## Complexity Tracking

No violations to justify.
