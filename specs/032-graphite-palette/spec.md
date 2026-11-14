# Feature Specification: Graphite Palette with One Accent

**Feature Branch**: `032-graphite-palette`

**Created**: 2026-11-13

**Status**: Draft

**Input**: The owner asked (2026-11-13) to replace the app's look with one new default palette, "Graphite + one
accent", with new kind inks, and to mark late tasks with an icon so that colour alone never carries the meaning. The
owner gave the exact values (below), then answered three questions (see Clarifications).

## Background

Today the app is set as "the day as a banknote" (DESIGN.md): pale green-grey paper, an oxblood band, and warm intaglio
inks for the kinds. Users have said they do not like the current colour. The owner chose a neutral graphite frame with
one dark accent, so that the kinds' inks are the only colour on screen.

### Where colour is used today

- **The frame** (feature 022 calls it the shell, `--shell`): the navigation band (the bottom bar on phones, the side
  rail from 960 px), the selected day chip, and the phone's status bar. Text on it uses `--shell-fg`, and inactive
  items and the day chip's number use `--shell-dim`.
- **The primary button** (for example «خلصت»): today it is drawn in the text colour `--fg` on the paper, not in the
  frame colour.
- **The ground**: paper `--bg`, cards `--surface`, secondary text `--muted`, borders `--line`, and `--quiet` for rest
  and commute segments and unlit petals of the rosette.
- **The kinds**: each kind has one ink, used for its row tint, check circle, hour numeral, week strip segment and
  rosette petals (the Denomination Rule, DESIGN.md).
- **Danger** (`--danger`): late tasks and destructive actions only.
- **The palettes** (feature 022): the user picks one of four in Settings, «الشكل»: oxblood «عنابي» (the default),
  olive «زيتي», navy «كحلي», graphite «رمادي». A palette changes only the frame and the ground; the inks never
  change. The choice is kept on the device under its own key, with the theme (light, dark or automatic).

### Current kind inks and the new ones

| Kind (label) | Token | Today, light / dark | New, light / dark |
|---|---|---|---|
| محاضرات (lectures) | `--uni` | oxblood `#7B1E2E` / `#EE8E9C` | navy `#163A7A` / `#9EBDFA` |
| مذاكرة (study) | `--study` | madder `#94304B` / `#F2A7B8` | violet `#7A3C8C` / `#C287D1` |
| كورس (course) | `--course` | plum `#5B2A6B` / `#CFA0DD` | teal `#007470` / `#65AFAA` |
| شغل (work) | `--work` | sepia `#5A402B` / `#D8B898` | amber `#A04D00` / `#D9884B` (Q3) |
| رياضة (gym) | `--gym` | ochre `#735600` / `#E4C55C` | rose `#B02B4E` / `#FFBACC` |
| ورد (Quran) | `--quran` | ochre `#6A4E00` / `#E8C96A` | moss `#3A4A12` / `#B0C384` |
| وقتك (your time) | `--personal` | ochre `#7A5A0A` / `#EFD98F` | gold `#7A5C00` / `#E3C25A` |
| Danger | `--danger` | `#B4300C` / `#FF9A76` | `#B42318` / `#FF8A7A` |

مواصلات and راحة have no ink; they use `--quiet`. The six ready inks for kinds the user adds (feature 016) are teal,
blue, green, slate, copper and olive, each a light and dark pair. The owner gave no new values for them, so they stay.

### The new palette

| Token | Light | Dark |
|---|---|---|
| `--bg` (paper) | `#F2F2F0` | `#121314` |
| `--surface` (cards) | `#FCFCFB` | `#1B1C1E` |
| `--fg` (text) | `#18191B` | `#ECECEA` |
| `--muted` | `#5E6166` | `#A0A2A6` |
| `--line` | `#DCDCD8` | `#2C2E31` |
| `--accent` | `#1F1F22` | `#ECECEA` |
| `--on-accent` (text on the accent) | `#FFFFFF` | `#121314` |

The accent is used for the navigation band, the primary button («خلصت»), the selected day chip, and the phone's
status bar.

### Measured before writing (to be made a check by this feature)

With the values above, on the 030 paper grain at its darkest (black at 4.5% over the light paper):
- **`--work` light as first given (`#A65000`) gave 4.4999:1, just under AA.** On the plain paper it gave 4.97, on
  cards 5.43 and on its tint 4.80; only the grained paper failed. Per Q3 it becomes `#A04D00`: 5.27 on paper, 5.75 on
  cards, 5.05 on its tint, and 4.77 / 5.31 on the grain's extremes.
