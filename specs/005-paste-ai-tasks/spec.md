# Feature Specification: Paste Tasks from Any AI in a Fixed Format

**Feature Branch**: `005-paste-ai-tasks`

**Created**: 2026-10-13

**Status**: Draft (clarified 2026-10-13)

**Input**: User description: "لصق مهام من أي AI بصيغة ثابتة. التطبيق يعرض نص جاهز (prompt) المستخدم يديه لأي AI (Claude أو ChatGPT أو غيره) مع المهمة الكبيرة، فالـ AI يقسّمها لمهام فرعية بصيغة نصية ثابتة ومعروفة للتطبيق. المستخدم يلصق ناتج الـ AI في مكان مخصص (placeholder) في التطبيق، والتطبيق يفهم الصيغة فوراً ويحوّل كل سطر لمهمة في قايمة المهام (النص، النوع، آخر ميعاد لو موجود) بعد ما يعرض له معاينة ويأكّد. التطبيق نفسه ما بيكلّم أي AI ولا بيبعت حاجة لأي مكان، المستخدم هو اللي ينسخ ويلصق. المهام المضافة تدخل دايماً غير مخلّصة، وأي سطر مش مفهوم يتبلّغ عنه من غير ما يضيّع الباقي. الميزة عامة لأي مستخدم، والريبو ما فيهوش أي بيانات شخصية."

## Clarifications

### Session 2026-10-13

- Q: Where do the pasted tasks land? → A: In the Tasks list on the Tasks tab, as ordinary tasks (text, type, optional due date), exactly like tasks added by hand. They do not become blocks inside a day of the schedule.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Split a big task with any AI and paste the result (Priority: P1)

A user has a large task ("prepare the term project") and wants an AI chat tool to split it into smaller
tasks. On the Tasks tab the app offers a ready-made instruction text. The user copies it, pastes it into
any AI tool together with their big task, and gets back a list of subtasks written in one fixed, simple
format. The user copies that list, pastes it into a paste box in the app, and the app understands it at
once: it shows what will be added (text, type, optional due date for each line) and the user confirms.
The tasks appear in the list, all open.

**Why this priority**: This is the whole feature: it saves the user from retyping many tasks and works
with any AI, with no account or connection between the app and the AI.

**Independent Test**: Copy the app's instruction text, take a made-up list written in the fixed format
(no AI needed), paste it into the paste box, confirm: every valid line becomes a task, all open.

**Acceptance Scenarios**:

1. **Given** the Tasks tab, **When** the user opens the paste area, **Then** it shows the instruction
   text with a copy button and the paste box, and the instruction names the fixed format and the user's
   own list of task types.
2. **Given** a pasted list of valid lines, **When** the user checks it, **Then** a preview lists every task
   with its text, type and due date (or "no date") before anything is added.
3. **Given** the preview, **When** the user confirms, **Then** every previewed task is added to the list as
   open (not done), with today as its creation date.
4. **Given** the preview, **When** the user cancels or closes the paste area, **Then** nothing is added.

---

### User Story 2 - Lines the app cannot understand are reported, not lost (Priority: P1)

AI tools sometimes add a greeting, a closing sentence, a code fence, numbering, or a line in the wrong
shape. The app keeps every line it understands, ignores harmless wrapping, and lists the lines it could
not use with a short reason for each, so the user decides what to do. One bad line never blocks the
others.

**Why this priority**: Real AI output is rarely perfect; without this the feature fails on the first
messy answer.

**Independent Test**: Paste a list with a greeting, a code fence, two valid lines, a line with an unknown
type, a line with an impossible date, and an over-long line. The valid lines are previewed; the others are
listed with reasons; confirming adds only the valid ones.

**Acceptance Scenarios**:

1. **Given** pasted text with surrounding code fences, blank lines, and list bullets or numbers, **When**
   the user checks it, **Then** the app reads the lines inside correctly.
2. **Given** a line with a task type that is not in the user's list, **When** the user checks it, **Then**
   the line is flagged and is not added until the user picks a valid type for it in the preview.
3. **Given** a line with a date that does not exist, **When** the user checks it, **Then** the line is
   flagged with the reason and is not added.
4. **Given** a mix of valid and invalid lines, **When** the user confirms, **Then** only valid lines are
   added and the invalid ones stay visible so the user can fix them and check again.
5. **Given** text with no valid line at all, **When** the user checks it, **Then** the app says nothing was
   understood and shows the fixed format again.

---

### User Story 3 - Adding many tasks is safe and reversible (Priority: P2)

Adding a batch of tasks at once is easy to regret. After confirming, the user gets a short undo, like for
other changes in the app, that removes exactly the tasks just added and nothing else. The batch has a size
limit, and nothing in this feature can mark a task, block, or module as done.

**Why this priority**: Protects the user's list and respects the rule that only the user checks things off.

**Independent Test**: Confirm a pasted batch, then undo within the available time: the list is exactly as
before. Tick another task before undoing: the tick is still there afterwards.

**Acceptance Scenarios**:

1. **Given** a confirmed batch, **When** the user taps undo in time, **Then** only the tasks from that batch
   are removed.
2. **Given** a tick or an edit made after the batch, **When** the user undoes the batch, **Then** that tick
   or edit is unchanged.
