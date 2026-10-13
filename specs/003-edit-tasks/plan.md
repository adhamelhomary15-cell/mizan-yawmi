# Implementation Plan: Edit Existing Tasks and Weekly Appointments

**Branch**: `003-edit-tasks` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-edit-tasks/spec.md`

## Summary

On the Tasks tab, each task and each weekly appointment gets an `عدّل` button. It opens the same form
used for adding, in place of the row and filled with the current values. Saving changes only the
editable fields (task: text, type, due date; appointment: name, day, time) and keeps identity, done
state, and creation date. Cancel and Escape change nothing. A successful save shows the existing toast
with `رجّعها`.

Technical approach (details in [research.md](research.md)):

1. One shared form component for add and edit, so the rules cannot drift apart.
2. Small pure functions for validation, applying an edit, and undo, tested by a dev-only Node script.
3. A dedicated undo that restores **only the edited record**. The existing whole-store undo is not used
   for edits because it could clear a tick the owner made in the meantime (Principle II).

## Technical Context

**Language/Version**: JavaScript inline in one HTML file (`src/planner.html`); Node for the dev-only check; Python 3 only for `tools/build.py`

**Primary Dependencies**: Preact 10.26.4 + hooks, htm 3.1.1 (vendored). No new dependencies

**Storage**: `localStorage`, key `fall26-planner-v1`; `tasks[]` and `appts[]` keep their shape. No migration

**Testing**: `tools/check-edit.js` (new, dev-only, extracts the pure functions from the HTML like `tools/check-settings.js`); existing `check-settings.js`, `check-private.js`; browser pass per [quickstart.md](quickstart.md) at 375 px and offline

**Target Platform**: Installed PWA on phone (main), laptop browsers; offline-capable

**Project Type**: Single-file web app (PWA)

**Performance Goals**: Open and save feel instant; no extra render cost beyond one list (lists are tens of items)

**Constraints**: Offline; no network calls; no write to done state; Egyptian Arabic RTL copy; existing design tokens; single HTML file; no new build step

**Scale/Scope**: One user per device; one view (`TasksView`, about 90 lines today) plus one small form component and four pure helpers; roughly 120 changed lines in `src/planner.html`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against the constitution on this branch (v1.1.0; the v1.1.1 amendment in PR #7 only removes an
expired exception and changes nothing below).

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. Human review before any AI action | Pass | Plan only; each phase below ends at a checkpoint and nothing in `src/` changes without the owner's go-ahead |
| II. Checking off is a human act | Pass | Edit writes only text/type/date or name/day/time. The edit helpers ignore `done`, `checks`, and `modules`; `check-edit.js` asserts `done` is unchanged for every input. The undo restores one record, so it cannot clear a tick (research R2) |
| III. Private progress stays on device | Pass | Edits go to the same localStorage key; no network, no new calls; no new dependency |
| IV. Honest, offline-capable day | Pass | Works offline; moving an appointment changes the day's plan through the existing live read (`apptsFor`), nothing is squeezed or auto-moved |
| V. Simple, single-file, Egyptian Arabic | Pass | Still one HTML file; no framework or build step; Arabic copy; the one dev script is not shipped |
| VI. General public repo, private settings | Pass | Generic copy only; no owner-specific value in spec, plan, code, or examples; `check-private.js` run before each commit |

Post-design re-check: all pass. No Complexity Tracking entries.

## Phases

Four small phases, each committable and reversible alone, each needing the owner's go-ahead
(Principle I).

| # | Phase | Touches | Gate |
|---|---|---|---|
| 1 | **Pure helpers and script**: `validateTaskFields`, `validateApptFields`, `applyEdit`, `restoreFields` in `src/planner.html` (not wired to the UI), and `tools/check-edit.js` | `src/planner.html` (new, unused code), `tools/check-edit.js` | `check-edit.js` passes, including `done`/`created`/`id` unchanged and undo-only-the-record; app behavior unchanged |
| 2 | **Task edit (US1, US2, US3)**: shared form component, `عدّل` button on task rows, inline form, empty-text message (also on the add form), type-no-longer-available handling, dedicated undo toast, focus and Escape | `src/planner.html` | Quickstart 2, 3, 4 pass at 375 px; add-task still works |
| 3 | **Appointment edit (US4)**: `عدّل` on appointment rows, same form component, wrapping action buttons, one-form-at-a-time across both lists | `src/planner.html` | Quickstart 5, 6 pass; the appointment moves inside its day at the new time |
| 4 | **Build, verify, ship**: rebuild (restore icons), full quickstart including keyboard, 375 px, and offline on a phone, update `README.md` if it lists Tasks features | generated files via build, `README.md` | All quickstart steps pass; owner approves the diff before any push |

Notes:
- Phase 1 changes nothing visible, so it is safe to merge alone.
- Phases 2 and 3 share the form component; if Phase 3 is cut, Phase 2 stands alone.
- The existing deletion undo (whole-store restore) has the same tick-clearing exposure. It is out of
  scope here and is raised as a suggestion, not changed.

## Project Structure

### Documentation (this feature)

```text
specs/003-edit-tasks/
├── spec.md
├── plan.md              # this file
├── research.md          # decisions R1..R10
├── data-model.md        # fields, pure functions, state transitions
├── quickstart.md        # validation guide
├── contracts/
│   └── ui-contract.md   # visible behavior of the Tasks tab
├── checklists/
└── tasks.md             # created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/planner.html         # TasksView, shared form, pure helpers, undo toast variant (edited)
tools/check-edit.js      # dev-only check of the pure helpers (new)
README.md                # one line if it lists Tasks features (Phase 4)
index.html, sw.js, ...   # generated by tools/build.py, never edited by hand
```

**Structure Decision**: single-file app. All behavior stays in `src/planner.html`; the only new file is
a dev-only script beside the existing check scripts.

## Complexity Tracking

No violations to justify.
