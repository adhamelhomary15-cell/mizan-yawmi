# Feature Specification: A Quiet Backup Reminder

**Feature Branch**: `035-backup-reminder`

**Created**: 2026-11-15

**Status**: Draft

**Input**: The owner's pilot plan (`docs/pilot-plan.md`, section 2, item 2) asks for "a quiet backup reminder every two
weeks, because there is no sync yet". The owner asked (2026-11-15) to start this spec.

## Background

- **Where the data lives**: every mark, workout and setting stays on the phone only (Principle III). Sync is optional,
  off by default, and the pilot's testers will not have it. A lost or reset phone, a cleared browser, or Safari clearing
  an unused site loses everything.
- **The backup already exists**: Settings › «نسخة احتياطية» saves one file with the progress, the workout log and the
  settings, and remembers when the last one was made on this device («آخر نسخة: …»,
  `src/app/15-settings-view.js:213`). Restoring it is in the same section.
- **Nobody goes there on their own**: the section is at the bottom of Settings, and nothing in the app says when a
  backup is due. The daily snapshots the app keeps (feature 020) are on the same phone, so they do not help when the
  phone or the browser's data is lost.
- **The save-failure notice** (`src/app/21-shell.js:24`) already offers to save a backup when saving to the phone
  fails. This feature does not change it.

## Clarifications

None open. The defaults below (the 14 days, the 3 days of «مش دلوقتي», when the count starts) are in Assumptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reminded when a backup is due, and saving it in one tap (Priority: P1)

A person has used the app for a while. Their last backup on this phone is 14 days old or more, or they never made one
and have used the app on this phone for 14 days. When they open «اليوم», a calm notice above the day says why it
matters in one line (no sync, the data is on this phone only) and offers «احفظ نسخة دلوقتي». Tapping it saves the same
file as Settings, says where it went, and the notice goes away. The next reminder comes 14 days after that backup.

**Why this priority**: it is the whole feature; without it a pilot tester can lose two weeks of marks with no way back.

**Independent Test**: With the last backup set 15 days ago and one mark made, open «اليوم»: the notice shows; tap
«احفظ نسخة دلوقتي»: a backup file is saved, the notice hides, Settings shows the new «آخر نسخة», and a reload shows
no notice.

**Acceptance Scenarios**:

1. **Given** the last backup is 14 days old or more and there is something to lose, **When** «اليوم» opens, **Then**
   the notice shows above the day with the reason and «احفظ نسخة دلوقتي».
2. **Given** no backup was ever made on this phone, the app has been used here for 14 days and there is something to
   lose, **When** «اليوم» opens, **Then** the notice shows.
3. **Given** the notice, **When** «احفظ نسخة دلوقتي» is tapped and the file is saved, **Then** the file is the same
   one Settings saves, the notice hides, a short line names the file, and the last-backup time is now.
4. **Given** the last backup is less than 14 days old, **When** «اليوم» opens, **Then** no notice shows.
5. **Given** a backup saved from Settings, **When** «اليوم» opens, **Then** the count starts again from that backup.

---

### User Story 2 - «مش دلوقتي» without nagging (Priority: P2)

The person is busy. «مش دلوقتي» hides the notice for 3 days; after that it comes back if the backup is still due.

**Why this priority**: a reminder that cannot be put off becomes noise and gets ignored; one that disappears for good
does not protect anyone.

**Independent Test**: With the notice showing, tap «مش دلوقتي»: it hides and stays hidden after a reload; move the
clock 3 days on: it shows again.

**Acceptance Scenarios**:

1. **Given** the notice, **When** «مش دلوقتي» is tapped, **Then** it hides, and stays hidden for 3 days on this phone.
2. **Given** 3 days have passed and no backup was made, **When** «اليوم» opens, **Then** the notice shows again.
3. **Given** a backup was made during those 3 days, **When** they pass, **Then** no notice shows until 14 days after
   that backup.

---

### User Story 3 - Nothing when there is nothing to lose (Priority: P3)

A new person who has not marked anything or logged a workout yet does not see the reminder, whatever the dates say.

**Why this priority**: asking to back up an empty app is confusing and teaches people to ignore the notice.

