# Feature Specification: Automatic Schedule Switch at Maghrib 5:45pm

**Feature Branch**: `001-auto-schedule-switch` (not created; no branch hook is configured)

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "تبديل نسخة الجدول تلقائيًا لما المغرب يعدّي 5:45م"

## Clarifications

### Session 2026-10-13

- Q: When prayer-time calculation fails, should the fallback follow the real 5:45pm Maghrib line or the summer-time dates? → A: Follow the real line: late version from about 16 February through the last Thursday of October, early otherwise.
- Q: If the owner misses the first day after a switch, when does the notice appear? → A: The first time the app is opened after the switch, however many days later, until dismissed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The day's plan follows the sun without me touching anything (Priority: P1)

The owner's gym (between Maghrib and Isha) and split work shifts are built around Maghrib. Some
days have two versions: a "late" version used while Maghrib is at or after 5:45pm, and an "early"
version used once Maghrib is earlier than 5:45pm. The owner opens the app and sees the version that
matches that date's real Maghrib, without choosing it, and every block still sits in the right
place relative to prayer.

**Why this priority**: When the clocks go back at the end of October, Maghrib jumps by about an
hour. If the plan did not move with it, the gym and the "finish work before Maghrib" blocks would
land at the wrong time of day, which breaks the plan's honesty (Product Principle 1).

**Independent Test**: Open the app for a date before the change and a date after it (for example
2026-10-29 and 2026-10-30) on a day that has two versions (Saturday, Monday, or Thursday). The two
dates show different block times for work and gym, and in both the gym falls between that date's
Maghrib and Isha.

**Acceptance Scenarios**:

1. **Given** a date whose Maghrib is 5:45pm or later, **When** the owner opens Today, **Then** the
   late version of that day's blocks is shown.
2. **Given** a date whose Maghrib is earlier than 5:45pm, **When** the owner opens Today, **Then**
   the early version is shown.
3. **Given** the last day on the late version and the first day on the early version, **When** the
   owner moves between them, **Then** the switch happens at the day boundary, never in the middle
   of a day.
4. **Given** a day with only one version, **When** the owner opens it, **Then** it is unaffected by
   the switch.

---

### User Story 2 - Past and future days show the version that belongs to them (Priority: P2)

The owner browses the Week view and past days in the day review. Each date shows the version that
matches its own Maghrib, so reviewing last week does not show this week's version, and ticks already
made on a past day are not lost or moved.

**Why this priority**: The day review and weekly planned-vs-done hours depend on each date keeping a
stable plan.

**Independent Test**: With ticks recorded on 2026-10-26, open the Week view on 2026-11-02 and review
2026-10-26. It shows the late version with its ticks intact, and 2026-11-02 shows the early version.

**Acceptance Scenarios**:

1. **Given** ticks saved on a date before the switch, **When** the owner views that date after the
   switch, **Then** the blocks and ticks appear as they were.
2. **Given** a week that spans the switch, **When** the owner opens the Week view, **Then** each day
   shows its own version and the planned hours match the version shown.

---

### User Story 3 - I can tell which version I'm looking at (Priority: P3)

The owner can tell that the plan changed at the switch, so a different gym time is not mistaken for
a mistake. The first time the owner opens the app after a switch, the app shows a short notice that
the plan moved because Maghrib moved, however many days later that is, and it does not show any
permanent label.

**Why this priority**: Avoids confusion the first morning after the change; lower value than the
switch itself.

**Independent Test**: Open the app on 2026-10-30, and separately on 2026-11-03 without having opened
it in between, and check for the notice; dismiss it and reopen.

**Acceptance Scenarios**:

1. **Given** the first day on the new version, **When** the owner opens Today, **Then** the notice
   is shown.
2. **Given** the owner did not open the app on the switch day, **When** they open it several days
   later, **Then** the notice is shown on that first open.
3. **Given** the notice was dismissed, **When** the owner reopens the app the same day or later,
   **Then** it does not appear again for that switch.

---

### Edge Cases

