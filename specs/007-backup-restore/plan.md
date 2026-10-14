# Implementation Plan: Backup and Restore

**Branch**: `007-backup-restore` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-backup-restore/spec.md`

## Summary

One button in Settings saves a single backup file (progress, workout log, imported settings) to the user's own
device; restoring shows a preview and replaces the device's data only after the user confirms, all or nothing.
Bad, foreign or newer-version files change nothing. The app also asks the browser to keep its data, without
triggering a prompt on its own, and reports the result.

Technical approach (details in [research.md](research.md)):

1. A pure "backup rules" block in `src/planner.html` (FNV-1a checksum, make the file, read and check it, build
   the preview), tested by a new dev-only `tools/check-backup.js` with a mutation self-test, and added to CI
   (R1, R3, R10).
2. Saving is a local download of an in-memory file, with the system share sheet as a fallback (R2).
3. Restoring validates every part with the app's existing normalisers and settings validator, writes all keys
   with a rollback, pushes the progress to a synced copy when one is active, then reloads (R4, R8).
4. Done marks are restored verbatim, as constitution v2.0.0 Principle II now allows and bounds (R5).
5. Persistent storage is requested automatically only where the browser decides silently; on Firefox only on
   the user's tap (R6).

## Technical Context

**Language/Version**: JavaScript inline in one HTML file (`src/planner.html`); Node for dev-only checks; Python 3 only for `tools/build.py`

**Primary Dependencies**: Preact 10.26.4 + hooks, htm 3.1.1 (vendored). Browser built-ins only: file input and FileReader (already used by settings import), a local download link, the Web Share API for files (feature-detected), the Storage Manager API (feature-detected). No new dependencies

**Storage**: reads and writes the three existing keys (`fall26-planner-v1`, `mizan-workouts-v1`, `mizan-settings-v1`) without changing their shape; one new small key `mizan-backup-meta-v1` for the last backup date

**Testing**: new `tools/check-backup.js` (round trip, every rejection, exact marks, checksum, timing, self-test) in CI; existing checks; browser pass per [quickstart.md](quickstart.md) at 375 px

**Target Platform**: Installed PWA on phone (main) and laptop browsers, offline-capable

**Project Type**: Single-file web app (PWA)

**Performance Goals**: save and restore with 700 workouts and two years of ticks in under 2 seconds on a phone (SC-001)

**Constraints**: no network, no account, no server; marks restored exactly; all or nothing; no unrequested permission prompt; Egyptian Arabic RTL copy; single HTML file; no new build step

**Scale/Scope**: about 120 lines of pure rules, one Settings section, a small change to the store hook (a way to wait for a pending synced write), one new dev script, one CI step

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against the constitution v2.0.0 (amended 2026-10-14 for this feature, PR #16).

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. Human review before any AI action | Pass | Plan only; each phase needs the owner's go-ahead |
| II. Checking off is a human act | Pass | Uses the v2.0.0 exception for restoring the owner's own backup: only after the owner confirms a preview; the file's marks are reproduced exactly and nothing is added (R5, checked by `check-backup.js`); all or nothing (R4). Saving a backup changes no mark |
| III. Private progress stays on device | Pass | The file is saved to the owner's device by the owner's tap; the share sheet is the platform's own, used only when the owner taps it; no network call; Settings warns the file holds personal data |
| IV. Honest, offline-capable day | Pass | Fully offline; no change to the day's plan |
| V. Simple, single file, Egyptian Arabic | Pass | Still one HTML file; Arabic copy; one new dev-only script |
| VI. General public repo, private settings | Pass | No real backup or personal data in the repo; tests generate their data; `check-private.js` before each commit |

Post-design re-check: all pass. No Complexity Tracking entries.

## Phases

Each phase is committable alone and needs the owner's go-ahead (Principle I).

| # | Phase | Story | Touches | Gate |
|---|---|---|---|---|
| 1 | **Backup rules and their check**: `fnv1a`, `makeBackup`, `readBackup`, preview; `tools/check-backup.js` with self-test; CI step | all | `src/planner.html` (unused code), `tools/check-backup.js`, `.github/workflows/checks.yml` | Checks and self-test pass; app unchanged |
| 2 | **Save**: Settings section, download and share fallback, last backup date, privacy note | US1 | `src/planner.html` | Quickstart 2 |
| 3 | **Restore**: file input, preview, rejection messages, all-or-nothing apply with rollback, synced copy wait, reload | US2, US3 | `src/planner.html` | Quickstart 3 and 4 |
| 4 | **Persistent storage**: status line, silent request, Firefox button | US4 | `src/planner.html` | Quickstart 5 |
| 5 | **Polish and ship**: README and `PRODUCT.md`, rebuild, full quickstart including performance and the network panel | all | docs, generated files | All quickstart steps; owner approves the diff before push |

## Project Structure

### Documentation (this feature)

```text
specs/007-backup-restore/
├── spec.md
├── plan.md              # this file
├── research.md          # decisions R1..R10
├── data-model.md        # the file, preview, last-backup key, pure functions
├── quickstart.md        # validation guide
├── contracts/
│   └── ui-contract.md   # the Settings section, messages, guarantees
├── checklists/
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/planner.html             # backup rules block, Settings section, store hook change (edited)
tools/check-backup.js        # dev-only check of the backup rules (new)
.github/workflows/checks.yml # one new step (edited)
README.md, PRODUCT.md        # a short section each
index.html, sw.js, ...       # generated by tools/build.py, never edited by hand
```

**Structure Decision**: single-file app. All behaviour stays in `src/planner.html`; the only new file is a
dev-only script beside the existing check scripts.

## Complexity Tracking

No violations to justify.
