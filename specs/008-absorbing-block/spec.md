# Feature Specification: Choose Which Block Absorbs a Prayer Shift

**Feature Branch**: `008-absorbing-block`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "لما بلوك مربوط بصلاة يتحرك (زي بلوك قبل المغرب في الصيف)، الفرق مش لازم ييجي من آخر بلوك في اليوم. المستخدم يقدر يختار بلوك بعد البلوك المربوط هو اللي ياخد الفرق، فمثلاً الشغل اللي قبل البلوك المربوط يطول والشغل اللي بالليل يقصر بنفس المقدار، ومجموع الشغل ووقته الخاص في آخر اليوم يفضلوا زي ما هم. الميزة عامة لأي جدول، وجدول أي حد بيفضل في ملف إعداداته الخاص."

## Background

Feature 004 lets a block follow a prayer time. When that block moves, every block after it moves with it,
the block just before it grows or shrinks, and the **last block of the day** takes up the difference. If
the last block would fall under 15 minutes, the whole day goes back to its fixed times.

That works when the shift is small, but not when a prayer moves a lot through the year. For example, a
block before Maghrib can start about 90 minutes later in midsummer than in its fixed plan. Then two things
go wrong:
- **The day stops fitting:** the last block, often the user's own free time, is too short to take
  90 minutes, so the day falls back to fixed times on exactly the days the anchor matters most.
- **The day stays dishonest when it fits:** the block before the anchor grows by 90 minutes and the user's
  free time shrinks by 90, so the planned hours of that category rise and the free time disappears.

This feature lets the user name a block after the anchor that takes the difference instead.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A chosen block takes the shift, and the rest of the day keeps its times (Priority: P1)

A user's day has work, then a block tied to a prayer, then more work later in the evening, then their own
time at the end. They mark the evening work block as the one that absorbs the shift. When the prayer moves
the anchored block 90 minutes later, the work before it gets 90 minutes longer and the evening work gets 90
minutes shorter. Every block after the evening work stays at its usual time, and the user's own time at the
end of the day does not change.

**Why this priority**: This is the whole feature. Without it, a large prayer shift either breaks the day
or quietly moves hours from one kind of activity to another.

**Independent Test**: In a settings file, anchor one block and mark a later block as absorbing. Check a date
where the anchor moves later and a date where it moves earlier:
- Only the block before the anchor and the absorbing block change length, by equal and opposite amounts.
- Every block after the absorbing block keeps its fixed time.
- The day's start and end do not move.

**Acceptance Scenarios**:

1. **Given** an anchored block that moves N minutes later and an absorbing block after it, **When** the user
   opens that date, **Then** the block before the anchor is N minutes longer, the absorbing block is N
   minutes shorter, the blocks between the anchor and the absorbing block keep their lengths and move N
   minutes later, and every block after the absorbing block is at its fixed time.
2. **Given** the same day on a date where the anchored block moves N minutes earlier, **When** the user opens
   it, **Then** the block before the anchor is N minutes shorter and the absorbing block is N minutes longer.
3. **Given** the block before the anchor and the absorbing block are of the same kind (for example both work),
   **When** the anchor moves, **Then** the day's planned hours for that kind, and for every other kind, are
   unchanged.
4. **Given** the absorbing block would become shorter than 15 minutes (or than it already is at its fixed
   time, when that is less), **When** the user opens that date, **Then** the whole day shows its fixed times
   with the existing note that the day could not fit the prayer time, exactly as feature 004 does today.
5. **Given** a day with no absorbing block, **When** the user opens it, **Then** it behaves exactly as before
   this feature (the last block takes the difference).

---

### User Story 2 - Marking the absorbing block is easy and hard to get wrong (Priority: P2)

In the settings file they already import, the user names, on the anchored block, which later block takes
the shift. The importer checks the name: it must be a block after the anchored block on the same day, and
before the next anchored block. A wrong name is refused with a message naming the day and block, and nothing
stored changes.

**Why this priority**: A wrong mark would lay out a confusing day. Catching it at import keeps the plan
trustworthy.

**Independent Test**: Import files that name a correct block, a block that does not exist, a block before
the anchor, and a block at or after the next anchor. Only the correct one is accepted, and each of the
others gets a message naming the day and block. Stored settings and progress are unchanged after a refused
import.

**Acceptance Scenarios**:

1. **Given** an anchored block that names a later block before the next anchor, **When** the user imports
   the file, **Then** it is accepted, and the import summary counts the absorbing blocks.
2. **Given** an anchored block that names a block that does not exist on that day, or one at or before the
   anchored block, **When** the user imports the file, **Then** it is refused with a message naming the day
   and block.
