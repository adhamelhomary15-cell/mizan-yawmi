# Feature Specification: Data Foundation

**Feature Branch**: `013-data-foundation`

**Created**: 2026-10-17

**Status**: Draft

**Input**: The next step of the owner's roadmap (2026-10-16): data versions and migrations, storage in several places
behind one save path, and end-to-end tests. Design problems B6 and B7 from the 010 review. The owner's storage
decision (2026-10-16):
- not one store, but several behind one save path: localStorage as the main copy, an IndexedDB mirror with a
  checksum, daily snapshots for about 7 days, and the backup file;
- later, the encrypted sync as one more store;
- the app loads the newest valid copy.

Out of scope here: the encrypted sync itself, the in-app schedule editor, custom kinds, and the day bounds (B1–B5,
B8). This feature is the base they stand on.

## Background

The app keeps three stores on the device, each written straight to localStorage:

| Store | Key | Version handling today |
|---|---|---|
| Progress (ticks, tasks, appointments, courses, postponed blocks) | `fall26-planner-v1` | `v: 1` is written. It is not checked on load, and a newer copy would be overwritten. |
| Workouts | `mizan-workouts-v1` | `v: 1`. A newer copy is detected (`tooNew`) and never overwritten. |
| Settings | `mizan-settings-v1` | `version: 1`. A newer file is refused on import. |

Three problems follow:

1. **No migrations.** The first feature that changes a data shape, such as custom kinds or the editor, has no safe way
   to bring old data forward. The progress key still carries a term name (`fall26`). `normalize` keeps `tasks`,
   `appts` and check values without looking at their shape, so a damaged entry can break a screen.
2. **One copy.** If the browser clears localStorage, or a write is cut off halfway, the data is gone unless the user
   saved a backup file by hand. iOS clears site data for web apps that are not installed after 7 days without use.
3. **No end-to-end tests.** The dev checks test pure rules, but nothing tests the real app in a real browser. Each
   of features 010 to 012 needed a manual browser session, and some paths could not be tested at all: the service
   worker, offline use, and app updates.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Old data always opens in a new version of the app (Priority: P1)

The user updates the app. The new version stores data in a slightly different shape. When it opens, it brings the
user's data forward step by step to the new shape. Nothing is lost, and the user sees everything as before.

If the data was written by a newer version than this app, as can happen with two devices on different versions,
the app does not touch it. It shows a notice to update.

**Why this priority**: Every later feature that changes data depends on this. Without it, each such change risks
the data of every user.

**Independent Test**: With progress stored in version 1, open a build whose current version is 2 (a test-only
migration). The data opens, is now version 2, and every tick, task and course is there. The version-1 copy is kept
as a snapshot until the next successful day.

**Acceptance Scenarios**:

1. **Given** stored data at an older version, **When** the app loads, **Then** it runs each migration in order, from
   that version to the current one. It shows the result, and saves it only after every migration succeeded.
2. **Given** a migration that fails, **When** the app loads, **Then** the stored data stays exactly as it was. The
   app shows a notice («بياناتك محفوظة زي ما هي، بس النسخة دي مش قادرة تفتحها. احفظ نسخة احتياطية وحدّث التطبيق.»),
   offers a backup, and does not write.
3. **Given** stored data from a newer version, **When** the app loads, **Then** it never overwrites it, as the
   workouts store already does, and shows the update notice.
4. **Given** the progress key named after a term, **When** the app loads, **Then** the data moves to a general key
   once, and the old key is removed only after the new one is written and read back.
5. **Given** an entry with a bad shape (a task without text, or a check value that is not true, `'skip'` or
   `{moved}`), **When** the app loads, **Then** that entry is set aside, not deleted. The rest opens normally, a
   notice says how many entries were set aside, and the set-aside entries stay in backups.

---

### User Story 2 - Data survives a wiped or damaged copy (Priority: P1)

Every save goes through one path that writes each store to several places:
- localStorage, the copy the app reads first;
- an IndexedDB mirror with a checksum;
- once a day, a snapshot, with the last 7 days kept.

When the app opens, it picks the newest copy that is valid. If localStorage was wiped or is damaged, the app brings
the data back from the mirror on its own and says so. In Settings, the user can also go back to one of the daily
snapshots, with the same preview and all-or-nothing rule as a backup restore.

**Why this priority**: Losing a semester of ticks to a browser clean-up is the worst thing that can happen to a
user of this app. It is the owner's chosen design.

**Independent Test**:
- Tick a few blocks, then clear localStorage only and reload. Everything is back, and a notice says it was
  recovered.
- Corrupt the localStorage copy and reload. Same result.
- In Settings, open «نسخ الأيام اللي فاتت», pick yesterday, preview it and restore. The data matches yesterday.

**Acceptance Scenarios**:

1. **Given** any change to a store, **When** it is saved, **Then** it is written to localStorage and to the IndexedDB
   mirror, with a checksum and a save time. A failure in either place shows the save-failure notice from 010,
   naming which copy failed.
2. **Given** the first save of a day, **When** it is written, **Then** a snapshot of all three stores is kept for that
   day. Snapshots older than the 7 most recent days are removed.
3. **Given** the app opens, **When** it reads, **Then** it compares the localStorage copy and the mirror. It uses the
   newer valid one, by save time and checksum, and writes it back to the other place.