- Prayer times cannot be computed on the device: the app MUST still pick a version, using a yearly
  repeating rule: the late version from 16 February through the last Thursday of October, and the
  early version on all other dates.
- The day runs until 1:00am: between midnight and 1:00 the app shows the previous date, so the
  version MUST be the one for that previous date.
- A date whose Maghrib is exactly 5:45pm belongs to the late version.
- The device clock or time zone differs from Cairo: the version MUST be decided by the Cairo date.
- Offline: the choice MUST work with no network.
- Several days offline across the switch: no manual step is needed to get the new version.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: For each date, the system MUST choose the late version when that date's computed
  Maghrib (Giza, Egyptian General Authority of Survey method) is at or after 17:45, and the early
  version otherwise.
- **FR-002**: The choice MUST be made per calendar date, never changing within a single day.
- **FR-003**: Today, Week, the day review, and planned-vs-done hours MUST all use the version chosen
  for the date they display.
- **FR-004**: The choice MUST NOT require any action by the owner and MUST work offline.
- **FR-005**: Days defined with a single version MUST be unaffected.
- **FR-006**: Ticks, skips, and one-off blocks already saved for a date MUST remain attached to that
  date and visible after the switch.
- **FR-007**: The system MUST NOT mark, unmark, or move any block as done as a result of the switch
  (constitution Principle II).
- **FR-008**: When prayer times are unavailable, the system MUST select the late version from
  16 February through the last Thursday of October, and the early version otherwise, with no yearly
  manual update. This tracks the real 5:45pm Maghrib line (Maghrib passes 5:45pm around 16 February
  and drops below it when the clocks go back). For 2026 it gives late through 2026-10-29 and early
  from 2026-10-30, the same as the prayer-time result, and it MUST agree with that result on every
  date except at most one day around 16 February.
- **FR-009**: The switch MUST NOT send any data off the device (constitution Principle III).
- **FR-010**: The first time the app is opened after a version switch, however many days later, the
  system MUST show a short notice that the plan moved because Maghrib moved. The owner MUST be able
  to dismiss it, and it MUST NOT reappear for that switch after dismissal.

### Key Entities

- **Day plan**: the blocks for one weekday, with one version or two (late and early).
- **Version**: late (Maghrib at or after 5:45pm) or early (Maghrib before 5:45pm).
- **Block**: a timed activity with a category and a done/skipped state stored per date.
- **Prayer times**: computed per date for Giza; Maghrib is the deciding value.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On every date from 2026-10-01 to 2026-12-31, the version shown matches the rule in
  FR-001, with 0 mismatches in a date-by-date check.
- **SC-002**: The owner performs 0 manual steps to get the new version after the clocks change.
- **SC-003**: On both versions, 100% of gym blocks fall between that date's Maghrib and Isha, and
  100% of "work before Maghrib" blocks end before Maghrib.
- **SC-004**: 100% of ticks saved before the switch still display unchanged after it.
- **SC-005**: The switch works in airplane mode on a phone with no loss of function.

## Assumptions

- The owner is the only user; the schedule is the one already defined for Fall 2026.
- The switch rule (Maghrib at or after 17:45) already exists in the current app as an automatic,
  per-date choice. A date-by-date check using the bundled prayer-time library gives the late version
  through 2026-10-29 (Maghrib 18:11) and the early version from 2026-10-30 (Maghrib 17:10), when the
  clocks go back. This spec therefore defines the expected behavior to verify, plus the gaps in the
  clarifications, not an unrelated new mechanism.
- Egypt's clocks go back overnight into the last Friday of October (2026-10-30 in the check above),
  so the last Thursday of October is the last late-version day. The 16 February start comes from a
  date-by-date check with the bundled prayer-time library for 2027 (Maghrib 17:44 on 15 February,
  17:54 on 1 March); the exact day can shift by a day between years, and the clock-change date
  should be checked against the official announcement each year.
- Prayer times keep using the Egyptian General Authority of Survey method for Giza.
- Out of scope: changing the 17:45 threshold, adding more versions, midterm dates, and syncing
  between devices.
