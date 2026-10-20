# Feature Specification: Ask on Its Own to Postpone What Was Not Done

**Feature Branch**: `015-ask-to-postpone`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "ال feature بتاعت لو في تاسكات متعملتش انهارده تتاجل بكره او في اي يوم في الاسبوع
تلقائياً مش موجوده". The owner's choice (2026-10-18), among «يسألني لوحده», «أوتوماتيك تماماً» and «هجرّب
الموجود الأول»:
- **«يسألني لوحده»**: the app brings the question up by itself after a day ends, with the proposed places
  already worked out, and one tap postpones them all. Nothing moves until the user taps.

## Background

Feature 009 added postponing. Its entry point is the day review: the user has to remember to open «راجع يومك»,
then tap «أجّلها» on each item or «أجّل اللي فاضل كله». The owner reads this as "postponing does not exist",
because nothing happens unless they go looking for it. On a busy day, the day that most needs it, the review
is the step that gets skipped. The open blocks then stay open on a past day and are forgotten.

The rules from 009 stay as they are: what can be postponed (kinds marked «ينفع يتأجل», and tasks due that day),
where it goes (the first free time that holds it, within 7 days, never in the past), how it is stored, and the
single undo. This feature only changes **who starts it**: the app asks, instead of waiting to be asked.

Moving anything without the user's tap would break Principles I and II (human review before any action;
checking off is a human act). That is why the owner chose a question, not an automatic move.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The app asks about yesterday, and one tap postpones it all (Priority: P1)

The user did not finish two study blocks yesterday and did not open the review. This morning they open the app.
At the top of Today a notice says «فيه 2 حاجات ماتعملتش امبارح», lists each item with the day and time the app
proposes for it, and offers «أجّل الكل», «راجعها» and «مش دلوقتي». They tap «أجّل الكل». Both items now show at
their new places, yesterday's blocks show as postponed, and the notice is gone.

**Why this priority**: This is the feature. It turns postponing from something the user has to remember into
something the app brings up.

**Independent Test**: With two postponable blocks left open on a past day and free time in the coming days:
- open the app the next day: the notice shows both items with their proposed places;
- tap «أجّل الكل»: both appear on their new days, the past day shows them as postponed, and nothing is marked done;
- open the app again: the notice does not come back.

**Acceptance Scenarios**:

1. **Given** a day that has ended with open blocks of postponable kinds or open tasks due that day, **When** the
   user opens the app for the first time after it ended, **Then** Today shows the notice with the number of
   items, each item with its proposed day and time (tasks with their new due date), and the three buttons.
   Nothing has changed yet.
2. **Given** the notice, **When** the user taps «أجّل الكل», **Then** every item that has a place is postponed in
   one step, exactly as 009's «أجّل اللي فاضل كله» does, and one undo puts everything back.
3. **Given** an item with no free place in the next 7 days, **When** the notice is built, **Then** that item says
   «مفيش مكان، هيفضل زي ما هو», and «أجّل الكل» leaves it open.
4. **Given** the notice, **When** the user does nothing and moves to another tab or closes the app, **Then**
   nothing changes, and the notice shows again the next time Today opens on that day.

---

### User Story 2 - Change the places first, or say not now (Priority: P2)

The user wants one of the items on Thursday, not tomorrow. They tap «راجعها», which opens the review of that past
day (009), where they can postpone each item to the day and time they choose, or mark it done or cancelled. On
another day they are in a hurry and tap «مش دلوقتي»; the notice goes away and does not ask about that day again.

**Why this priority**: Accepting all proposals is the common case; changing them or putting the question off
must stay one tap away.

**Independent Test**:
- «راجعها» opens the review of the day the notice is about, with the same items open.
- «مش دلوقتي» hides the notice; reopening the app does not show it again for that day, and the day's items stay
  open and can still be postponed from that day's review.

**Acceptance Scenarios**:

1. **Given** the notice, **When** the user taps «راجعها», **Then** the review of that day opens, and the notice is
   not shown again for that day.
2. **Given** the notice, **When** the user taps «مش دلوقتي», **Then** it closes, nothing changes, and the app does
   not ask about that day again.
3. **Given** a day the user already reviewed (any postponing, ticking or cancelling there after the day ended
   leaves nothing open), **When** the app opens, **Then** no notice is shown for it.

---

### User Story 3 - Several days missed (Priority: P3)

The user did not open the app for three days. When they open it, one notice covers all three days, oldest first,
named by day («فيه 5 حاجات ماتعملتش من يوم السبت»). «أجّل الكل» places them all, oldest first, without
overlapping each other.

**Why this priority**: It happens, but less often than a single missed day.

**Independent Test**: Leave postponable blocks open on three past days, open the app: one notice lists all of them
with their days; «أجّل الكل» places them without overlaps, and one undo restores all three days.

**Acceptance Scenarios**:

1. **Given** open items on several ended days since the last time the app asked, **When** the app opens, **Then**
   one notice lists them grouped by day, oldest first, up to 7 days back.
