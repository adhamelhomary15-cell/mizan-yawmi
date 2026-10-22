# Feature Specification: Build and Edit the Schedule in the App

**Feature Branch**: `014-schedule-editor`

**Created**: 2026-10-17

**Status**: Draft

**Input**: The owner's goal (2026-10-16): any user or student can use the app without ever leaving it. Today a schedule
comes only from a settings file in JSON that someone has to write. That is the main barrier for a new user, and the
owner still needs help for every change. The owner's decisions:
- **2026-10-16:** the JSON file stays as an optional feature next to an editor in the app. Both go through the same
  check and the same store, plus «صدّر جدولي كملف».
- **2026-10-17:**
  - **Kinds:** the 9 existing kinds can be renamed and their options changed. New kinds come in a later feature.
  - **Day bounds:** they stay fixed (07:00–01:00) in this feature.
  - **City:** an offline list of cities, plus «استخدم موقعي» (the device's location, after permission, never sent
    anywhere), plus typing the coordinates by hand.
  - **City list (2026-10-17):** GeoNames (CC BY 4.0) is approved. The list covers **Muslim countries only**, meaning
    the 57 member states of the Organisation of Islamic Cooperation. A user elsewhere uses «استخدم موقعي» or the
    coordinates.
  - **Prayer:** a block can be tied to a prayer from the editor. The two day versions (summer and winter, by a prayer
    threshold) stay file-only for now.

## Background

The schedule, kinds, subjects, place and prayer method all live in one settings object. It is checked by
`validateSettings`, and since 013 it is stored through the storage path as the `settings` store. The app reads it
once when the page opens, and an import saves it and opens the page again.

A new user sees the generic example week and a line saying to import a file. Nothing in the app lets them make
their own week.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A new user makes their own week without a file (Priority: P1)

A student opens the app for the first time and sees the example week, with «اعمل جدولك». A short guide asks:
1. **Where are you?** A city from the list, «استخدم موقعي», or coordinates. The time zone and the prayer method follow
   from the choice, and the user can change them.
2. **How does your week look?** A starting point: «طالب», «طالب وبيشتغل», or «فاضي، هبدأ من الصفر». Each one is a
   generic week that the user then adjusts.
3. **What are your subjects?** Optional. A few short names, such as «رياضة 1» or «فيزيا».

The guide ends in the editor (US2), showing the week the user picked. «احفظ الجدول» saves it, and the app opens with
it.

**Why this priority**: This is the feature. Without it, a new user cannot start.

**Independent Test**: With no stored settings, open the app, pick «القاهرة», pick «طالب», add two subjects, and save.
The app opens with that week and Cairo's prayer times, and the example notice is gone. No file was used at any
point.

**Acceptance Scenarios**:

1. **Given** no stored settings, **When** the app opens, **Then** the example notice offers «اعمل جدولك» next to the
   import.
2. **Given** the city step, **When** the user picks a city from the list, **Then** its coordinates, time zone and
   usual prayer method are filled in, and the next prayer times show as a check.
3. **Given** the city step, **When** the user taps «استخدم موقعي» and allows it, **Then** the coordinates come from the
   device and the time zone from the device. Nothing is sent anywhere. If they refuse, the list and the manual
   fields stay available, with no error.
4. **Given** the guide, **When** the user leaves it before saving, **Then** nothing is stored and the example stays.
5. **Given** a saved schedule from the guide, **When** the app opens, **Then** it uses it. Progress, tasks and
   workouts are untouched.

---

### User Story 2 - Edit any day in the app (Priority: P1)

In Settings, «عدّل الجدول» opens the editor for the current schedule, wherever it came from (the guide, a file, or
the example). For each day of the week the user can:
- add, change and remove blocks, each with a start time, a kind, a title, and optionally a detail and a subject;
- copy one day onto other days.

A preview shows the day as the app will lay it out. Nothing changes until «احفظ الجدول». Saving checks the whole
schedule with the same rules as an imported file and opens the app again with it.

**Why this priority**: Without it, every change still needs a file.

**Independent Test**: Open the editor, move Monday's study block from 14:30 to 15:00, add a 30-minute rest block,
copy Monday onto Wednesday, and save. Monday and Wednesday show the change, and other days do not.

**Acceptance Scenarios**:

1. **Given** the editor, **When** the user changes blocks, **Then** the day's preview updates at once. The stored
   schedule does not change.
2. **Given** a change that breaks a rule (two blocks at the same time, or a missing title), **When** the user tries
   to save, **Then** the save is refused, and the line in question names the problem in plain Egyptian Arabic. The
   rules are the same as for an imported file.
3. **Given** «انسخ اليوم ده», **When** the user picks target days and confirms, **Then** those days get a copy of the
   blocks, and the other days keep theirs.
4. **Given** unsaved changes, **When** the user leaves the editor, **Then** the app asks first. If they confirm,
   nothing is stored.
5. **Given** a save, **Then** a summary says what changes («الاتنين: 2 بلوك اتغيروا»). It also says that the new week
   applies to every day, past days too, as with an imported file (see Edge Cases). *Replaced by feature 021: the new
   week starts today, and past days keep theirs.*
6. **Given** a day that has two versions (from a file), **Then** the editor shows it as read-only with «اليوم ده ليه
   نسختين من ملف الإعدادات، عدّله من الملف». Saving keeps it exactly as it was.

---

### User Story 3 - Tie a block to a prayer (Priority: P2)

In the editor, a block can be set to start a number of minutes before or after a prayer, such as «قبل المغرب بـ 30
دقيقة». The preview shows today's real time, and a short line explains that the block follows the prayer all year.

**Why this priority**: It is what sets the app apart, and the owner relies on it. It needs US2.