3. **Given** an anchored block that names a block at or after the next anchored block, **When** the user
   imports the file, **Then** it is refused the same way.
4. **Given** a day with two versions, **When** the name is set in one version, **Then** it applies to that
   version only, and the other version keeps its own rule.

---

### Edge Cases

- **Two anchors on one day:** each anchor may have its own absorbing block before the next anchor. The
  shift from the first anchor stops at its absorbing block, and the second anchor starts fresh from its
  fixed time.
- **The last block of the day is named as absorbing:** this is the same as today's behaviour and is allowed.
- **Prayer times are unavailable:** every block, including the absorbing one, is at its fixed time, with
  the existing note (unchanged from 004).
- **The anchor does not move on a date** (shift of 0): every block is at its fixed time.
- **Ticks:** they stay on the right block, because block identity keeps using the fixed start, as in 004.
- **A settings file made for this feature, imported in an older copy of the app:** it is refused with the
  existing "newer version" or "invalid" message. It is never misread.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The settings format MUST let the user name, on an anchored block, one later block on the same
  day that absorbs that anchor's shift.
- **FR-002**: When an absorbing block exists for an anchor:
  - The blocks from the anchor up to the absorbing block MUST shift with the anchor.
  - The absorbing block MUST end at its fixed end time.
  - Every later block MUST stay at its fixed time.
  - The block just before the anchor MUST end where the anchor starts, as in 004.
- **FR-003**: When no absorbing block exists for an anchor, the layout MUST be exactly as in feature 004.
- **FR-004**: When any absorbing block (the block before an anchor, a marked absorbing block, or the last
  block) would end up shorter than 15 minutes, or shorter than it already is at its fixed time when that is
  less, the whole day MUST use its fixed times, with the existing "does not fit" note.
- **FR-005**: The planned length of every block other than the block before the anchor and the absorbing
  block MUST be unchanged on every date.
- **FR-006**: The importer MUST refuse, with a message naming the day and block and without changing stored
  settings or progress, any of these:
  - a name that matches no block on that day;
  - a name that matches a block at or before the anchored block;
  - a name that matches a block at or after the next anchored block.
- **FR-007**: The import summary MUST report how many blocks are marked absorbing. The example settings
  MUST include a worked example of an absorbing block, with generic values.
- **FR-008**: The Today view, Week view, the now/next card and the per-category totals MUST all use the same
  computed times (unchanged rule from 004).
- **FR-009**: The feature MUST NOT set, clear, or move any done mark (Principle II). It MUST work offline
  and send nothing off the device (Principle III).
- **FR-010**: The repository MUST contain no real person's schedule. The example and all specs use generic
  values (Principle VI).
- **FR-011**: The dev check for anchored layouts MUST cover absorbing blocks with an independent oracle and
  a year sweep, and its self-test MUST notice when the absorbing rule is broken.

### Key Entities

- **Anchored block** (from 004): a block whose start follows a prayer time, with a fixed fallback time.
- **Absorbing block**: a block after an anchored block, on the same day and in the same version, whose
  length changes by the opposite of the anchor's shift, so that later blocks keep their fixed times.
- **Absorbing pair**: the block just before an anchor and that anchor's absorbing block (or the day's last
  block, when no block is marked). Only these two change length on a date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On every date of a two-year sweep with the example settings, every block after an absorbing
  block starts at its fixed time on 100% of dates where the day fits.
- **SC-002**: On every date of the sweep, the lengths of the two absorbing blocks change by equal and
  opposite amounts, and every other block keeps its planned length (0 minutes difference).
- **SC-003**: When the block before the anchor and the absorbing block are of the same kind, the day's
  planned hours per kind change by 0 minutes on every date.
- **SC-004**: A schedule whose anchor moves up to 90 minutes later than its fixed time, with an absorbing
  block of at least 105 minutes, fits on 100% of dates (no fallback to fixed times).
- **SC-005**: 100% of misplaced absorbing marks in the test files are refused with a message naming the
  day and block. Stored data is byte-for-byte unchanged after each refusal.
- **SC-006**: Days without an absorbing mark lay out exactly as before. A parity check over two years shows
  0 differences for settings files that do not use the mark.

## Assumptions

- The name is written in the settings file, like the anchor from 004. There is no in-app editor for it,
  because the schedule as a whole has none.
- The minimum length for an absorbing block stays at 15 minutes, as in 004.
- An absorbing block applies to the nearest anchor before it. The user does not pick a different anchor.
- Moving hours between two different kinds of activity (for example from study to work) is allowed when the
  user chooses two blocks of different kinds. The per-kind totals then change by the shift, which is the
  user's choice and is shown honestly.
- Out of scope: an in-app schedule editor, absorbing across days, and changing how prayer times are
  computed.