**Independent Test**: With no marks and no workouts, and the dates past due, open «اليوم»: no notice; make one mark,
reopen: the notice shows.

**Acceptance Scenarios**:

1. **Given** no marks and no logged workouts, **When** «اليوم» opens, **Then** no notice shows, whatever the dates.
2. **Given** one mark or one logged workout and a due backup, **When** «اليوم» opens, **Then** the notice shows.

### Edge Cases

- **Saving the file fails** (some in-app browsers refuse downloads): the notice stays, with the same message Settings
  gives («مقدرتش أحفظ الملف…»); the count does not restart.
- **The save-failure notice is showing**: the reminder does not show at the same time; that notice already offers a
  backup.
- **The «ضيفه للشاشة الرئيسية» notice is showing**: the reminder waits until it is dismissed, so only one of the two
  shows at once.
- **Storage refused** (private browsing): «مش دلوقتي» and the start of the count last until the page closes; nothing
  breaks and no error shows.
- **The clock goes back** (a date in the future is stored): the reminder treats it as "now", so it neither shows at once
  nor stays hidden for months.
- **Restoring a backup** does not count as making one, and it does not change the reminder's dates.
- **«رجّع المثال»** clears the stored settings only and keeps the marks, so it changes nothing for the reminder.
- **Other tabs**: the notice shows on «اليوم» only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On «اليوم», the app MUST show the reminder when there is something to lose and either the last backup on
  this device is 14 days old or more, or no backup was ever made here and the app was first opened here 14 days ago or
  more.
- **FR-002**: "Something to lose" MUST mean at least one mark kept in the progress, or at least one logged workout.
- **FR-003**: The reminder MUST say in one line why (no sync, the data is on this phone only) and offer
  «احفظ نسخة دلوقتي» and «مش دلوقتي».
- **FR-004**: «احفظ نسخة دلوقتي» MUST save the same backup file as Settings and record the same last-backup time that
  Settings shows; a backup from either place MUST restart the count.
- **FR-005**: «مش دلوقتي» MUST hide the reminder for 3 days on this device.
- **FR-006**: When saving fails, the reminder MUST stay, show the Settings failure message, and not restart the count.
- **FR-007**: The reminder MUST NOT show beside the save-failure notice or the «ضيفه للشاشة الرئيسية» notice.
- **FR-008**: The reminder's dates (when the app was first opened here, until when it is put off) MUST live on the
  device only, in their own place, outside the progress, the settings and the backup file.
- **FR-009**: The reminder MUST NOT set, clear or change any done state (Principle II), make any network request, or
  change the shape of any stored data (Principle III).
- **FR-010**: Whether the reminder shows MUST be decided by one pure rule from the dates and "something to lose", with
  a dev check over typical cases and self-test mutations that the check notices.

## Success Criteria *(mandatory)*

- **SC-001**: In the pilot, every tester who is still using the app on day 14 has at least one backup file (asked on
  day 14).
- **SC-002**: Saving a backup from the reminder takes one tap.
- **SC-003**: The reminder shows at most once every 3 days while a backup is due, and never in the 14 days after one.
- **SC-004**: Parity 0: day plans unchanged; no new network request and no change to the done state.

## Key Entities

- **Last backup time**: already kept on this device by the backup section; read by the rule, written by either save.
- **Reminder dates**: when the app was first opened on this device (recorded once, the first time this version runs)
  and until when «مش دلوقتي» puts the reminder off. Kept apart from everything else.

## Assumptions

- **14 days** for a backup to become due, as the pilot plan says ("every two weeks").
- **3 days** for «مش دلوقتي»: long enough not to nag, short enough to come back within the same two weeks.
- **When the count starts** for someone who never backed up: the first time this version of the app opens on the
  device. People already using the app get their first reminder 14 days after updating.
- **Placement and look**: with the app's other notices above the day, in the same calm look; no badge, no colour alarm.
- **Saving only**: the reminder offers saving the file; sending it elsewhere («ابعتها لمكان تاني») stays in Settings.
- **Out of scope**: an easier first run (the pilot plan's third item), sync, and any reminder outside the app
  (notifications need a network service and are not part of this feature).
