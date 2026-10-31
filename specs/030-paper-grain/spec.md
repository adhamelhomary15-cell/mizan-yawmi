# Feature Specification: Paper Grain on the Page Ground

**Feature Branch**: `030-paper-grain`

**Created**: 2026-10-31

**Status**: Draft

**Input**: Item 3 of the reverse-engineering review (session RE, 2026-10-23). The site studied lays a fixed, very
faint noise texture over its page, so the flat colour reads as paper. The owner asked for a spec (2026-10-31).

## Background

DESIGN.md sets the app in banknote inks on «security paper»: the ground is pale paper (`--bg`), the cards are a
lighter surface (`--surface`), and depth comes only from that step and one-pixel lines. Today the paper is a flat
colour, so the idea stays in the colour names only.

A faint grain is what makes printed paper read as paper. It is a texture, not an ornament: no motif, no pattern, no
religious or national symbol (PRODUCT.md, DESIGN.md Don'ts).

The texture can be drawn by the browser from a small SVG noise filter (`feTurbulence`), written into the CSS as a
`data:` image. It needs no file, no download and no library, so it works offline, and the page's security policy
already allows `data:` images (`img-src 'self' data:`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The ground reads as paper (Priority: P1)

The user opens the app. The page ground has a very faint grain, like the paper of a banknote, in every palette, in
light and dark. The cards and the text stay smooth and as readable as now. Nothing moves, and nothing can be tapped
differently.

**Why this priority**: It is the whole feature: it gives the security-paper idea a feel, with the least code.

**Independent Test**: Open Today at phone width in each palette, light and dark. Check that:
- the grain shows on the ground and not on the cards;
- the text contrast checks still pass;
- taps reach the same controls as before.

**Acceptance Scenarios**:

1. **Given** any palette and theme, **When** a screen shows, **Then** the ground carries the grain and every card,
   row, button and the navigation band stay flat.
2. **Given** the grain, **When** any text or kind ink shows on the ground, **Then** it still holds AA contrast (the
   grain is too faint to change it; see FR-003).
3. **Given** the grain, **When** the user taps or scrolls, **Then** the grain never takes a tap, and it does not move
   with the content in a way that blurs or flickers.

---

### User Story 2 - The grain steps aside when it should (Priority: P2)

On a phone set to more contrast, or in forced colours (Windows high contrast), the grain does not show. When printing,
it does not show.

**Why this priority**: The grain is decoration of feel. It must never cost readability.

**Independent Test**: Emulate `prefers-contrast: more` and `forced-colors: active`, and print preview. Check the
ground is flat.

**Acceptance Scenarios**:

1. **Given** `prefers-contrast: more` or `forced-colors: active`, **When** the app opens, **Then** no grain shows.
2. **Given** print, **When** the page prints, **Then** no grain prints.

---

### Edge Cases

- **A slow or old phone**: the grain is one image drawn once and repeated. Scrolling the timeline and the Week stays
  as smooth as now (checked on a throttled CPU, see SC-003).
- **Very large or very small screens**: the grain repeats as a small tile, so it looks the same at 375 px and on a
  desktop, with no visible seam.
- **Switching palette or theme**: the grain follows at once; its strength is set per theme (lighter on light paper,
  a little stronger on dark).
- **Screenshots** of the app show the grain; it stays faint enough that shared screenshots look clean.

## Clarifications

The owner's answers (2026-10-31):
1. **Where**: the ground only. The cards stay smooth, so the paper/surface step stays clear.
2. **A switch**: none. The grain is faint, and it is one less setting.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The page ground MUST carry a faint, fixed grain in every palette, in light and dark.
- **FR-002**: The grain MUST be drawn in CSS from an inline `data:` SVG: no file, no network, no library, and no
  change to the security policy.
- **FR-003**: Every contrast check MUST still pass. The grain's strength MUST stay at or under a set opacity (about
  4–6%), low enough that it cannot move any text or ink below AA.
- **FR-004**: The grain MUST NOT take taps (`pointer-events: none`) and MUST NOT cover the cards, the rows or the
  navigation band.
- **FR-005**: The grain MUST NOT show under `prefers-contrast: more`, `forced-colors: active` or print.
- **FR-006**: The grain MUST NOT move or animate.
- **FR-007**: It MUST follow PRODUCT.md and DESIGN.md: a texture only, no motif, no glow, no gradient. DESIGN.md MUST
  describe it (Elevation & Depth, Do's and Don'ts).

## Success Criteria *(mandatory)*

- **SC-001**: At 375 px, in each of the four palettes, light and dark, the grain shows on the ground and not on
  cards.
- **SC-002**: Every contrast check in `tools/check-schedule.js` passes, unchanged.
- **SC-003**: Scrolling Today and the Week on a 4× throttled CPU shows no extra dropped frames compared with no grain.
- **SC-004**: Parity 0: day plans are the same as before this feature.
- **SC-005**: The built page grows by under 2 KB.