- `--course` light (`#007470`) is the next lowest, at 4.54 on the grained paper.
- Every other ink, `--fg` and `--muted` hold AA on paper, cards, their tint and the grain, in light and dark. Text on
  the accent is 16.4:1 (light) and 15.7:1 (dark).

## Clarifications

### Session 2026-11-13

- Q1: Feature 022 has four palettes (oxblood, olive, navy, graphite). Removed, kept, or some kept? → A: **All four
  are removed.** The new palette is the only one. Settings «الشكل» keeps only the theme: light, dark or automatic.
- Q2: A user who picked a 022 palette: what do they see after the update? → A: **The new palette.** Every user sees
  it; the stored palette choice is no longer used. The stored theme choice (light, dark, automatic) is kept.
- Q3: The light `--work` ink missed AA by a hair on the grained paper. Which gives way? → A: **The work ink is
  darkened** just enough: `#A04D00`. The grain stays as it is.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The new look, light and dark (Priority: P1)

The user opens the app and sees the graphite look: neutral paper and cards, a near-black accent on the navigation
band, the primary button and the selected day chip, in light. In dark, the paper is near black and the accent is
near white. The theme setting (light, dark, automatic) works as now. The kinds' rows show the new inks.

**Why this priority**: It is the feature: the colour users did not like is replaced.

**Independent Test**: Open Today, the Week and Settings in light and dark at phone width; check each token against the
table above and each kind's row against its new ink.

**Acceptance Scenarios**:

1. **Given** the theme is light, **When** any screen shows, **Then** the paper, cards, text, borders and accent match
   the light column, and the status bar takes the accent.
2. **Given** the theme is dark, or automatic on a phone in dark mode, **When** any screen shows, **Then** they match
   the dark column.
3. **Given** a block of each kind, **When** Today shows, **Then** each row's tint, check circle and hour numeral use
   its new ink, and the Week strip and the rosette use the same ink.
4. **Given** the accent, **When** the band, the primary button or the selected day chip shows, **Then** its text uses
   `--on-accent` and its inactive items stay readable at AA.

---

### User Story 2 - Contrast is checked, not trusted (Priority: P1)

Every ink, including the six ready inks of feature 016, holds WCAG AA (4.5:1) as text on the paper, on the cards and
on its own row tint, in light and dark, and on the paper with the grain of feature 030 at both of its extremes. The
project's contrast check proves it and fails when a colour fails.

**Why this priority**: The app is used outdoors in daylight; a colour that fails AA is a reading failure, not a style.

**Independent Test**: Run the contrast check on the new values; then raise one ink's lightness until it fails and
confirm the check refuses it.

**Acceptance Scenarios**:

1. **Given** the new values, **When** the check runs, **Then** it reports every ink, `--fg` and `--muted` on paper,
   cards, tint and grained paper, light and dark, and passes only if all hold 4.5:1.
2. **Given** one ink changed to fail on any ground, **When** the check runs, **Then** it fails and names the check.
3. **Given** the accent, **When** the check runs, **Then** text on the accent and the band's inactive items hold AA.

---

### User Story 3 - Late is never colour alone (Priority: P2)

A late task shows an icon beside its date, next to the danger colour and the word «متأخرة», which stays. A screen
reader reads the icon's label. Someone who cannot tell red apart still sees that the task is late.

**Why this priority**: The owner's rule that colour alone never carries meaning; late is the one place it does today.

**Independent Test**: With a task due yesterday, open Today: the row shows the icon, the word and the danger colour; in
grayscale it is still marked late; the accessibility tree names it.

**Acceptance Scenarios**:

1. **Given** an open task whose date has passed, **When** its row shows, **Then** it carries the late icon, «متأخرة»
   and the danger colour.
2. **Given** that row, **When** a screen reader reaches it, **Then** the late state is read once, not twice.
3. **Given** a task due today or later, or a done task, **When** its row shows, **Then** it has no late icon.

---

### User Story 4 - The design story follows the look (Priority: P3)

DESIGN.md tells the new story: its North Star, its Colors section and its palette table describe the graphite frame,
the one accent and the new inks. The banknote and oxblood text is gone. PRODUCT.md's look line follows.

**Why this priority**: DESIGN.md is binding guidance for every later change; it must not describe a look the app no
longer has.

**Independent Test**: Read DESIGN.md and PRODUCT.md: every colour named matches the app, and no text speaks of
oxblood, banknotes or security paper as the current look.

