# Feature Specification: Blocks Anchored to a Prayer Time

**Feature Branch**: `004-prayer-anchored-blocks`

**Created**: 2026-10-13

**Status**: Draft (clarified 2026-10-13)

**Input**: User description: "أي بلوك في الجدول يقدر يتربط بوقت صلاة من الإعدادات: يبدأ بعد أو قبل الصلاة بمدة ثابتة (مثلاً 30 دقيقة قبل المغرب)، فيتحرك طول السنة مع وقت الصلاة الفعلي بدل ما يكون وقت ثابت في نسختين (متأخرة ومبكرة). البلوكات اللي قبله وبعده تتظبط عشان كل بلوك يفضل بطوله الحقيقي من غير تداخل واليوم يخلص في معاده، ومفيش حاجة تتضغط عشان الخطة تبان كاملة. لو أوقات الصلاة مش متاحة، البلوك يرجع لوقته الثابت. الميزة عامة: أي مستخدم يربط أي بلوك بأي صلاة من ملف إعداداته، والريبو العام ما فيهوش أي جدول أو تفاصيل شخصية."

## Clarifications

### Session 2026-10-13

- Q: When an anchored block moves, which blocks absorb the change in time so every other block keeps its real length? → A: Every block after the anchored one shifts together with it, and the last block of the day absorbs the difference (it gets shorter or longer). The block just before the anchored one ends where the anchored block starts, so it stretches or shrinks by the same amount; the day's start and end do not move.
- Q: What happens on a date where the anchored time cannot be honoured without squeezing a block or running past the end of the day? → A: The block uses its fixed time on that date, and the app shows a short note saying the anchor was not applied because it does not fit. Nothing is squeezed and nothing changes silently.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A block follows the real prayer time all year (Priority: P1)

A user has an activity that only makes sense relative to a prayer, for example an exercise block that
should start 30 minutes before Maghrib. Maghrib moves by hours across the seasons, so a fixed clock
time is wrong on most days: two fixed versions (a late one and an early one) are only right on a few
dates. In their settings file the user marks that block as anchored: a prayer (Fajr, Dhuhr, Asr,
Maghrib, or Isha), a direction (before or after), and a number of minutes. From then on, on every date
the block starts at that date's real prayer time plus or minus those minutes, rounded to the nearest
5 minutes, and the Today and Week views show it there.

**Why this priority**: This is the whole feature. Without it the user keeps editing settings by season
or accepts blocks that sit at the wrong time.

**Independent Test**: Anchor one block 30 minutes before Maghrib. Open that weekday on four dates
spread over a year. On each, the block starts 30 minutes (rounded to 5) before that date's Maghrib as
shown in the app's prayer times.

**Acceptance Scenarios**:

1. **Given** a block anchored 30 minutes before Maghrib, **When** the user opens a day on any date,
   **Then** the block starts 30 minutes before that date's Maghrib, rounded to the nearest 5 minutes.
2. **Given** a block anchored 20 minutes after Isha, **When** the user opens a day, **Then** it starts
   20 minutes after that date's Isha, rounded to the nearest 5 minutes.
3. **Given** a block with no anchor, **When** the user opens any day, **Then** it appears at its fixed
   time exactly as before this feature.
4. **Given** the prayer times shown on the same day, **When** compared with the block's start,
   **Then** they agree to within the 5-minute rounding.

---

### User Story 2 - The rest of the day stays honest (Priority: P1)

When an anchored block moves, the blocks around it must still make sense: no block overlaps another,
no block is squeezed below its planned length to make the plan look complete, and the day still ends
at its usual end. The user can see this on any date of the year, including the earliest and the latest
prayer time.

**Why this priority**: Moving one block alone would leave overlaps or holes. Product Principle 1 says
the day must fit honestly, so this is part of the same promise as US1.

**Independent Test**: On the day of the year with the latest prayer time and the day with the earliest,
open an anchored day. Add up the block lengths: every block other than the two that absorb the change
(the one just before the anchored block and the last one of the day) keeps its planned length, none
overlap, and the last block ends exactly at the day's end.

**Acceptance Scenarios**:

1. **Given** an anchored day, **When** the user opens it on the latest-prayer-time date, **Then** no
   block is shorter than planned, none overlaps another, and the day ends by its usual end.
