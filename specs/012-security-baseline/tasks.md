---

description: "Task list for feature 012: security baseline"
---

# Tasks: Security Baseline

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: `tools/check-security.js` with `--self-test` in CI, and the browser checks in plan.md.

## Format: `[ID] [P?] [Story] Description`

## Binding rules

- No change to the app's behaviour, look or stored data. Every check passes, and parity is 0.
- Branch protection is applied only after the owner says yes to the exact settings in `branch-protection.json`.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: User Story 3 - CI runs exactly the reviewed code (Priority: P2)

- [x] T001 [US3] In `.github/workflows/checks.yml`, pin each `uses:` to its SHA, with the version in a comment:
  - `actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4`
  - `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4`
  - `actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065 # v5`
- [x] T002 [US3] Create `tools/check-security.js` with the workflow check (every `uses:` is `owner/repo@<40-hex>`)
  and its `--self-test` mutation. Add a «Security» step to CI. **Commit**: `ci: pin actions to commit SHAs (012, US3)`.

## Phase 2: User Story 1 - The page only runs what we shipped (Priority: P1) 🎯 MVP

- [x] T003 [US1] In `tools/build.py`, after the page is put together:
  - hash every inline JavaScript `<script>` and every `<style>`, skipping `type="application/json"`;
  - insert the CSP `<meta>` from plan.md right after `<meta charset="utf-8">`.
- [x] T004 [US1] Extend `tools/check-security.js` with the CSP checks from plan.md:
  - exactly one CSP meta, before every script and style;
  - the exact set of directives, with no unsafe tokens, wildcards or other origins;
  - every inline block hashed, and no hash left over.

  Add the mutations: CSP removed; `'unsafe-inline'` added; a script changed after hashing; an extra origin.
- [x] T005 [US1] Rebuild and run every check. Parity: 0.
- [x] T006 [US1] Browser at 375 px, as in plan.md:
  - a full session with 0 violations;
  - injected script, inline handler, `eval`, an outside `fetch` and an outside image all blocked;
  - the drawing download still works.

  **Commit**: `feat(security): hash-based CSP in the built page (012, US1)`.
  - Done 2026-10-17 in the browser pane at 375 px.
    - 0 violations through: load, all six tabs, a tick, a postpone, starting a workout, a backup save, the restore
      preview, the settings import preview, and a drawing download (3 frames).
    - Blocked, with nothing run: an injected `<script>`, an inline `onclick`, `eval`, a `fetch` to another origin,
      an image from another origin, an injected `<style>`, and an outside script file.
    - The service worker could not be checked in the pane, which refuses to register one. It is left for the phone.

## Phase 3: User Story 4 - The shared-origin risk is written down (Priority: P3)

- [x] T007 [P] [US4] In `README.md` («الخصوصية»), add:
  - what the CSP does;
  - that `main` is protected;
  - the shared-origin risk and what closes it;
  - the frame-ancestors limit;
  - the new check in the file list.
- [x] T008 [P] [US4] In `specs/010-code-health/review.md`, mark C1–C3 as done in 012, and C4 as recorded.
  **Commit**: `docs(012): CSP, protected main and the shared-origin risk`.

## Phase 4: User Story 2 - Nothing reaches the phones without a PR and green CI (Priority: P1)

- [ ] T009 [US2] Write `specs/012-security-baseline/branch-protection.json` (from plan.md). Push the branch and open
  the PR. Then show the owner the settings and the command, and wait for an explicit yes.
- [ ] T010 [US2] After the yes, apply it with
  `gh api -X PUT repos/adhamelhomary15-cell/mizan-yawmi/branches/main/protection --input specs/012-security-baseline/branch-protection.json`.
  Verify it:
  - read the settings back;
  - the PR shows as blocked while CI runs, and as mergeable once it is green.
- [ ] T011 Tick the tasks. Merge when the owner asks, through the PR, which is now the only way.

## Dependencies

- Phase 1 → Phase 2, which extends the same check. Phase 3 can run beside Phase 2.
- Phase 4 comes last, so the rule is checked on this feature's own PR.

## Summary

- Total: 11 tasks.
  - US3: 2.
  - US1: 4.
  - US4: 2.
  - US2: 2.
  - Ship: 1.
- MVP: Phase 2 (the CSP).