4. **Given** localStorage empty or damaged and a valid mirror, **When** the app opens, **Then** it restores from the
   mirror and shows «رجّعنا بياناتك من النسخة المحفوظة على الجهاز».
5. **Given** both copies damaged and a valid snapshot, **When** the app opens, **Then** it does not restore on its own.
   It shows the newest valid snapshot's date and offers to restore it with a preview.
6. **Given** a browser without IndexedDB (some private windows), **Then** the app works on localStorage alone, as
   today, and the storage line in Settings says the extra copy is off.
7. **Given** the restore from a snapshot, **Then** it follows the backup restore rules: a preview first, all or
   nothing, and it never marks or clears a block on its own (constitution Principle II).

---

### User Story 3 - The real app is tested in a real browser on every PR (Priority: P2)

A set of end-to-end tests opens the built app in a headless browser at phone size and goes through the main paths:
- tick, cancel and undo;
- postpone in the review;
- a workout with a set;
- backup save and restore;
- a settings import;
- the drawing download;
- the save-failure notice;
- recovery from a wiped copy;
- 0 CSP violations;
- the service worker: install, offline reload, and an update that keeps downloaded drawings.

They run in CI, and branch protection makes them required.

**Why this priority**: It replaces the manual browser sessions of features 010 to 012. It also covers the paths
that could not be tested by hand here: offline use, the service worker and updates.

**Independent Test**: Break the tick button on purpose. The end-to-end run fails in CI and names the test.

**Acceptance Scenarios**:

1. **Given** a PR, **When** CI runs, **Then** the end-to-end tests run against the freshly built `index.html`, served
   locally. They must pass before merge.
2. **Given** a test that fails, **Then** CI keeps a screenshot and the console log of the failure for review, and
   uploads nothing else.
3. **Given** the tests, **Then** they use generated data only, never the owner's settings or any real person's data.
4. **Given** the test tool, **Then** it is a dev-only dependency: pinned, never shipped in the app, and never loaded
   by `index.html`.

### Edge Cases

- **Two tabs open:** a save in one tab must not silently undo the other tab's newer save. The newer save time wins
  when the app reads, and an open tab learns of a newer save through the browser's storage event.
- **Clock changes or a wrong device clock:** the snapshot day is the date in the settings' time zone, and save times
  only decide which of two copies is newer, never whether data is deleted.
- **Storage full:** a snapshot that does not fit is skipped and reported. It never pushes out the main copy.
- **The synced copy** (`claude` runtime) stays as it is. It is one more source, and this feature does not change it.
- **A backup file from before this feature** still restores, through the same migrations.
- **The set-aside entries** can be looked at and removed in Settings later. This feature only keeps them safe and
  counts them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each store MUST carry a version. Loading MUST run pure, tested migrations from the stored version to
  the current one, and save only after all of them succeed.
- **FR-002**: Data from a newer version MUST never be overwritten, in any of the three stores.
- **FR-003**: The progress data MUST move from the term-named key to a general key, without loss.
- **FR-004**: Entries with a bad shape MUST be set aside, not deleted, and counted in a notice.
- **FR-005**: Every save MUST go through one save path that writes localStorage and an IndexedDB mirror, each with a
  checksum and a save time.
- **FR-006**: The first save of each day MUST keep a snapshot of all three stores. The 7 most recent days are kept.
- **FR-007**: Loading MUST use the newest valid copy and repair the other. Recovery from the mirror is automatic and
  announced. Recovery from a snapshot needs the user's confirmation after a preview.
- **FR-008**: Without IndexedDB, the app MUST work as today on localStorage alone and say so in Settings.
- **FR-009**: End-to-end tests MUST run the main paths in a real browser on every PR, including the service worker
  and offline use, and MUST be required by branch protection.
- **FR-010**: No mark is ever made or cleared by a migration, a recovery or a snapshot restore (Principle II), and no
  data leaves the device (Principle III).

### Key Entities

- **Store**: progress, workouts or settings. Each has a version, a current shape and a list of migrations.
- **Copy**: a store as saved in one place (localStorage, mirror or snapshot), with its version, save time and checksum.
- **Snapshot**: all three stores on one day.
- **Set-aside entry**: an entry that failed its shape check, kept as it was.

## Success Criteria *(mandatory)*

- **SC-001**: With localStorage cleared, 100% of the data comes back on the next open, with no action by the user.
- **SC-002**: A test migration from version 1 to 2 keeps 100% of ticks, tasks, appointments, courses and postponed
  blocks, checked by the dev checks on generated data.
- **SC-003**: The end-to-end tests cover every path listed in User Story 3 and run in CI in under 3 minutes.
- **SC-004**: Every existing check passes, parity is 0, and the CSP stays strict.

## Assumptions

- IndexedDB is available in the browsers the app targets (current Chrome, Safari, Firefox on phone and laptop),
  except some private windows.
- The end-to-end tool needs a real browser in CI. That means the repo's **first npm dependency** (for example
  Playwright), dev-only and pinned. The plan must justify it, and the owner must approve it (constitution
  Principle V and AGENTS.md).
- Snapshots of three small stores for 7 days stay well under 1 MB.
