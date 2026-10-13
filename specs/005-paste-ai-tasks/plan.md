# Implementation Plan: Paste Tasks from Any AI in a Fixed Format

**Branch**: `005-paste-ai-tasks` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-paste-ai-tasks/spec.md`

## Summary

On the Tasks tab a new paste area gives the user a ready-made instruction text (the fixed line format plus the
user's own task types and today's date). The user copies it into any AI together with a big task, gets back
subtasks as lines like `type | task text | due date`, and pastes the answer into the app. The app checks it,
shows a preview (what it will add, and every line it could not use, with a reason), and adds the ticked tasks
to the Tasks list as open tasks, with a short undo for exactly that batch. The app never talks to an AI and
never guesses a type.

Technical approach (details in [research.md](research.md)):

1. Pure functions in one marked block: `parseTaskLines`, `buildAiPrompt`, `undoBatch`. They reuse the task
   rules from feature 003 (`validateTaskFields`), so a pasted task obeys the same limits as one typed by hand.
2. One small UI component beside `TasksView`: instruction box, paste box, preview with checkboxes and a type
   picker, rejected-lines list.
3. The batch uses the existing record-only undo (`actEdit`), extended to remove only untouched batch tasks.
4. A dev-only `tools/check-paste.js` proves every line is accounted for and no task is ever done.

## Technical Context

**Language/Version**: JavaScript inline in one HTML file (`src/planner.html`); Node for dev-only checks; Python 3 only for `tools/build.py`

**Primary Dependencies**: Preact 10.26.4 + hooks, htm 3.1.1 (vendored). No new dependencies

**Storage**: none new. Tasks keep their shape in `fall26-planner-v1`. The paste draft lives in memory only

**Testing**: `tools/check-paste.js` (new, dev-only: parser cases, wrapping variants, limits, duplicates, undo, mutation self-test); existing `check-edit.js`, `check-settings.js`, `check-anchors.js`, `check-private.js`; browser pass per [quickstart.md](quickstart.md) at 375 px and offline

**Target Platform**: Installed PWA on phone (main) and laptop browsers, offline-capable

**Project Type**: Single-file web app (PWA)

**Performance Goals**: Checking at most 50 lines is instant; the preview renders at most 50 rows

**Constraints**: Offline; no network; no AI call; no clipboard read; no stored paste; no write to done state; Egyptian Arabic RTL copy; existing design tokens; single HTML file; no new build step

**Scale/Scope**: One user per device; about 90 lines of pure code, one component of about 100 lines, one button on the Tasks tab, one new dev script

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against the constitution v1.1.1.

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. Human review before any AI action | Pass | The app adds nothing without the user's confirmation of a preview, and the AI outside the app only produces text the user reads and pastes. Each phase below ends at a checkpoint needing the owner's go-ahead |
| II. Checking off is a human act | Pass | Every added task is `done: false`; no code writes `done`, `checks` or `modules`; the undo removes only untouched batch tasks and never restores a snapshot (research R8); `check-paste.js` asserts it |
| III. Private progress stays on device | Pass | No AI call, no network request, no clipboard read; the draft is memory only; the instruction text carries only the type list and today's date, which the user chooses to copy out |
| IV. Honest, offline-capable day | Pass | Works offline; adds no time to the schedule and squeezes nothing |
| V. Simple, single-file, Egyptian Arabic | Pass | One HTML file, no framework or build step; copy is Egyptian Arabic; the one new script is dev-only and not shipped |
| VI. General public repo, private settings | Pass | The format, the instruction text and all examples are generic; no personal schedule, course or place; `check-private.js` runs before each commit |

Post-design re-check: all pass. No Complexity Tracking entries.

## Phases

Three small phases, each committable and reversible alone, each needing the owner's go-ahead (Principle I).

| # | Phase | Touches | Gate |
|---|---|---|---|
| 1 | **Pure rules and their check**: `parseTaskLines`, `buildAiPrompt`, `undoBatch` in a marked block of `src/planner.html` (not yet used), and `tools/check-paste.js` with parser cases, wrapping variants, rejection reasons, limits, duplicates, the account-for-every-line invariant, and a mutation self-test | `src/planner.html` (new unused code), `tools/check-paste.js` | `check-paste.js` passes and the self-test catches every mutation; app unchanged |
| 2 | **The paste area**: button «الصق مهام من AI», instruction box with copy, paste box, «افحص», preview with checkboxes and type picker, rejected list, confirm with batch undo, session draft, focus and Escape | `src/planner.html` | Quickstart 2 to 7 pass at 375 px; adding a task by hand and every other tab behave as before |
| 3 | **Polish and ship**: layout, keyboard and screen-reader pass, README and `PRODUCT.md` lines, rebuild, full quickstart including offline, final diff scan for done-state writes and network calls | generated files via build, `README.md`, `PRODUCT.md` | All quickstart steps pass; the owner approves the diff before any push |

Notes:
- Phase 1 changes nothing visible, so it is safe to merge alone.
- Phase 2 is the only one that changes what the Tasks tab looks like, and only by adding one button until it is used.
- The format is fixed here and in the contract; changing it later is a deliberate edit of the contract, the parser and the instruction text together.

## Project Structure

### Documentation (this feature)

```text
specs/005-paste-ai-tasks/
├── spec.md
├── plan.md              # this file
├── research.md          # decisions R1..R12
├── data-model.md        # proposed task, rejected line, batch, state transitions
├── quickstart.md        # validation guide
├── contracts/
│   └── paste-format.md  # the line format, the instruction text, the paste area
├── checklists/
└── tasks.md             # created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/planner.html         # parse/prompt/undo block, PasteTasks component, one button in TasksView (edited)
tools/check-paste.js     # dev-only check of the pure rules (new)
README.md, PRODUCT.md    # one line each about pasting tasks from an AI (Phase 3)
index.html, sw.js, ...   # generated by tools/build.py, never edited by hand
```

**Structure Decision**: single-file app. All behaviour stays in `src/planner.html`; the only new file is a
dev-only script beside the existing check scripts.

## Complexity Tracking

No violations to justify.
