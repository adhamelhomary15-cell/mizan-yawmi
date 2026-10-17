# Implementation Plan: Data Foundation

**Branch**: `013-data-foundation` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

## Summary

All three stores (progress, workouts, settings) move behind one storage path, in a new part `src/app/05a-storage.js`.
A save goes three places:
- a versioned *envelope* in localStorage, which is the copy the app reads first;
- a mirror of the same envelope in IndexedDB;
- a daily snapshot of all three stores, with the last 7 days kept.

On open, the app picks the newest valid copy and repairs the others.

Data shapes get versions and pure migrations. The first real migration moves each store to a general key, and gives
progress a list of set-aside entries.

The pure parts live in a marked rules block that a new dev check, `tools/check-data.js`, tests: the envelope,
checksum, migrations, entry checks, choosing a copy, and pruning snapshots.

End-to-end tests in a real browser come last. They need the repo's first npm dependency, so they wait for the
owner's choice of tool (see the decision below).

## Technical Context

- The same single-file PWA, with Preact and htm. Checks run on Node (v24 locally, 22 in CI). No new runtime library.
- Storage today:
  - progress is `fall26-planner-v1`, with `v: 1`, and nothing checks the version;
  - workouts is `mizan-workouts-v1`, with `v: 1`, and a newer version is never written over (`tooNew`);
  - settings is `mizan-settings-v1`, which holds the settings file;
  - the backup date is `mizan-backup-meta-v1`, a small piece of metadata. It stays as it is.
- localStorage is synchronous and IndexedDB is asynchronous. The first render keeps reading localStorage
  synchronously, as today. The mirror and the snapshots are read after it, and the app updates if one is newer.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | The E2E tool, the new required CI check, and the branch-protection change each wait for the owner's yes. |
| II. Checking off is human | Migrations, recovery and snapshot restores move marks exactly as they are; they never add or clear one. The data check tests this. |
| III. Data stays on the device | Every copy is on the device. There is no network. |
| IV. Offline | It works offline. Without IndexedDB, the app falls back to today's behaviour. |
| V. Simple, single file | One new part file and one rules block. The E2E tool is dev-only and never shipped. **Needs a written reason and the owner's yes.** |
| VI. General repo | The tests use generated data only. |

## Design

### The envelope (pure, in the rules block)

```
{format: 'mizan-store', store: 'progress' | 'workouts' | 'settings', version: N, savedAt: ISO, sum: fnv1a(JSON(data)), data}
```

- `sealStore(store, version, data, now)` returns an envelope.
- `openEnvelope(text, store)` returns one of:
  - `{ok, version, savedAt, data}`;
  - `{ok: false, code: 'missing' | 'damaged' | 'wrong-store'}`.

  A checksum that does not match counts as damaged.
- `fnv1a` already exists in the backup rules, so this reuses it.

### Versions and migrations (pure)

```
CURRENT = {progress: 2, workouts: 2, settings: 2}
MIGRATIONS = {progress: {1: d => …}, workouts: {1: d => …}, settings: {1: d => …}}
migrate(store, version, data) → {ok, version, data, setAside} | {ok: false, code: 'too-new' | 'failed', at}
```

- **progress 1 → 2:**
  - checks the shapes, and moves bad entries into a new `setAside: []` list as `{where, key, value}`;
  - a check value must be `true`, `'skip'` or `{moved: ISO}`;
  - a task needs string `text` and `id`;
  - an appointment needs `label`, `day` 0–6 and `time` `HH:MM`;
  - everything else stays exactly as it was.
- **workouts 1 → 2, settings 1 → 2:** the shape does not change. The step exists so the move to the new key is one
  path with one check.
- The **old keys** are read only when the new key is missing. The old key is removed after the new envelope is
  written **and read back** equal.
- New keys: `mizan-progress`, `mizan-workouts`, `mizan-settings`. The version lives inside the envelope, never in the
  key name.
- The settings *file format* that users import keeps its own `version: 1`. Only the stored envelope is versioned here.

### Choosing a copy (pure)

`pickCopy(local, mirror)` takes two results of `openEnvelope`:
- it returns the valid one with the later `savedAt`, or `null` when neither is valid;
- it tells the caller which copy to repair;
- a copy from a newer version is never chosen to be overwritten: it wins, and the app stops writing.

### Snapshots (pure part)

`keepSnapshots(dates, keep = 7)` returns the dates to delete. A snapshot's date is the day in the time zone from the
settings (`zoneParts`).

### The storage part: `src/app/05a-storage.js` (impure, small)

- `openMirror()`: one IndexedDB database `mizan`, with object stores `copies` (key: store name) and `snapshots`
  (key: date). It resolves to `null` when IndexedDB is missing or blocked.
- `loadStore(store)` is synchronous. It reads and opens the localStorage envelope. If that key is missing, it reads
  the old key, migrates the data, and shows it. Returns:
  - `{data, version, savedAt, from}`, or
  - `{tooNew}`, or
  - `{failed}`.