**Independent Test**: Tie Monday's gym block to 30 minutes before Maghrib and save. On a summer date and a winter
date, the block's start follows Maghrib.

**Acceptance Scenarios**:

1. **Given** a block in the editor, **When** the user picks «اربطه بالصلاة», a prayer, before or after, and minutes
   (0–180), **Then** the preview shows its start at today's time for that prayer.
2. **Given** an anchor that does not fit the day (the blocks around it would get too short), **Then** the preview
   says so with the app's existing «اليوم ده مش بيسع…» notice before saving. Saving is still allowed, because the day
   then falls back to fixed times, as it does today.
3. **Given** a file that names a block to take the shift (`absorb`), **Then** the editor keeps it unchanged and shows
   it in the block's line. In this feature it cannot be set from the editor.

---

### User Story 4 - Kinds and subjects (Priority: P2)

In the editor, a «الأنواع» part lists the 9 kinds. For each one the user can change:
- the short name and the long name;
- whether it counts in progress («بيتحسب»);
- whether it can be postponed («ينفع يتأجل»);
- whether it is free time that postponed work may use («وقت فاضي»).

A «المواد» part adds, renames and removes subjects. A subject that is still used by a block cannot be removed until
the blocks stop using it.

**Why this priority**: Labels and subjects make the week the user's own. Without them every user sees the example's
names.

**Acceptance Scenarios**:

1. **Given** a renamed kind, **When** saved, **Then** the new name shows everywhere the kind appears (blocks, week,
   tasks, review), and the kind's id does not change, so nothing stored is lost.
2. **Given** a subject used by blocks, **When** the user tries to remove it, **Then** the app lists the blocks that use
   it and does not remove it.

---

### User Story 5 - Take the schedule out as a file (Priority: P3)

In Settings, «صدّر جدولي كملف» saves the current schedule as a settings file. It can be imported on another device, or
shared with someone who has the same timetable.

**Acceptance Scenarios**:

1. **Given** any schedule, **When** exported and imported again, **Then** the app shows exactly the same week.
2. **Given** the export, **Then** the file holds only the schedule settings, never progress, tasks or workouts.

### Edge Cases

- **Past days follow the new week.** The app draws every day, past ones too, from the current schedule, as it does
  after an import. A tick belongs to a block's start time and kind, so a tick on a block whose start or kind changed
  stays in the data but no longer shows on that past day. The save summary says this plainly. Keeping the old week
  for past days is a separate, later feature. *Done in feature 021 (`specs/021-schedule-history/`).*
- **Unknown fields** in an imported file (for example `rules`, `taskTags`, `course`, or a field from a newer file)
  are kept unchanged when the editor saves.
- **Two people editing:** the editor works on a copy taken when it opens. If the stored schedule changed meanwhile
  (another tab), saving says so and offers to reload.
- **No location permission, or no GPS fix:** the list and the manual fields stay. Nothing waits forever, and a fix
  that takes too long gives up with a line saying so.
- **A city with no clear prayer method:** the app picks a sensible default, and the user can change it.
- **A small screen:** the editor works at 375 px, with 44 px targets. Times are picked with the system time input.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: With no stored settings, the app MUST offer a guide that ends in a saved schedule, with no file. It sets
  the place (city list, device location, or coordinates), the time zone, the prayer method, a starting week and
  optional subjects.
- **FR-002**: The city list MUST work offline, and MUST come from a source whose license allows it, with that license
  in the repo.
- **FR-003**: The device location MUST be asked for only when the user taps «استخدم موقعي». It is used only on the
  device, and never sent (constitution Principle III).
- **FR-004**: The editor MUST let the user add, change, remove and copy blocks on any single-version day, with a live
  preview laid out the way the app lays it out.
- **FR-005**: Every save from the guide or the editor MUST pass `validateSettings`, the same as an import, and MUST go
  through the storage path's `settings` store.
- **FR-006**: The editor MUST let the user tie a block to a prayer (prayer, before or after, minutes 0–180), and MUST
  keep any existing `absorb` unchanged.
- **FR-007**: Days with two versions, and every settings field the editor does not edit, MUST be saved back exactly as
  they were.
- **FR-008**: The 9 kinds' names and their `track`, `postpone` and `free` options MUST be editable. Their ids MUST NOT
  change.
- **FR-009**: Subjects MUST be addable and renamable. They MUST be removable only when no block uses them.
- **FR-010**: «صدّر جدولي كملف» MUST save the schedule as a valid settings file, and importing that file MUST give the
  same week.
- **FR-011**: Nothing may change progress, tasks or workouts, and no mark is made or cleared (Principle II).

### Key Entities

- **Draft schedule**: a copy of the settings that the guide or editor changes. It becomes stored only on «احفظ الجدول».
- **City**: name (Arabic and English), country, coordinates, time zone, and the usual prayer method.
- **Week template**: a generic starting week for the guide.

## Success Criteria *(mandatory)*

- **SC-001**: A new user goes from first open to their own saved week in under 3 minutes, with no file.
- **SC-002**: 100% of schedules saved from the editor pass `validateSettings`. An export, imported again, gives the
  same week (checked on generated schedules).
- **SC-003**: The editor works at 375 px, with every control at least 44 px and no sideways scroll.
- **SC-004**: Every existing check and E2E test passes. New E2E tests cover the guide, the editor, the prayer tie and
  the export.

## Assumptions

- Saving the schedule opens the app again, as an import does today. Making the screens follow a schedule change
  without a reload (B3 in the 010 review) is not needed for this feature.
- The settings file format keeps `version: 1`. The editor writes only fields the format already has, so no migration
  is needed.
- The city list is a few hundred entries and stays well under 100 KB in the built app.
