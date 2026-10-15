---

description: "Task list for feature 011: download exercise art when needed"
---

# Tasks: Download Exercise Art When Needed

**Input**: [spec.md](spec.md), [plan.md](plan.md), [quickstart.md](quickstart.md)

**Tests**: `tools/check-guides.js` with `--self-test`, run in CI.

## Binding rules

- No network request without a tap on «نزّل الرسمة». One tap requests one file, from the same origin.
- `checks`, progress and backups are not touched.
- Run `node tools/check-private.js` with the files staged, and commit only on `RESULT: clean`.

## Phase 1: Vendor the drawings

- [x] T001 Extract the 302 payloads from `src/planner.html` into
  `tools/vendor/workout-guide/frames/<slug>.json.gz`, byte-for-byte. Add `NOTICE.md`, and copy
  `LICENSE-ASSETS.md` and `ATTRIBUTION.md` from upstream commit `aac5992`.
- [x] T002 In `src/planner.html`, empty `WORKOUT_GUIDE_ASSETS` to `{}`. In `tools/build.py`, inline the files
  of the slugs in `WORKOUT_GUIDE_BUILTIN_SLUGS`, stopping the build on a missing file.

## Phase 2: Guide rules and the check

- [x] T003 Add the block `// start of guide rules` … `// end of guide rules` with `GUIDE_PATH`, `guideUrl` and
  `checkGuideFrames`.
- [x] T004 [P] Create `tools/check-guides.js` (rules, vendor completeness, network surface, size budget) with
  `--self-test`. Add a «Exercise art» step to `.github/workflows/checks.yml`.

## Phase 3: User Story 1 - Built-ins inlined (P1)

- [x] T005 [US1] Built-ins load from the inlined data as before. Remove the dead drawing code and CSS, merge the
  duplicate rules, and make the caption follow what is shown.
- [x] T006 [US1] The service worker skips the vendor path, and activate keeps `mizan-guides-*`.

## Phase 4: User Story 2 - Download on tap (P1)

- [x] T007 [US2] Look up kept drawings in `mizan-guides-v1` (no request). `downloadGuide(slug)` is the only
  fetch: check, keep, notify.
- [x] T008 [US2] The exercise page shows «نزّل الرسمة», «بتتنزّل…», and the error and no-keep messages from the
  spec.

## Phase 5: Verify and ship

- [x] T009 Rebuild, run every check and `--self-test`, and run the quickstart at 375 px, including offline after
  a download and 0 requests with no tap. Commit.
  - Done on 2026-10-15 in the browser pane, except quickstart step 8 (app update): the pane refused to register
    the service worker, so the update path is left for the phone test.
- [ ] T010 Docs: a line in `README.md` on the drawings and their license. Push and open the PR when the owner
  asks.
