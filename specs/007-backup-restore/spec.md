# Feature Specification: Backup and Restore

**Feature Branch**: `007-backup-restore`

**Created**: 2026-10-14

**Status**: Draft (FR-011 reworded 2026-10-14 with the owner's approval: Firefox prompts for this request)

**Input**: User description: "نسخة احتياطية واسترجاع لبيانات المستخدم. كل بيانات المستخدم (التقدم: العلامات والمهام والمواعيد والكورسات، وسجل التمارين، والإعدادات المستوردة لو موجودة) محفوظة على الجهاز بس، فلو المتصفح مسح بيانات الموقع أو المستخدم غيّر تليفونه بتضيع. المستخدم يقدر ينزّل ملف نسخة احتياطية واحد بضغطة، ويسترجعه على أي جهاز بعد ما يشوف معاينة بالمحتوى (كام مهمة وكام تمرينة وتاريخ النسخة) ويوافق. الاسترجاع بيستبدل البيانات الموجودة بعد تأكيد، وملف تالف أو من نسخة أحدث من التطبيق مايغيّرش أي حاجة. التطبيق كمان يطلب من المتصفح يخلّي التخزين دائم عشان مايتمسحش لوحده، من غير ما يظهر إذن للمستخدم، ويقوله الحالة. مفيش رفع لأي مكان ولا حساب ولا سيرفر: الملف بيتحفظ على جهاز المستخدم وهو اللي ينقله. الاسترجاع مش بيعلّم أي حاجة خلصانة من نفسه، بيرجّع اللي كان موجود بالظبط. الميزة عامة لأي مستخدم والريبو مافيهوش بيانات حد."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save a backup file (Priority: P1)

A user has weeks of ticks, tasks, courses and workouts on their phone, kept only in the browser. They open
Settings and tap one button; the app saves a single backup file to their device, named with the date. They can
keep it, send it to themselves, or move it to another device; the app never sends it anywhere.

**Why this priority**: Without a copy, one cleared browser or a lost phone erases everything. Saving a copy is
the step that protects the data; everything else in this feature depends on that file existing.

**Independent Test**: With some ticks, tasks and one finished workout on the device, tap the backup button;
a file appears in the device's downloads with today's date in its name, and opening it as text shows the
data, the app's name and the date.

**Acceptance Scenarios**:

1. **Given** a device with progress, workouts and an imported settings file, **When** the user taps the backup
   button, **Then** one file is saved that holds all three, with the date and time it was made.
2. **Given** a device with no imported settings (the example schedule is shown), **When** the user saves a
   backup, **Then** the file holds the progress and workouts and says that no settings were imported.
3. **Given** a backup was saved, **When** the user looks at Settings, **Then** they see the date of the last
   backup made on this device.
4. **Given** the user is offline, **When** they save a backup, **Then** it works the same.

---

### User Story 2 - Restore from a backup file after a preview (Priority: P1)

The user has a new phone, or their browser data was cleared. They open the app, go to Settings, choose
"restore", and pick their backup file. Before anything changes, the app shows what the file holds: the date it
was made, how many tasks, appointments, courses and finished workouts, how many days have ticks, and whether
it carries settings. It also says plainly that the data on this device will be replaced. Only when the user
confirms does the app replace its data with the file's, exactly as it was saved.

**Why this priority**: A backup is only useful if it can be brought back safely; the preview and the
confirmation protect the user from replacing good data with the wrong file.

**Independent Test**: Save a backup, change some ticks and tasks, then restore the backup: the preview shows
the right counts and date; cancelling changes nothing; confirming brings back exactly the saved ticks, tasks,
courses, workouts and settings.

**Acceptance Scenarios**:

1. **Given** a valid backup file, **When** the user picks it, **Then** a preview shows its date, the counts
   above and whether it holds settings, and nothing on the device has changed yet.
2. **Given** the preview, **When** the user cancels, **Then** nothing on the device changes.
3. **Given** the preview, **When** the user confirms, **Then** the progress, workouts and settings on the
   device become exactly those in the file, and the app shows them at once.
4. **Given** a backup that holds no settings, **When** it is restored, **Then** the device's current settings
   are kept as they are and the preview said so beforehand.
5. **Given** a backup made while a workout was open, **When** it is restored, **Then** that open workout is
   restored too, with its timers based on its original start time.
6. **Given** a restore was confirmed, **When** the user looks at any day, task or course, **Then** nothing is
   marked done that was not marked done in the file.

---

### User Story 3 - Bad or foreign files change nothing (Priority: P1)

The user picks the wrong file: a photo, a settings file, a half-downloaded backup, or a backup made by a newer
version of the app. The app explains in one short line why it cannot use it, and the data on the device stays
exactly as it was.

**Why this priority**: A restore replaces everything; a bad file must never be able to damage the data it is
meant to protect.

**Independent Test**: Pick, in turn, a photo, an empty file, a settings file (readable but not a backup), a
backup with a damaged part, and a backup marked as made by a newer version; each one shows its message and the
device data is unchanged (compare before and after).

**Acceptance Scenarios**:

1. **Given** a file that is not a backup of this app, **When** the user picks it, **Then** the app says it is
   not a backup and nothing changes.
2. **Given** a backup made by a newer version of the app, **When** the user picks it, **Then** the app says it
   needs a newer version and nothing changes.
3. **Given** a backup whose content is damaged or incomplete, **When** the user picks it, **Then** the app says
   the file is damaged and nothing changes; there is no partial restore.
4. **Given** a file larger than any real backup could be, **When** the user picks it, **Then** the app refuses
   it without trying to read it all.

---

### User Story 4 - Keep the browser from clearing the data on its own (Priority: P2)

Some browsers clear a site's stored data when the device is short of space. The app asks the browser to keep
its data unless the user clears it themselves. It never triggers a permission prompt on its own: where the
browser decides silently it asks by itself, and where the browser would ask the user (Firefox) it asks only
when the user taps «اطلب من المتصفح يحتفظ بالبيانات». Settings tells the
user in one line whether the browser agreed. If it did not, the line suggests saving a backup.

**Why this priority**: It lowers the chance of loss without any effort from the user, but it cannot be relied
on alone (the browser decides), so the backup file remains the real protection.

**Independent Test**: Open Settings on a browser that supports the request: the line shows the result; on a
browser that does not support it, the line says so and suggests a backup; no prompt appears unless the user
tapped the request button on a browser that asks.

**Acceptance Scenarios**:

1. **Given** a browser that grants lasting storage, **When** the user opens Settings, **Then** a line says the
   data is kept by the browser until the user clears it.
2. **Given** a browser that refuses or does not support the request, **When** the user opens Settings,
   **Then** a line says the browser may clear the data and suggests saving a backup.
3. **Given** a browser that decides silently, **When** the app asks for lasting storage on its own, **Then** no
   permission prompt is shown.
4. **Given** a browser that would show a prompt for this request, **When** the user has not tapped the request
   button, **Then** the app does not ask; **When** they tap it, **Then** the browser's own prompt may appear and
   the line shows the outcome.

---

### Edge Cases

- The app runs inside a host that also keeps a synced copy of the progress: a restore replaces the progress
  there as well, and the preview says so.
- A workout is open on the device when the user restores: the preview says it will be replaced by what the
  file holds (an open workout or none).
- The backup holds a settings file that the app's settings check now rejects: the preview says the settings
  part cannot be used; the user may restore the rest, and the device keeps its current settings.
- The user restores the same file twice: the result is the same as once.
- Storage on the device is full or blocked while restoring: the app says the restore failed and the data on the
  device stays as it was before the restore.
- The device cannot save files (some in-app browsers): the app says the backup could not be saved and suggests
  opening the app in the regular browser.
- A very large history (for example 700 workouts and two years of ticks) still backs up and restores in a few
  seconds.
- The file name contains the date only, never the user's name, schedule or any other personal detail.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST let the user save, with one tap in Settings, a single backup file to their own
  device holding all of their data kept by the app: progress (ticks, tasks, appointments, courses and the main
  course, extra blocks), the workout log (including an open workout and its preferences), and the imported
  settings when there are any.
- **FR-002**: The backup file MUST identify itself as a backup of this app, carry the format version and the
  date and time it was made, and be readable as plain text.
- **FR-003**: The backup file's name MUST contain the app's short name and the date, and nothing personal.
- **FR-004**: The app MUST NOT send the backup, or any part of the user's data, to any server, account or
  third party; saving and restoring work fully offline.
- **FR-005**: The app MUST show the date of the last backup saved on this device in Settings.
- **FR-006**: Choosing a file to restore MUST first show a preview with: the date the backup was made, the
  number of tasks, appointments, courses and finished workouts, the number of days with ticks, whether a
  workout was open, and whether settings are included; and a plain statement that the device's data will be
  replaced. Nothing on the device may change before the user confirms.
- **FR-007**: Confirming a restore MUST replace the device's progress and workout log with the file's, and its
  settings when the file holds valid settings, exactly as they were saved; restoring MUST NOT add, remove or
  change any done mark compared with the file.
- **FR-008**: A restore MUST be all or nothing: if any part fails to apply, the device's data MUST be left as it
  was before the restore.
- **FR-009**: The app MUST reject, with a short message and no change on the device: files that are not a backup
  of this app, empty or unreadable files, files larger than a fixed limit, damaged or incomplete backups, and
  backups made by a newer format version.
- **FR-010**: Settings inside a backup MUST pass the same validation as an imported settings file; if they do
  not, the preview MUST say so and the restore keeps the device's current settings.
- **FR-011**: The app MUST ask the browser to keep its stored data unless the user clears it, and MUST show the
  outcome in Settings (kept, may be cleared, or not supported). The app MUST NOT trigger a permission prompt on
  its own: where the browser decides silently it asks by itself; where the browser would ask the user, it asks
  only when the user taps the request button.
- **FR-012**: All copy for this feature MUST be in Egyptian Arabic, right to left, with numbers and dates
  readable; every control MUST be usable on a phone (targets of at least 44 pixels).
- **FR-013**: The repository MUST NOT contain any real backup file or personal data; examples and tests use
  generic data only.

### Key Entities

- **Backup file**: a single file the user keeps. Holds an identity marker for the app, a format version, the date
  and time it was made, and three parts: progress, workout log, and settings (or a note that none were imported).
- **Restore preview**: the summary shown before a restore: date, counts, open workout yes or no, settings
  included and valid yes or no, and the replacement warning.
- **Storage status**: whether the browser agreed to keep the data (kept, may be cleared, not supported).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Saving a backup takes one tap from Settings and finishes in under 2 seconds on a phone, even with
  700 workouts and two years of ticks.
- **SC-002**: After restoring a backup on another device, 100% of the saved ticks, tasks, appointments,
  courses, workouts and settings are present and identical, and no other done mark exists.
- **SC-003**: For every rejected file type listed in FR-009, the data on the device is byte-for-byte unchanged
  after the attempt.
- **SC-004**: A user who has never restored before can restore a backup on a new device in under 1 minute,
  guided only by the screen.
- **SC-005**: No network request is made while saving, previewing or restoring a backup.

## Assumptions

- The backup is not encrypted: it is a plain file the user keeps on their own device, like the settings file
  they already import. Settings warns that the file holds personal data and should be kept private.
- A restore replaces; it does not merge with what is on the device. Merging two histories is out of scope.
- Automatic or scheduled backups, cloud storage, and sync between devices are out of scope; the user saves and
  moves the file themselves.
- The app's own example schedule is never written into a backup as "settings"; only a settings file the user
  imported is.
- The limit for file size is generous enough for many years of data (a few megabytes) and small enough to
  refuse obviously wrong files quickly.
- Whether the browser keeps the data is the browser's decision; the app only asks and reports.
- Independent of the schedule, tasks, workouts and prayer features in behaviour: it only reads and writes the
  data those features already keep.
