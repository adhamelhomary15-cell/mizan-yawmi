# Feature Specification: The Balance Comes Alive When It Opens

**Feature Branch**: `027-balance-in-motion`

**Created**: 2026-10-24

**Status**: Draft

**Input**: Two features the owner parked from the portfolio-site analysis (2026-10-23) and started on 2026-10-24: the
rosette's petals draw in, and the numbers count up to their value. The owner's choices (2026-10-24):
- **One feature**: both touch the same rosette, so they are one spec, one branch and one PR.
- **When**: every time the tab with the rosette opens.
- **Which numbers**: the rosette's own: the hours at its centre and the two shares under it.

## Background

The balance is a guilloche rosette (`Balance` in `src/app/08-ui-small.js`, DESIGN.md "The rosette"): two halves of 36
fine petals around a centre disc. A petal is inked in a category's colour for its share of that half's planned time
that got done; the rest stay `quiet`. The centre shows the hours done. Under it, a legend shows each half's share
(for example «الجامعة والكورس 45%») and its hours.

It shows in three places:
- **Today**: «ميزان اليوم», in the side column on wide screens and lower on a phone;
- **The day review** («راجع يومك»), at the bottom of the review panel;
- **Week**: «ميزان الأسبوع», at the top.

Today it appears all at once. The petals already fade their colour over 450ms when a block is ticked, and that stays.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The petals draw in (Priority: P1)

When the Today or Week tab opens, the rosette's petals draw themselves in, one after another around each half, in
under a second, ending in the same rosette as today.

**Why this priority**: The rosette is the app's signature. Drawing it in shows at a glance how the day or week is
filled, as the petals of each colour arrive.

**Independent Test**: Open the Week tab with some blocks ticked: the petals draw in around both halves and stop on the
same picture as before this feature.

**Acceptance Scenarios**:

1. **Given** the user opens the Today or Week tab, **When** the rosette shows, **Then** its petals draw in, around each
   half from its start, and the whole rosette is drawn within 1 second.
2. **Given** the drawing has finished, **When** the user looks, **Then** every petal has the same colour and place as
   without this feature.
3. **Given** the user leaves the tab and opens it again, **When** the rosette shows, **Then** it draws in again.
4. **Given** the drawing is running, **When** the user taps anything, **Then** the tap works at once.

---

### User Story 2 - The rosette's numbers count up (Priority: P2)

While the petals draw in, the hours at the centre and the two shares under the rosette count up from 0 to their value,
ending together with the petals.

**Why this priority**: The numbers rise with the petals, so the drawing and the totals read as one movement. It is
polish on top of story 1.

**Independent Test**: Open the Week tab with 12 hours done: the centre counts up to 12 and the shares to their
percentages, in step with the petals, and end on the same text as before.

**Acceptance Scenarios**:

1. **Given** the user opens the tab, **When** the rosette draws in, **Then** the centre hours and the two shares count
   up from 0 and end on their exact values together with the last petal.
2. **Given** a value is 0, **When** the tab opens, **Then** it shows 0 at once.
3. **Given** the numbers are counting, **When** a screen reader reads the rosette, **Then** it reads the final values,
   not the ones on the way.

---

### Edge Cases

- **Reduced motion**: on a phone set to reduce motion, the rosette and its numbers show at once, as today.
- **Ticking a block while the tab is open**: no drawing again; the petal fades to its new colour as today, and the
  numbers change to their new values at once.
- **Another day or week picked** (the day strip, the week arrows): the rosette draws in again with the new figures, as
  the tab's content is new.
- **Switching quickly between tabs**: each opening starts the drawing again from the start; nothing is left half drawn
  when the drawing would have ended.
- **An empty rosette** (nothing done): the quiet petals draw in, and the numbers show 0.
- **The rosette off screen on a phone** (Today, lower down): it draws when the tab opens, whether or not it is in view.
- **The day review**: opening it shows a second rosette, which draws in as it appears; the one already on Today does
  not draw again.
- **The look (022)**: the drawing reads in every palette, light and dark, and does not delay a theme change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every time a rosette appears (the Today or Week tab opening, or the day review opening), and when another
  day or week is picked, its petals MUST draw in, around each half from its start, finishing within 1 second.
- **FR-002**: When the drawing ends, the rosette MUST be exactly as it is without this feature: the same petals, inks,
  rings, centre and legend.
- **FR-003**: During the drawing, the centre hours and the two shares MUST count up from 0 to their exact values, ending
  with the last petal.
- **FR-004**: Assistive technology MUST read only the final values.
- **FR-005**: Under reduced motion, nothing MUST move: the rosette and its numbers show at once.
- **FR-006**: Ticking a block MUST NOT start the drawing again. The existing petal fade stays, and the numbers update at
  once.
- **FR-007**: The drawing MUST NOT delay or block any tap, and MUST NOT add a library or a network request.
- **FR-008**: It MUST follow DESIGN.md: one-pixel line work drawn as line work, no glow, no gradient, and category inks
  only for their categories.

## Success Criteria *(mandatory)*

- **SC-001**: The rosette is fully drawn, with final numbers, within 1 second of the tab opening, in 100% of tested
  cases.
- **SC-002**: After the drawing, the rosette looks the same as without the feature: pixel for pixel on WebKit and with
  reduced motion; on Chromium, which smooths the edges of any animated SVG slightly differently, the same to the eye.
- **SC-003**: With reduced motion, the rosette is complete in the first frame.
- **SC-004**: Parity 0: day plans are the same as before this feature.

## Assumptions

- "Every time the tab opens" is the owner's choice, against the suggestion of once per launch; it is kept short (under
  a second) so frequent opens stay quick.
- The drawing order follows the petals as they are placed today: each half from its start, so the inked petals of
  each category arrive together.
- The legend's hours under each share («3 من 8 س») do not count; only the centre hours and the two shares do (the
  owner's choice: the rosette's numbers).
- Other numbers in the Week tab (the per-category rows) do not count.