2. **Given** that notice, **When** the user taps «أجّل الكل», **Then** each day's items are postponed from that
   day, places never overlap, and one undo reverses every day together.
3. **Given** that notice, **When** the user taps «راجعها», **Then** the review of the oldest listed day opens, and
   the notice comes back for the other days once that review is closed.

---

### Edge Cases

- **When a day ends**: at 01:00, as everywhere in the app. Opening the app at 00:30 still counts as the same day,
  so no notice yet.
- **Today is never asked about**: blocks later today are not late; the notice is only about days that ended.
- **First run of this feature**: only yesterday is asked about, so an existing user is not flooded with weeks of
  old open blocks.
- **Older than 7 days**: days more than 7 days back are never asked about; they stay in their own reviews.
- **Days already handled**: a day with nothing open (all ticked, cancelled or postponed) is skipped and counts as
  asked.
- **Settings without postponable kinds** (files older than 009): only open tasks due that day can be listed. With
  none, no notice shows, as before.
- **The example schedule**: it behaves the same way; its generated items are examples only.
- **Postponed items left undone again**: an item postponed to a day that then ends open is asked about on that
  day, like any other block, and keeps the date it was first planned for (009).
- **Several devices or tabs**: the notice reads the stored data when Today opens; an item already postponed
  elsewhere is not listed.
- **Undo after «أجّل الكل»**: it puts back the items and their days, and the notice does not come back for those
  days (the question was answered).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When Today opens, the app MUST find the ended days since the last day it asked about, at most 7 days
  back, that still have open tracked blocks of postponable kinds or open tasks due on them.
- **FR-002**: If there are any, Today MUST show one notice at the top with the number of items, the days they
  are from, each item with its proposed day and time (tasks with their new due date), and «أجّل الكل», «راجعها»
  and «مش دلوقتي».
- **FR-003**: The proposals MUST follow 009's rules unchanged (FR-004 there): the first free time that holds the
  item, from the day after its own day, never in the past, at most 7 days ahead, and items in one notice MUST NOT
  overlap each other or existing extra blocks.
- **FR-004**: «أجّل الكل» MUST postpone every item that has a place in one step, store them exactly as 009 does,
  and offer one undo that restores the state before it.
- **FR-005**: «راجعها» MUST open the existing review of the oldest listed day.
- **FR-006**: The app MUST remember which days it has asked about:
  - «أجّل الكل» and «مش دلوقتي» MUST mark every listed day as asked;
  - «راجعها» MUST mark only the day whose review it opens;
  - an ended day with nothing open MUST count as asked;
  - a day that was only shown, with no tap, MUST still be asked about next time.
- **FR-007**: Nothing MUST be postponed, ticked or cancelled without the user's tap (Principles I and II). The
  notice itself MUST change nothing.
- **FR-008**: On the first run of this feature, only the day before today MUST be asked about.
- **FR-009**: The remembered days MUST be part of the stored progress, so a backup (007) carries them and a restore
  brings them back, and data without them MUST behave as FR-008.
- **FR-010**: The feature MUST work offline and send nothing off the device (Principle III).
- **FR-011**: All copy MUST be Egyptian Arabic, right to left, every control at least 44 px, with no sideways
  scroll at 375 px. The repository MUST contain only generic examples (Principle VI).

### Key Entities

- **Asked-about day**: the latest ended day the app has asked about (or found nothing open on). Days up to it are
  not asked about again. Stored with the progress.
- **Postpone question**: what the notice shows: per ended day, its open postponable blocks and open tasks due on
  it, each with its proposed place. Worked out when Today opens, never stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a day with unfinished postponable items, postponing all of them takes 1 tap on the first open
  of the next day, with no need to open the review.
- **SC-002**: On 100% of tested cases, opening the app and showing the notice changes no stored data (checked by
  comparing the stored progress before and after).
- **SC-003**: A day answered once («أجّل الكل», «راجعها» or «مش دلوقتي») is never asked about again, across
  reloads and a backup round trip.
- **SC-004**: On 100% of tested cases, the places proposed by the notice equal the places 009's
  «أجّل اللي فاضل كله» proposes for the same day, and never overlap.
- **SC-005**: One undo after «أجّل الكل» restores exactly the stored progress before it.
- **SC-006**: With no postponable kinds and no open due tasks, the app behaves exactly as before: no notice, and
  no change to the day plans.

## Assumptions

- The notice is about blocks that are still open: done, cancelled and already postponed blocks are never listed.
- "Since the last day it asked about" is one remembered date, not a list: days are always asked about in order,
  so the latest one is enough.
- Undo does not bring the question back; the user can still postpone from that day's review.
- The notice sits on Today only, under the app's other notices, and does not interrupt other tabs.
- Out of scope:
  - moving anything without a tap;
  - reminders or notifications outside the app (Principle III);
  - changing how places are chosen (009);
  - postponing kinds not marked «ينفع يتأجل».
