# Feature Specification: Separate Personal Settings from the Public App

**Feature Branch**: `002-separate-personal-settings`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "فصل الإعدادات الشخصية عن الكود: التطبيق العام في الـ repo يجي بجدول مثال عام وإعدادات افتراضية، وأي مستخدم (ومنهم المالك) يستورد ملف إعدادات محلي متجاهَل في git (الجدول، المواد، الكورسات، الموقع وطريقة مواقيت الصلاة، اللغة) مرة واحدة فيتخزن على الجهاز. بعد الاستيراد التطبيق يشتغل بالإعدادات دي، وأي بيانات شخصية تتشال من الملفات المتتبَّعة."

## Clarifications

### Session 2026-10-13

- Q: On the existing owner's device, should the app carry over the schedule currently in use until the file is imported? → A: No. The owner imports the file right after the update; no transitional code that carries personal data.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A new person opens the public app and it just works (Priority: P1)

Someone who finds the public app opens it for the first time. They see a clear, generic example
week (sample classes, study, work, exercise) with prayer times for a sample location, all labelled
as an example. Nothing in it belongs to any real person. They can tick blocks and use every tab.

**Why this priority**: The public app must stand on its own as a general planner (constitution
Principle VI). Without a working generic version there is nothing general to publish.

**Independent Test**: Open the app with empty storage and no settings file. A full example week is
shown, every tab works, and no real person's schedule, subjects, courses, or details appear anywhere.

**Acceptance Scenarios**:

1. **Given** a device that has never opened the app, **When** it opens the app, **Then** it sees the
   example week, marked as an example, and can use all tabs.
2. **Given** the example week, **When** the user ticks blocks and reloads, **Then** the ticks are kept
   on the device.
3. **Given** no settings were imported, **When** the user opens the settings area, **Then** it explains
   how to import a settings file and offers the example file format.

---

### User Story 2 - I import my own settings once and the app becomes mine (Priority: P1)

A user (the owner included) has a settings file kept outside the public repository. They import it
once on a device. From then on the app shows their schedule, subjects, courses, location and prayer
method, and language, and keeps working offline.

**Why this priority**: This is the other half of the goal: the public copy carries the general app, the
user's own copy carries their private data (constitution Principle VI).

**Independent Test**: Import a valid settings file on a device with the example showing. The app
switches to the imported schedule and settings, survives a reload and airplane mode, and the file is
not needed again.

**Acceptance Scenarios**:

1. **Given** a valid settings file, **When** the user imports it, **Then** the app shows the imported
   schedule, subjects, courses, location, prayer method, and language.
2. **Given** an imported file, **When** the user reloads or goes offline, **Then** the imported settings
   are still used and the file is not asked for again.
3. **Given** existing progress (ticks, tasks, added items) on the device, **When** the user imports
   settings, **Then** the progress is kept and still matches the dates it was saved on.
4. **Given** the user imports a newer settings file later, **When** it replaces the old one, **Then** the
   app uses the new one and the user is told what was replaced.

---

### User Story 3 - No personal data is left in the public repo (Priority: P2)

After this feature, the tracked files (source, built app, docs, specs, product notes) contain no real
person's schedule, details, or settings, and a check can prove it. The published app is the general one.

**Why this priority**: It closes the known violation recorded as the constitution's transitional
exception. It depends on User Stories 1 and 2, because the data can only be removed once the app can
run without it.

**Independent Test**: Run the privacy check on a clean checkout. It reports zero matches of the user's
personal values in tracked files and confirms the personal settings file is ignored and untracked.

**Acceptance Scenarios**:

1. **Given** a clean checkout, **When** the privacy check runs against the user's local settings file,
   **Then** none of its personal values appear in any tracked file or built output.
2. **Given** the personal settings file exists on disk, **When** git status runs, **Then** it is not
   listed as untracked or staged.
3. **Given** the built app, **When** opened with empty storage, **Then** it shows only the example.

---

### User Story 4 - Mistakes in the settings file are safe and clear (Priority: P3)

A user imports a file with an error, an unsupported version, or the wrong kind of file. The app says
what is wrong in plain language, keeps using the previous settings, and loses nothing.

**Why this priority**: Without this, a typo could blank the user's day on their own phone.

**Independent Test**: Import a broken file, then an empty file, then a file from a newer version. Each
shows a clear message and the previous settings and progress are unchanged.

**Acceptance Scenarios**:

1. **Given** a file with invalid content, **When** the user imports it, **Then** the app shows what is
   wrong and keeps the previous settings and progress.
2. **Given** a file made for a newer version of the app, **When** imported, **Then** the app says so and
   changes nothing.