- `saveStore(store, data)`:
  - seals the envelope;
  - writes localStorage synchronously, and returns `ok` for the save-failure notice;
  - queues the mirror write;
  - on the first save of the day, queues the day's snapshot of all three stores;
  - reports a mirror failure separately.
- `reconcile(store, local)` runs once after the first render:
  - it reads the mirror and calls `pickCopy`;
  - if the mirror is newer and valid, it brings that data back, repairs localStorage, and the app shows «رجّعنا
    بياناتك من النسخة المحفوظة على الجهاز»;
  - if both copies are bad, it shows the newest snapshot date, with «رجّع نسخة يوم …».
- **Other tabs:** a `storage` event on one of the three keys reloads that store only when the event's envelope is
  newer.

### Wiring (existing parts)

- **`06-store.js`:** `loadLocal` and `saveLocal` call `loadStore` and `saveStore('progress')`. `useStore` exposes
  these, and the `App` notices use them:
  - `saveFailed`;
  - `recovered`;
  - `setAside` (a count);
  - `tooNew`;
  - `failed`.

  The synced copy (`claude`) is unchanged.
- **`16-workouts.js`:** `loadWorkouts` and its `update` use the same functions. `tooNew` comes from the envelope or
  from the old check.
- **`02-settings-load.js`:** `LOADED` reads through `loadStore('settings')`. Settings stay fixed for the session, as
  today (B3). If the settings are recovered from the mirror, the app writes them back and reloads once.
- **`15-settings-view.js`:**
  - backup, restore, import and reset use the storage functions, not raw keys;
  - restore stays all or nothing, writing the three envelopes and rolling back on failure;
  - a new «نسخ الأيام اللي فاتت» list shows each snapshot's date, with the same preview and restore path as a
    backup file;
  - the storage line also says whether the extra copy is on.
- **Backups** keep their format, which holds the raw data of the three stores. Reading an old backup runs the same
  migrations, so a version-1 backup restores into version 2.

### The check: `tools/check-data.js`

The rules block is tested on generated data. It checks that:
- envelopes round-trip, and any changed byte is found to be damaged;
- `migrate` from 1 to 2 keeps every valid tick, task, appointment, course and postponed block. An oracle compares
  the counts and the values;
- bad entries are set aside and never lost, and no mark is added or cleared;
- a too-new version is never migrated down;
- `pickCopy` covers every case: both valid, one missing, one damaged, one too new;
- `keepSnapshots` keeps exactly 7.

`--self-test` mutations:
- the checksum is skipped;
- a set-aside entry is deleted;
- `pickCopy` prefers the older copy;
- a too-new copy is overwritten;
- 8 snapshots are kept.

### End-to-end tests: **decision for the owner**

| | **Playwright (recommended)** | **Puppeteer** | **Our own CDP script (no dependency)** |
|---|---|---|---|
| What it is | Microsoft's test runner, with Chromium **and WebKit** (the engine behind iOS Safari) | Google's library, Chromium only | Node 22's built-in WebSocket driving the Chrome that CI already has |
| Service worker, offline, IndexedDB | Yes, with offline built in | Yes | Yes, but we write and maintain about 300 lines of browser control |
| iPhone-like engine | **Yes (WebKit)** | No | No |
| Supply chain | 1 dev package, pinned with a lockfile. Browsers download in CI only. | Same | None |
| Shipped in the app | Never | Never | Never |

Playwright is the recommendation. It is the only option that tests the WebKit engine, and iOS is where storage gets
cleared and where service-worker problems show up most. The tests and their config live in `tests/e2e/`. They come
with a `package.json` that has no runtime dependencies, and a lockfile. CI runs `npm ci` and
`npx playwright install --with-deps chromium webkit`, then runs the tests against `python3 -m http.server` serving
the build.

The new CI job `e2e` becomes a required check. That is a change to branch protection, so it needs the owner's yes,
like the first rule did.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | Data rules block and `check-data.js` (pure) | US1, US2 | All checks green; mutations caught |
| 2 | `05a-storage.js`, wired into progress, workouts and settings, with migrations to the new keys, notices for recovered, set-aside, too-new and failed, and the storage event | US1, US2 | Browser at 375 px: wipe and recover, corrupt and recover, migration from an old key, two tabs, private-window fallback |
| 3 | Snapshots and «نسخ الأيام اللي فاتت» with preview and restore | US2 | Browser: restore yesterday's snapshot |
| 4 | E2E with the tool the owner chose: the tests, the CI job, and making it required (owner's yes) | US3 | CI green; a broken tick fails CI |
| 5 | Docs: README storage section, PRODUCT, review B6 and B7 done | — | — |

## Risks

- **Moving the keys** is the riskiest step. It is tested on generated old data, the old key is removed only after a
  read-back check, and the backup file and the snapshots are the safety nets. The owner should **save a backup file
  before the update** reaches the phone.
- **IndexedDB on iOS** can be cleared together with localStorage, so the mirror does not help in that case.
  Snapshots live in the same IndexedDB. That case still needs the backup file, and later the encrypted sync. The
  README will say so plainly.
