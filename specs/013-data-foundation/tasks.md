---

description: "Task list for feature 013: data foundation"
---

# Tasks: Data Foundation

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**:
- `tools/check-data.js` with `--self-test`, which tests the pure rules;
- Playwright end-to-end tests in `tests/e2e/`. The owner approved Playwright on 2026-10-17.

## Format: `[ID] [P?] [Story] Description`

## Binding rules

- No mark is made or cleared by a migration, a recovery or a restore (Principle II). Nothing leaves the device
  (Principle III).
- An old key is removed only after the new envelope is written and read back as equal.
- Data from a newer version is never overwritten.
- Each phase needs the owner's go-ahead. Show the diff before each commit.
- Run `node tools/check-private.js` with the files staged, and commit only on `RESULT: clean`.
- Making `e2e` a required check changes branch protection, which needs the owner's yes.

---

## Phase 1: Data rules and their check (US1, US2; pure, no visible change)

- [x] T001 Create `src/app/01a-data-rules.js` with the block `// start of data rules` … `// end of data rules`, and list
  it in `src/app/ORDER` after `01-settings-validate.js`. It has to come before the settings load, because `LOADED`
  runs as soon as the page loads. It holds:
  - `STORE_FORMAT`, `STORE_NAMES` and `CURRENT_VERSION` (progress 2, workouts 2, settings 2);
  - `sealStore(store, version, data, now)`, which makes the envelope, with `sum = fnv1a(JSON.stringify(data))`;
  - `openEnvelope(value, store)`, which takes text or an object and returns `{ok, version, savedAt, data}`, or
    `{ok: false, code}` with code `missing`, `damaged` or `wrong-store`;
  - `checkProgress(data)`, which returns `{data, setAside}`. It keeps every valid entry as it is, and moves aside:
    - check values that are not `true`, `'skip'` or `{moved: ISO}`, and day keys that are not ISO dates;
    - tasks without a string `id` and `text`;
    - appointments without a string `id` and `label`, a day from 0 to 6, and a time that is empty or `HH:MM`.
  - `MIGRATIONS` and `migrate(store, version, data)`:
    - progress 1 → 2 adds `setAside` through `checkProgress`;
    - workouts and settings 1 → 2 keep the data as it is;
    - a version newer than `CURRENT_VERSION` gives `too-new`, a step that throws gives `failed`, and the input is
      never changed.
  - `pickCopy(local, mirror)`, which returns `{use: 'local' | 'mirror' | null, repair: 'local' | 'mirror' | null,
    tooNew}`;
  - `keepSnapshots(dates, keep = 7)`, which returns the dates to delete.

  It uses no storage, page or network.
- [x] T002 [P] Create `tools/check-data.js`. It loads the backup rules (for `fnv1a`) and the data rules from the
  joined source, and checks:
  - envelopes round-trip, a changed byte or a wrong store is caught, and text and objects give the same result;
  - an oracle on 300 generated progress files: migrate 1 → 2 keeps every valid entry equal, and puts every bad one
    in `setAside` unchanged. The number of `true`, `'skip'` and `{moved}` marks is the same before and after;
  - the input is never changed (deep freeze);
  - too-new and failed steps;
  - every `pickCopy` case;
  - `keepSnapshots`;
  - the block never mentions storage, the page or the network.

  `--self-test` mutations:
  - the checksum is skipped;
  - a set-aside entry is dropped;
  - `pickCopy` prefers the older copy;
  - a too-new copy is migrated;
  - 8 snapshots are kept;
  - a valid check value is set aside.

  Add a «Data rules» step to CI.
- [x] T003 Rebuild and run every check. Parity 0. **Commit**: `feat(data): rules for stored data and their check (013)`.

## Phase 2: One storage path (US1, US2)

- [x] T004 [US2] Create `src/app/05a-storage.js`:
  - `openMirror`, `loadStore` (sync), `saveStore`, and `reconcile` (async, after the first render);
  - the old-key move with a read-back check;
  - the `storage` event for other tabs.

  It falls back to localStorage alone when IndexedDB is missing.
- [x] T005 [US1] Wire `06-store.js`, `16-workouts.js` and `02-settings-load.js` to it. `useStore` exposes
  `recovered`, `setAside`, `tooNew` and `failed`. Add the notices in `21-shell.js` through `Notice`.