3. **Given** a pasted list longer than the limit, **When** the user checks it, **Then** the app uses the
   first lines up to the limit and says how many were left out.
4. **Given** any pasted text, **When** tasks are added, **Then** none of them is marked done and no existing
   task, block, or course module changes.

---

### Edge Cases

- A line longer than the task text limit: flagged, or shortened only if the user agrees in the preview
  (the same limit as adding a task by hand).
- A line that repeats a task already in the list: shown in the preview marked as a possible duplicate, and
  the user chooses; nothing is dropped silently.
- Two identical lines in one paste: both shown; the second marked as a possible duplicate.
- The user's settings change the list of task types after copying the instruction text: lines with a type
  that no longer exists are flagged (US2) and the user picks a valid one.
- Pasting very large text: only the first lines up to the limit are read, and the app says so.
- The paste box is left with text and the user switches tabs: the text is kept for the session so it is not
  lost; it is never stored after the app closes.
- The device has no storage available: the batch works for the session and the app already warns that
  changes are not kept.
- Offline: everything works with no network.
- Right-to-left and left-to-right text mixed in one line (an English term inside Arabic text): kept as
  written; display stays correct.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Tasks tab MUST offer a paste area containing a ready-made instruction text, a button to
  copy it, and a box to paste the AI's answer into.
- **FR-002**: The instruction text MUST describe the one fixed line format and MUST include the user's
  current list of task types, so any AI can answer in a form the app understands.
- **FR-003**: The app MUST read the pasted text line by line using that fixed format and MUST produce, per
  valid line, a task with a text, a type, and an optional due date.
- **FR-004**: The app MUST tolerate harmless wrapping around the lines: code fences, blank lines, list
  bullets and numbers. Any other line it cannot read MUST be reported, never silently dropped or guessed.
- **FR-005**: Before anything is added, the app MUST show a preview of every task that will be added and a
  list of every line it could not use, each with a short reason.
- **FR-006**: Adding MUST need the user's explicit confirmation of the preview; closing or cancelling MUST
  add nothing.
- **FR-007**: Each added task MUST follow the same rules as adding a task by hand: text required after
  trimming spaces and no longer than the task text limit, a type from the user's list, an optional real date.
  A task MUST NOT be added with a type the app had to guess.
- **FR-008**: Every added task MUST be open (not done) with the day of adding as its creation date, and the
  feature MUST NOT set, bulk-set, or clear any done state of a task, block, or course module (constitution
  Principle II).
- **FR-009**: After confirming, the app MUST offer a short undo that removes exactly the tasks from that
  batch and changes nothing else, consistent with other undo in the app.
- **FR-010**: The app MUST limit one paste to a maximum number of lines and MUST say how many lines were
  left out when the limit is passed.
- **FR-011**: The app MUST mark likely duplicates (same text as an existing task or as an earlier line) in
  the preview and let the user decide; it MUST NOT add or drop them silently.
- **FR-012**: The feature MUST work offline and MUST NOT contact any AI service or send any data anywhere;
  the user copies and pastes by hand (constitution Principle III). Pasted text MUST NOT be stored beyond the
  session.
- **FR-013**: The instruction text, the format, and every example in the app and in the repository MUST be
  generic, with no real person's schedule, course, or place (Principle VI).
- **FR-014**: The paste area MUST be usable on a phone-width screen with the app's existing look, keyboard
  reachable, and labelled for screen readers.

### Key Entities

- **Instruction text**: the copyable text that tells an AI how to answer; built from the fixed format and
  the user's current task types.
- **Pasted line**: one line of the pasted text, before it is understood.
- **Proposed task**: what a valid line becomes in the preview: text, type, optional due date, a duplicate
  mark; not yet part of the list.
- **Rejected line**: a line that could not be used, with the reason.
- **Batch**: the set of tasks added by one confirmation; the unit of undo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from a pasted AI answer of 10 valid lines to 10 tasks in the list in under
  30 seconds, including checking the preview.
- **SC-002**: In 100% of tested pastes, every line is accounted for: it is either added or listed with a
  reason; none disappears.
- **SC-003**: In 100% of tested pastes, no added task is marked done, and no existing task, block, or
  module changes.
- **SC-004**: Undoing a batch restores the list to exactly its state before the batch in 100% of cases, and
  keeps any change the user made after the batch.
- **SC-005**: With answers from at least three different AI tools following the instruction text, at least
  90% of lines are understood without the user editing them.
- **SC-006**: The paste area fits a 375-pixel-wide screen with no horizontal scroll.
- **SC-007**: The feature makes 0 network requests and works in airplane mode.

## Assumptions

- The Tasks tab and the task rules (text up to 140 characters, a type from the user's list, an optional due
  date) already exist and are reused unchanged.
- The instruction text and the app's messages use the app's language setting; the fixed format itself is
  language-independent and the task text inside it is kept as written.
- The number of lines read from one paste is limited to 50.
- The undo is the same short-lived message used for other changes in the app.
- Out of scope: any connection to an AI service, accounts or keys, importing from files, editing the
  proposed tasks' text in the preview (only picking a type and keeping or dropping a line), recurring
  tasks, and changing the done state of anything.
- Builds on features 003 (task rules and undo) and 002 (task types come from the settings).