2. **Given** the same day on the earliest-prayer-time date, **Then** the same holds.
3. **Given** the Week view, **When** the anchored block moves between dates, **Then** the planned hours of
   every block other than the two absorbing ones do not change, and the two absorbing blocks change by equal
   and opposite amounts (what one gains the other loses).
4. **Given** a date where the anchored time cannot be honoured honestly (it would leave an absorbing
   block too short or push the day past its end), **When** the user opens it, **Then** the anchored block
   is at its fixed time on that date and a short note says the anchor was not applied.
5. **Given** an anchored day on a date that fits, **When** compared with the same day laid out without the
   anchor, **Then** the day's first start and last end are the same.

---

### User Story 3 - Without prayer times, the block keeps a fixed time (Priority: P2)

Prayer times need the user's location and the prayer calculation, and may be unavailable (no location
in the settings, or the calculation fails). Each anchored block therefore also carries a fixed time. When
prayer times are unavailable, the block shows at that fixed time, the rest of the day is laid out as it
is without anchors, and the user is told that the anchor is not being applied.

**Why this priority**: The app must keep working offline and must never hide a block because it could
not be placed.

**Independent Test**: Remove the location from the settings (or simulate the calculation failing). Open
an anchored day: the block is at its fixed time and a short note says the prayer time was not available.

**Acceptance Scenarios**:

1. **Given** prayer times are unavailable, **When** the user opens an anchored day, **Then** the block
   is shown at its fixed time and the day is not otherwise changed.
2. **Given** prayer times become available again, **When** the user opens the day, **Then** the block
   follows the prayer time again with no action from the user.

---

### User Story 4 - Anchors are easy to set and hard to get wrong (Priority: P3)

The user writes the anchor in the settings file they already import. The importer checks it: the prayer
name, the direction, and the minutes must be valid; a file with an anchored block that has no block before
or after it in its day, or with anchors that collide, is told so at import, naming the day and block,
before it replaces anything. The
generic example in the repository shows one anchored block so a new user can copy it.

**Why this priority**: Catches mistakes before they reach the day view, and documents the format.

**Independent Test**: Import a file with an unknown prayer name, then a file with minutes outside the
allowed range, then a file whose anchored block is the first of its day, then a valid anchored file: the first three are rejected with a message naming the block;
the third is accepted.

**Acceptance Scenarios**:

1. **Given** a settings file with an anchor naming an unknown prayer, **When** the user imports it,
   **Then** it is rejected, the message names the day and block, and nothing is replaced.
2. **Given** a valid anchored file, **When** the user imports it, **Then** the summary says how many
   blocks are anchored.
3. **Given** the example settings, **When** a user opens the app, **Then** at least one example block is
   anchored so the feature can be seen working.

---

### Edge Cases

- The prayer time is later than the day allows (the anchored time would leave an absorbing block shorter
  than the minimum, or push the day past its end): the block uses its fixed time on that date and the user
  is told (FR-006).
- An anchored block is the first block of the day, or the last: it has no block before it, or no block
  after it, to absorb the change. Such a block cannot be anchored; the importer rejects it (FR-008).
- Two blocks anchored to the same prayer on the same day, or an anchor that would reorder blocks: the
  importer rejects it with a message naming the blocks.
- A block anchored on a day with two versions (late and early): the anchor applies to the block in each
  version that carries it; the version rule still decides which version is shown.
- High latitudes where a prayer time does not exist on some dates: treated as "prayer times unavailable"
  for that date (US3).
- Daylight-saving or time-zone changes: the block follows the prayer time as shown for that date in the
  user's time zone.
- A tick (done) on an anchored block: stays attached to the block when it moves between dates; it is
  never set, cleared, or moved by the anchoring (constitution Principle II).
- A block that has an anchor and is then edited in the app (feature 003 covers tasks and appointments
  only): schedule blocks are not editable in the app, so no conflict arises.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The settings format MUST let any schedule block be anchored to a prayer (one of the five
  daily prayers), a direction (before or after), and a number of minutes.
- **FR-002**: For an anchored block, the app MUST compute its start on each date as that date's prayer
  time plus or minus the minutes, rounded to the nearest 5 minutes, using the user's location, time zone,
  and prayer method from the settings.
- **FR-003**: Blocks without an anchor MUST appear exactly as before this feature.
- **FR-004**: Each anchored block MUST also carry a fixed time, used when prayer times are unavailable
  (no location, calculation failure, or no such prayer on that date).