**Acceptance Scenarios**:

1. **Given** DESIGN.md, **When** it is read, **Then** its North Star is a short new story, proposed in the plan and
   approved by the owner, and its colour tables match the tokens.

### Edge Cases

- **A user on a 022 palette** before the update (oxblood, olive, navy or graphite): sees the new palette, with their
  theme choice kept (Q2). Nothing asks them to choose again.
- **An old backup or a stored look naming a removed palette**: the look is read as before, the palette part is
  ignored, and the app shows the new palette.
- **The ready inks close to the new kind inks**: teal (016) and the new course teal, blue (016) and the new lecture
  navy, olive (016) and the new Quran moss sit close. The kind's name always shows beside its ink (DESIGN.md), so two
  kinds are never told apart by colour alone.
- **Danger next to the gym rose**: both are reds. Late tasks gain the icon (US3); destructive buttons keep their words.
- **The dark accent is near white**: in dark, the band, the primary button and the day chip are light on a near-black
  page. The theme-colour of the status bar follows it.
- **The fade between themes** (feature 022) keeps working for every changed token, including the new accent tokens.
- **Print, more contrast and forced colours**: the grain still hides (030); nothing new shows there.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST use the new palette by default, in light and dark, following the existing theme setting.
- **FR-002**: Each existing kind MUST use the new ink in the table above, in every place the kind's ink shows.
- **FR-003**: The accent MUST be used for the navigation band, the primary button, the selected day chip and the
  phone's status bar, with `--on-accent` for text on it.
- **FR-004**: Every kind ink, the six ready inks, `--fg` and `--muted` MUST hold 4.5:1 on the paper, the cards and
  (inks) their own row tint, in light and dark.
- **FR-005**: The same colours MUST hold 4.5:1 on the paper at both extremes of the 030 grain.
- **FR-006**: Text and inactive items on the accent MUST hold 4.5:1.
- **FR-007**: The contrast check MUST cover FR-004 to FR-006 and MUST fail when any colour fails; a mutation in its
  self-test MUST prove it.
- **FR-008**: A late task MUST show an icon with an accessible label next to the danger colour, and keep «متأخرة».
  Colour MUST NOT be the only mark of lateness.
- **FR-009**: DESIGN.md MUST describe the new look: North Star, Colors section, palette table, Key Characteristics.
  PRODUCT.md's look line MUST match.
- **FR-010**: The four palettes of feature 022 MUST be removed, with their picker in Settings «الشكل»; the theme
  choice (light, dark, automatic) MUST stay.
- **FR-011**: No stored data changes shape. Settings, progress, workouts and backups stay as they are; the look's
  own key keeps its theme.
- **FR-012**: A stored palette choice MUST NOT change what the user sees: every user gets the new palette, and their
  stored theme choice MUST keep working.

### Key Entities

- **The look** (feature 022): a small record on the device, outside settings and progress: a palette and a theme.
- **The palette**: the frame and ground tokens for light and dark. After this feature there is one.
- **A kind ink**: one colour per kind, light and dark, the same in every palette.

## Success Criteria *(mandatory)*

- **SC-001**: In light and dark, at 375 px, Today, the Week and Settings show the new tokens and inks, checked
  against the tables.
- **SC-002**: The contrast check passes with every colour at or above 4.5:1 on every ground listed in FR-004 to
  FR-006, and its self-test catches a failing ink.
- **SC-003**: A late task is identifiable in grayscale and by a screen reader.
- **SC-004**: Parity 0: day plans are unchanged.
- **SC-005**: DESIGN.md and PRODUCT.md name no colour the app does not use.

## Assumptions

- **Out of scope**: the Today layout, a bottom sheet, the live balance animation, a Progress tab and "sky of the day".
  The app has no top band today; adding one is a layout change, so in this feature the accent goes where `--shell`
  goes now (the bottom bar and side rail, the day chip, the status bar) plus the primary button.
- **Tokens the owner did not give**: `--quiet` and the band's inactive-item colour (today `--shell-dim`) are chosen in
  the plan as neutral greys that pass the check; the owner approves them with the plan.
- **The six ready inks** (feature 016) keep their values; they already pass on the new grounds (measured).
- **The app icon** (the rosette on oxblood) and the manifest colours stay for now; a new icon is a follow-up the owner
  may ask for.
- **The North Star text** is proposed in the plan, short, and approved by the owner before it goes in DESIGN.md.
- **The late icon** is a simple line icon drawn like the app's other icons (no emoji, no new library).