- [x] T006 [US2] `15-settings-view.js`:
  - backup, restore, import and reset go through the storage functions;
  - restore stays all or nothing;
  - the storage line also reports the extra copy.
- [x] T007 Browser at 375 px:
  - wipe localStorage, then recover;
  - corrupt a copy, then recover;
  - move from the old keys, on generated old data;
  - two tabs;
  - no IndexedDB;
  - the save-failure notice;
  - 0 CSP violations.

  Every check passes, and parity is 0. **Commit**.
  - Phases 1 and 2 are committed together (owner, 2026-10-17), because `check-code` refuses rules that nothing uses
    yet.
  - Changes made along the way:
    - `fnv1a` moved into the data rules, since the tools that run the settings-to-courses range need it;
    - the storage part is `01b-storage.js` (it must come before the settings load);
    - the daily snapshot (write and prune, T008's first half) is in phase 2, because `keepSnapshots` must be used.
  - Browser at 375 px, 2026-10-17:
    - old keys moved, with 2 bad entries set aside and their values kept;
    - copies and the snapshot are in IndexedDB;
    - localStorage wiped: all three stores come back, settings included (the page reopens once);
    - one changed letter is caught, recovered, and the damaged copy is kept;
    - two tabs work;
    - reset does not come back from the mirror;
    - a backup round trip works;
    - the save-failure notice works;
    - 0 CSP violations.
  - The no-IndexedDB case moves to the E2E tests (Playwright can switch IndexedDB off before load).

## Phase 3: Daily snapshots (US2)

- [x] T008 [US2] The first save of each day writes the day's snapshot, and `keepSnapshots` prunes to 7. Done in
  phase 2. Still open for phase 3: reporting a snapshot that did not fit (today it is skipped quietly).
- [x] T009 [US2] Add «نسخ الأيام اللي فاتت» in Settings: a date list, the same preview as a backup file, and an
  all-or-nothing restore. If both copies are damaged, the app offers the newest snapshot. Browser check. **Commit**.
  - Done 2026-10-17.
    - A snapshot is turned into backup-file text (`makeBackup`) and goes through `readBackup`, so it gets the same
      checks, preview and all-or-nothing restore, with no second restore path.
    - Browser at 375 px:
      - three days are listed, newest first, with 44 px buttons;
      - the preview of the 15th is right, and the restore gives exactly that snapshot;
      - with both copies damaged, the notice names the newest snapshot day;
      - the damaged text is now kept exactly as it was.
    - **Known limit:** after a damaged start with no valid mirror, the app goes on from empty, and its first
      automatic save writes that empty state to the mirror too. Nothing is lost: the damaged text and the snapshots
      stay. But a later recovery from the mirror brings back the empty state.
    - A failed snapshot write shows as the extra copy failing in the storage line (the rest of T008).

## Phase 4: End-to-end tests with Playwright (US3)

- [ ] T010 [US3] Add `tests/e2e/package.json` (dev-only: `@playwright/test`, pinned exactly), the lockfile, and
  `playwright.config.js`:
  - Chromium and WebKit;
  - a 375×812 viewport;
  - a local `python3 -m http.server` web server on the build.
- [ ] T011 [US3] Write the tests for every path in spec US3, with generated data only. That includes the service
  worker: install, offline reload, and an update that keeps the downloaded drawings.
- [ ] T012 [US3] Add an `e2e` CI job: build, `npm ci`, install the browsers, run the tests. A failure keeps the
  screenshot and the console log as an artifact. Show that a broken tick fails the job. **Commit**.
- [ ] T013 [US3] Show the owner the change that adds `e2e` to the required checks in `branch-protection.json`, and
  apply it after their yes.

## Phase 5: Docs and ship

- [ ] T014 [P] README: where data is kept (the copies, the snapshots, what iOS can clear), and how to run the E2E
  tests. PRODUCT: the snapshots. Review: mark B6 and B7 done.
- [ ] T015 Tick the tasks, push, and open the PR. Before merging, remind the owner to save a backup file on the phone.
  Merge when the owner asks.

## Summary

- Total: 15 tasks.
  - Rules and check: 3.
  - Storage path: 4.
  - Snapshots: 2.
  - E2E: 4.
  - Docs and ship: 2.
- MVP: Phases 1 and 2.