- **FR-005**: When an anchored block moves, the app MUST keep every block's planned length, MUST NOT
  produce overlaps, and MUST keep the day's start and end. Every block after the anchored one shifts with
  it, the block just before the anchored one ends where it starts, and the last block of the day absorbs
  the difference. All other blocks keep their planned length.
- **FR-006**: When the anchored time cannot be honoured without leaving an absorbing block shorter than
  the minimum length or pushing the day past its end, the app MUST show the anchored block at its fixed
  time for that date, MUST NOT squeeze or change any other block, and MUST show a short note that the
  anchor was not applied.
- **FR-007**: When prayer times are unavailable, the app MUST show each anchored block at its fixed time
  and show a short note saying the anchor is not being applied.
- **FR-008**: The importer MUST validate anchors (known prayer, valid direction, minutes within an allowed
  range, no two anchors that reorder or collide, and no anchored block that is the first or the last block of its day) and MUST reject an invalid file with a message naming
  the day and block, without changing stored settings or progress.
- **FR-009**: Where a day has two versions, the anchor MUST apply to the block in each version that carries
  it, and the version rule MUST keep deciding which version is shown.
- **FR-010**: The Today view, Week view, now/next card, and per-category totals MUST all use the same
  computed times, so they never disagree.
- **FR-011**: Anchoring MUST NOT set, clear, or move any done state or tick (constitution Principle II).
- **FR-012**: The feature MUST work offline and MUST NOT send any data off the device (Principle III).
- **FR-013**: The repository MUST contain no real person's schedule or location: the example settings and
  all specs use generic values only (Principle VI), and the privacy check MUST still pass.
- **FR-014**: The import summary MUST report how many blocks are anchored, and the example settings MUST
  include at least one anchored block as a worked example.

### Key Entities

- **Anchor**: belongs to one schedule block. A prayer, a direction (before or after), a number of minutes.
- **Anchored block**: a schedule block with an anchor and a fixed time (the fallback).
- **Day layout**: the list of blocks for one date after anchors are applied, with start and end times.
- **Absorbing blocks**: the block just before an anchored block and the last block of the day. They are the
  only blocks whose length changes when an anchored block moves.
- **Prayer-time availability**: whether the prayer times for a date can be computed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Over a full year, on 100% of dates with prayer times available, an anchored block starts at
  the prayer time plus or minus its minutes, within the 5-minute rounding.
- **SC-002**: On 100% of dates in a year, no day shows overlapping blocks, and no block other than the two
  absorbing ones (the block just before the anchored one and the last block of the day) is shorter or longer
  than planned.
- **SC-003**: On 100% of dates, the day starts and ends at its usual times.
- **SC-004**: With prayer times unavailable, 100% of anchored blocks appear at their fixed times and the
  user is told.
- **SC-005**: A user can anchor a block by editing one entry in the settings file and importing it; a wrong
  entry is rejected at import with a message naming the block in 100% of tested cases.
- **SC-006**: Days with no anchored blocks are identical to their pre-feature layout for every date of a
  year (no change for existing settings files).
- **SC-007**: Feature use makes 0 network requests and works in airplane mode.

## Assumptions

- Prayer times come from the calculation the app already uses (location, time zone, and method from the
  settings); this feature adds no new data source.
- The five prayers available are Fajr, Dhuhr, Asr, Maghrib, and Isha; sunrise is out of scope.
- The anchor minutes are limited to a range of up to 180 minutes before or after; the exact limit is
  documented in the settings contract at planning time.
- Rounding to 5 minutes matches how prayer times are already displayed.
- A block has real length only up to the next block's start (the schedule has no gaps), so the block just
  before an anchored block necessarily ends where the anchored block starts; that is why it also absorbs part
  of the change, as noted in the clarification answer.
- The minimum length an absorbing block may be left with is 15 minutes; the exact value is fixed at planning
  time and documented in the settings contract.
- Existing settings files stay valid: anchors are optional, and a file without them behaves as today.
- Out of scope: anchoring several blocks at once to one prayer in a single entry, anchoring to sunrise or
  to another block, editing anchors inside the app, notifications, and recurring-date rules.
- Independent of features 001 to 003; it builds on the settings format (002) and the day-version rule (001).