3. **Given** a user who wants to start over, **When** they reset the settings, **Then** the app returns
   to the example and keeps their progress.

---

### Edge Cases

- A device already has saved progress from before this change: it MUST still be there afterwards.
- A device that used the old built-in schedule before this change: after the update it shows the
  example until the user imports their file. No schedule is carried over automatically, so the app
  carries no personal data. The user prepares the file before the update and imports it on first open.
  Progress already saved on the device stays and matches its dates once the file is imported.
- The settings file is very large or has thousands of blocks: the app MUST still open quickly.
- The file uses a day, time, or category the app does not know: it is rejected with a clear message, or
  that item is skipped with a visible warning, never silently dropped.
- Two devices have different settings: each keeps its own; nothing is shared unless the user chooses a
  synced copy (constitution Principle III).
- Prayer location or method missing in the file: the app falls back to the example's values and says so.
- Storage is unavailable (private browsing): the app warns that settings will not be kept.
- The day runs until 1:00am: imported schedules follow the same end-of-day rule as the example.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The public app MUST open with a complete generic example (week schedule, subjects, a
  course, location, prayer method, and language) containing no real person's data.
- **FR-002**: The example MUST be clearly labelled as an example in the app.
- **FR-003**: The user MUST be able to import a settings file once on a device; the imported settings
  MUST then be used for the schedule, subjects, courses, location, prayer method, and language.
- **FR-004**: Imported settings MUST be stored on the device and used offline without the file.
- **FR-005**: Importing, replacing, or resetting settings MUST NOT delete or change saved progress
  (ticks, skips, tasks, one-off blocks, added items).
- **FR-006**: The system MUST check an imported file before using it and reject invalid, empty, or
  newer-version files with a plain-language message, keeping the previous settings.
- **FR-007**: The user MUST be able to reset to the example, and to see which settings are in use.
- **FR-008**: The settings file format MUST be documented with a sample file in the repository that
  contains only example values.
- **FR-009**: The personal settings file location MUST be ignored by version control and a check MUST
  confirm it is untracked before any commit or push (constitution constraint).
- **FR-010**: Tracked files (source, built app, docs, specs, product notes) MUST contain no personal
  schedule or life details, and a repeatable check MUST report any value from the user's local
  settings file found in a tracked file.
- **FR-011**: Importing settings MUST NOT make any network request or send data off the device
  (constitution Principle III).
- **FR-012**: Importing settings MUST NOT mark, unmark, or move any block as done (constitution
  Principle II).
- **FR-013**: The app MUST keep working fully offline after import.
- **FR-014**: Existing progress saved before this change MUST remain valid and matched to its dates.
- **FR-015**: The app MUST NOT carry over or embed any schedule from before this change. After the
  update, a device shows the example until a settings file is imported, and the settings area MUST make
  the import step easy to find on first open.

### Key Entities

- **Settings**: one named, versioned bundle: week schedule, subjects, courses, location, prayer
  method, language, labels. Held on the device after import.
- **Example settings**: the generic bundle shipped with the app.
- **Settings file**: the user's own copy, kept outside the repository; format documented with a sample.
- **Progress**: ticks, skips, tasks, one-off blocks, added items; kept separate from settings.
- **Privacy check**: a repeatable test that no value from the user's settings file appears in tracked
  files.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user opens the public app and sees a working example week in under 5 seconds, with
  0 steps.
- **SC-002**: A user can import a valid settings file and see their schedule in under 1 minute from
  opening the app.
- **SC-003**: After import, the app works in airplane mode with no loss of function on 100% of tabs.
- **SC-004**: 100% of saved progress items remain after import, replace, and reset.
- **SC-005**: The privacy check finds 0 values from the user's settings file in tracked files and built
  output, and the file shows as ignored.
- **SC-006**: In 100% of invalid-file tests (broken, empty, newer-version), the previous settings and
  progress are unchanged and a message explains the problem.
- **SC-007**: A fresh checkout of the public repo contains 0 files that name a real person's schedule,
  institution, employer, or private details.

## Assumptions

- Each device imports the file separately; nothing syncs settings between devices unless the user
  chooses a synced copy (Principle III).
- The user writes or edits the settings file by hand following the sample; an in-app editor is out of
  scope for this feature (a separate feature if wanted).
- The file is chosen with the device's file picker, and it is stored on the device after import.
- Out of scope: rewriting git history, removing already-published copies, an in-app schedule editor,
  syncing settings between devices, and adding new languages (the language setting is read, not
  expanded here).
- The constitution's transitional exception ends when this feature is merged and the checks pass.
- The example uses a sample location and the default prayer method; users replace them with their own.
