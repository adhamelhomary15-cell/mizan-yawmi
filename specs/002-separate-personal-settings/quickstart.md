# Quickstart: validating separate personal settings

Run after implementation. Use the full path to Python for the build if `python` is not on the PATH.
The owner's real file is only ever read from the ignored private folder.

## 1. Validator and example (FR-001, FR-006, FR-008)

```bash
node tools/check-settings.js                 # embedded example: exit 0
node tools/check-settings.js --write-example # refreshes settings.example.json
```
Then run it against deliberately bad copies: empty file, non-JSON, wrong `format`, `version: 99`,
a block with an unknown category, a bad time zone. Each exits 1 with a plain message.

## 2. Parity: nothing changes for the owner (SC-004, FR-014)

```bash
git show <last commit before this feature>:src/planner.html > old.html
node tools/check-parity.js --old old.html --new src/planner.html --settings .private/settings.json
```
Expected: 0 differences over a full year of dates, plus course plan and rules text. Also run the
harness old-vs-old once (sanity: 0 differences).

## 3. Example for a new user (US1, SC-001)

Serve the repo root locally, open it with empty site data. Expected: the example week, labelled
"Example", every tab works; ticking a block and reloading keeps the tick.

## 4. Import (US2, SC-002, SC-003)

In the settings area import the owner's file. Expected: the imported schedule appears after the
reload; reload again and switch the browser offline: still the imported schedule, no file needed.
Compare the stored progress object before and after: byte-identical (FR-005, SC-004).

## 5. Bad files and reset (US4, SC-006)

Import a broken file, an empty file, and a newer-version file: each shows a message; the settings in
use and the stored progress are unchanged. Then reset: the example returns, progress is kept.

## 6. Privacy (US3, SC-005, SC-007)

```bash
node tools/check-private.js
```
Expected: exit 0 (file ignored and untracked; 0 matches in tracked files and the built output).
Negative control: temporarily add one value from the private file to a tracked file; expect exit 1;
revert it. Also run `git status` with the private file present: it must not be listed.

## 7. Network and safety (FR-011, FR-012)

In the browser's network panel, import and reset make no request. The `checks` object is
byte-identical before and after every step above.

## 8. Build

```bash
<py> tools/build.py
```
Expected: builds cleanly; open the built `index.html` with empty storage: example only; steps 3-5
repeat on the built page. Revert regenerated icon files if the build re-renders them (unrelated change).

## 9. Done

All steps pass, the owner has imported the file on each device, and the constitution's transitional
exception can be struck in a follow-up amendment.
