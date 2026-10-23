# Feature Specification: Colour Palettes and a Light or Dark Choice

**Feature Branch**: `022-palettes`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User feedback: some users do not like the app's oxblood colour. The owner's idea is a few ready colour
palettes the user can switch between with one tap. The owner's choices (2026-10-23):
- **What a palette changes**: the frame and the ground only: the navigation band, the page ground, the cards, the
  lines. The kinds keep their inks in every palette (DESIGN.md, the Denomination Rule).
- **How many**: no preference, so four: oxblood (today's, and the default), olive, navy and graphite.
- **Where the choice is kept**: on the device only. It is not part of the settings file, the export or the backup.
- **Light and dark**: a button of its own for each, «فاتح» and «غامق», apart from the palettes.

The owner's later choices (2026-10-23), after looking at a portfolio site's theme switch:
- **A third choice, «تلقائي»**: it follows the phone's setting and is the default. This closes the open question
  about a way back to the phone's setting.
- **A soft change of colours**: switching the palette or the theme fades the colours over a short moment instead of
  jumping, at the same pace as the rosette's petals (450ms, DESIGN.md).

## Background

Every colour in the app is a CSS variable in `src/planner.html`:
- the frame: `--shell`, `--shell-fg`, `--shell-dim`;
- the ground: `--bg`, `--surface`, `--line`, `--quiet`, `--muted`;
- the kinds' inks.

The dark theme today follows the phone's setting only. The CSS already has a `data-theme` switch for light and
dark, but nothing in the app sets it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Picking a palette (Priority: P1)

In الإعدادات, under «الشكل», the user sees the four palettes, each as a small swatch with its name. One tap changes
the colours at once, with no reload and no confirmation. The choice is kept the next time the app opens.

**Why this priority**: This is the feedback: users who do not like the oxblood colour.

**Independent Test**: Pick «كحلي». Check that the band and the ground change, the kinds' colours do not, and
reopening the app keeps «كحلي».

**Acceptance Scenarios**:

1. **Given** the default palette, **When** the user taps «كحلي», **Then** the band, the selected day, the ground,
   the cards and the lines take its colours at once, and the swatch shows it is chosen.
2. **Given** a chosen palette, **When** the app opens again, even offline, **Then** it opens in that palette, with
   no flash of the old colours.
3. **Given** any palette, **When** blocks show, **Then** every kind keeps its own ink, readable on that palette's
   ground (AA contrast).

---

### User Story 2 - Choosing light, dark or automatic (Priority: P2)

Under «الشكل», three choices side by side, «فاتح», «غامق» and «تلقائي», set the theme. «تلقائي» is chosen until the
user picks another, and it follows the phone's setting, as the app does now.

**Why this priority**: Users asked for control over night mode, apart from the colours. The app is used outdoors in
daylight, where a phone set to dark can make the app hard to read.

**Independent Test**: On a phone set to light, tap «غامق». Check the app turns dark at once and stays dark after
reopening. Then tap «تلقائي» and check it turns light again, following the phone.

**Acceptance Scenarios**:

1. **Given** no choice yet, **When** the app opens, **Then** «تلقائي» shows as chosen and the app follows the
   phone's light or dark setting.
2. **Given** the user taps «غامق», **When** the app opens again, **Then** it is dark whatever the phone's setting.
3. **Given** «تلقائي» is chosen and the app is open, **When** the phone switches between light and dark, **Then** the
   app follows without reopening.
4. **Given** «فاتح» or «غامق» is chosen, **When** the phone switches, **Then** the app does not change.
5. **Given** any palette, **When** the theme is dark, **Then** the palette's dark colours show, and every kind stays
   readable.

---

### User Story 3 - A soft change of colours (Priority: P3)

When the user picks a palette or a theme, the colours fade from the old ones to the new over a short moment,
everywhere at once, instead of jumping.

**Why this priority**: It makes the change feel calm and lets the user see what changed. It is polish on top of
stories 1 and 2, and they work without it.

**Independent Test**: Tap «غامق» and watch: the ground, the band, the cards and the inks fade together over about
half a second, with no part changing before the others. Turn on "reduce motion" on the phone and tap again: the
change is instant.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** the user picks another theme or palette, **Then** all colours fade to the new
   ones together, in about 450ms.
2. **Given** the phone asks for reduced motion, **When** the user picks a theme or palette, **Then** the colours
   change at once, with no fade.
3. **Given** the app is opening, **When** it first shows, **Then** it shows the kept colours directly, with no fade
   from other colours.
4. **Given** a fade is running, **When** the user taps a block's check, **Then** the tap works at once.

---

### Edge Cases

- **Storage unavailable** (a private window, storage blocked): the choice applies until the page closes, and the app
  opens next time in the default, with no error.
- **A stored value the app does not know** (for example a palette removed later): the default is used.
- **Restoring a backup or importing settings** does not change the palette or the theme.
- **The phone's status bar colour** (`theme-color`) follows the chosen palette's band.
- **Going back to the phone's setting**: tapping «تلقائي».
- **Fast repeated taps** (for example «فاتح» then «غامق» within the fade): the colours go to the last choice, with
  no flicker between.
- **The phone changes setting while «تلقائي» is chosen**: the app follows, with the same soft fade.

## Clarifications

### Session 2026-10-23

- Q: A way back to "like the phone" after tapping «فاتح» or «غامق»? → A: a third choice, «تلقائي», which is also the
  default.
- Q: Should switching fade the colours or change them at once? → A: fade, at the rosette's pace (450ms), and at once
  when the phone asks for reduced motion.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST offer four palettes, «عنابي» (default), «زيتي», «كحلي» and «رمادي», each with a light and
  a dark set of the frame and ground colours.
- **FR-002**: A palette MUST NOT change any kind's ink. Every kind ink, the nine and the six ready ones, MUST hold AA
  contrast (4.5:1) on every palette's ground and on its own tint, in light and dark, checked by a dev tool.
- **FR-003**: Picking a palette, «فاتح», «غامق» or «تلقائي» MUST apply at once, with no reload.
- **FR-004**: The choice MUST be kept on the device only, outside the settings, the export and the backup.
- **FR-005**: The app MUST open in the kept choice with no flash of other colours, offline included.
- **FR-006**: The palettes MUST follow PRODUCT.md and DESIGN.md: muted colours, no neon, no glow, no ornament.
- **FR-007**: Nothing MUST be sent off the device (Principle III), and no progress MUST change (Principle II).
- **FR-008**: The theme MUST offer three choices, «فاتح», «غامق» and «تلقائي». «تلقائي» MUST be the default and MUST
  follow the phone's setting, including a change while the app is open.
- **FR-009**: Picking a palette or a theme, and a phone change under «تلقائي», MUST fade every colour from the old
  value to the new one together, in 450ms.
- **FR-010**: The fade MUST NOT run when the phone asks for reduced motion, and MUST NOT run when the app first shows.
- **FR-011**: The fade MUST NOT delay or block any tap, and MUST NOT add a library or a network request.

### Key Entities

- **Look choice**: the palette (one of four) and the theme («فاتح», «غامق», «تلقائي»). Kept on the device only,
  apart from the settings, the progress and the backup.

## Success Criteria *(mandatory)*

- **SC-001**: Changing the palette or the theme takes one tap, and the change starts at once.
- **SC-002**: After reopening, the app shows the kept palette and theme in 100% of tested cases.
- **SC-003**: The contrast check passes for every kind ink on every palette, light and dark.
- **SC-004**: Parity 0: day plans are the same as before this feature.
- **SC-005**: With «تلقائي», switching the phone between light and dark changes the app within a second, without
  reopening it.
- **SC-006**: A colour change finishes within half a second, and with reduced motion it is instant.

## Assumptions

- The fade covers colours only. Nothing moves or resizes when the theme changes.
- The phone's "reduce motion" setting is the only motion switch. The app adds no motion setting of its own.
- Browsers that cannot fade colours change them at once. That is acceptable; nothing else depends on the fade.
- The status bar colour (`theme-color`) changes at once, because phones do not fade it.
