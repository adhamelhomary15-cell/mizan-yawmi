---

description: "Task list for feature 026: new versions on return, and the version in Settings"
---

# Tasks: New Versions on Return, and the Version in Settings

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**:
- CI's "Generated files match the source" step (the build stays deterministic);
- `tools/check-security.js`, `tools/check-code.js`, `tools/check-parity.js`;
- E2E in `tests/e2e/version.spec.js` (new);
- by hand on the owner's phone (US1's real test).

## Binding rules

- Nothing reloads without the user's tap (FR-002). The check only asks the browser to look.
- The check contacts only the app's own site, and offline it fails quietly (FR-003, FR-006).
- No app data changes: progress, settings, workouts, backups and the look (FR-005).
- The build gives the same files for the same source: no date, no random value in `index.html` or `sw.js`.
- Build with `py -3 tools/build.py` on this machine.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: The version in Settings (US2)

- [x] T001 In `tools/build.py`:
  - compute `version` from the finished page before writing `index.html` (today it is computed after);
  - add `<meta name="mizan-version" content="<version>">` right after the charset tag, then write `index.html`;
  - in the service worker template's install step, also put `./version` with `{"code": "<version>", "at":
    Date.now()}` (JSON) in the version's cache, in the same `waitUntil` before `skipWaiting`.
- [x] T002 Build twice and compare: `index.html` and `sw.js` are byte for byte the same, and the `<meta>` code equals
  the code in `sw.js`. Run `tools/check-security.js`.
- [x] T003 [US2] In `src/app/15-settings-view.js`, add `VersionLine` inside the «المستخدم دلوقتي» panel (plan, decision
  4):
  - the running code from `<meta name="mizan-version">`;
  - the installed code from the `mizan-<code>` cache (not `mizan-guides-*`), and `./version` from it;
  - same code: «النسخة: <code> · وصلت <date>», the date with the app's date label and the code in an LTR isolate;
  - another installed code: «النسخة: <code>. فيه نسخة أحدث جاهزة» with «افتحها», which reloads;
  - no service worker or nothing installed: «النسخة: <code>», or «النسخة: مش معروفة» without a `<meta>`;
  - every Cache API call inside `catch`, so a refusal shows the code alone.
- [x] T004 Run `check-code` (the file stays under 600 lines), parity (0 differences), and look at Settings at 375 px,
  light and dark, after the worker installs. **Commit**.

## Phase 2: The check on return (US1)

- [ ] T005 [US1] In `src/app/21-shell.js`, in the effect with the `controllerchange` listener (plan, decision 1):
  - listen to `visibilitychange`; when the page becomes visible and the last check was 60 seconds ago or more, call
    `navigator.serviceWorker.getRegistration()` then `registration.update()`, all inside `catch`;
  - the last check's time starts at the page's load, since the browser checks on load;
  - remove the listener on cleanup, as the `controllerchange` one is.
- [ ] T006 Run `check-code` and parity, and in the browser check that a return calls the update once and nothing
  shows offline. **Commit**.

## Phase 3: Tests, docs

- [ ] T007 In `tests/e2e/version.spec.js` (Chromium and WebKit):
  - **US1**: with `ServiceWorkerRegistration.prototype.update` counted, hidden then visible calls it once; a second
    return within a minute does not; one after a minute does (Playwright's clock); offline, a return shows no error
    and the app keeps working;
  - **US2**: once the worker is installed, Settings shows the `<meta>` code and today's date; with a cache of another
    code put there by the test, the line says a newer version is ready and «افتحها» reloads; without service workers,
    the line shows the code with no error;
  - **Data**: progress, settings and the look are the same before and after a check (FR-005).
  - **Network**: every request a return makes goes to the app's own origin (FR-006).
- [ ] T008 [P] README «التحديث»: the app checks for a new version when you come back to it, and Settings shows the
  version and the day it arrived.
- [ ] T009 Rebuild, then run every check, parity and the whole E2E suite. Tick the tasks. **Commit**.

## Phase 4: PR

- [ ] T010 Push and open the PR when the owner asks. Merge when the owner asks. After it is published, the owner
  tests US1 on the phone (plan, Tests): open the installed app, publish a build, switch away and back, and see the
  notice and the new code in Settings.

## Summary

- Total: 10 tasks.
  - The version in Settings: 4.
  - The check on return: 2.
  - Tests and docs: 3.
  - The PR and the phone test: 1.
- MVP: phases 1 and 2. Phase 1 alone already lets the owner see which version the phone runs.
- Parallel: T008 with T007.
