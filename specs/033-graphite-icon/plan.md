# Implementation Plan: The App Icon in Graphite

**Branch**: `033-graphite-icon` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

## Summary

The icons, the manifest and the default status bar colour are all written by `tools/build.py`. The change is there:
the icon drawing's four colours, the manifest's `theme_color` and `background_color`, and the head's default
`<meta name="theme-color">`. The build is then run with `--icons` to redraw the four icon files. PRODUCT.md and
DESIGN.md name the new icon. As in earlier features, the decisions and checks are kept in this file.

## Technical Context

- **Language**: Python (`tools/build.py`, Pillow for the icons, as now).
- **Storage**: none.
- **Tests**: `tests/e2e/icon.spec.js` (new) reads the shipped manifest, the page's first status bar colour and each
  icon's pixels; every `tools/check-*.js` and parity, unchanged.
- **Constraints**: no new library, no network; the rosette's geometry is unchanged.

## Constitution Check (v3.0.1)

| Principle | Status |
|---|---|
| I. Human review | The owner chose option B from a mock-up and approved running to the PR. |
| II. Checking off is human | No marks are touched. |
| III. Data stays on the device | No network, nothing stored. |
| IV. Honest, offline day | Day plans unchanged (parity 0); the icons stay cached. |
| V. Simple, single file | Four colour values and two manifest values; no new code path. |
| VI. General repo | No personal value. |

## Decisions (research)

1. **Recolour, do not redraw.** The drawing in `tools/build.py` keeps its loops, sizes and the maskable scale (0.78,
   which keeps the rosette's outer edge at about 144 of 512 px from the centre, inside the 205 px safe circle). Only
   `GROUND`, `RING`, `NAVY` and `AMBER` change.
2. **Manifest**: `theme_color` `#1F1F22` (the light accent) and `background_color` `#F2F2F0` (the light paper), as the
   spec's Assumptions say.
3. **Head meta**: `#1F1F22`, so the status bar is the accent before the look script runs.
4. **Out of the shipped app, left alone**: `.impeccable/design.json` (a design tool's saved notes) and
   `graphify-out/` (a code map) still name oxblood; they are not part of the app and are reported to the owner.

## Design

- **`tools/build.py`**: the meta, the manifest, the icon colours and their comment.
- **Generated**: `index.html`, `manifest.webmanifest`, `sw.js`, the four icon files.
- **`PRODUCT.md`**, **`DESIGN.md`**: the icon line.

### Tests

**`tests/e2e/icon.spec.js`**:
- the manifest has `theme_color` `#1F1F22` and `background_color` `#F2F2F0`;
- the served page's `<meta name="theme-color">` reads `#1F1F22` before any script;
- each icon, drawn on a canvas: its ground is `#1F1F22`, it holds navy and amber pixels, and no pixel is oxblood.

## Phases

| # | Phase | Gate |
|---|---|---|
| 1 | Build changes, icons redrawn, docs | Every check; parity 0 |
| 2 | E2E, ticks | Full E2E; `check-private` clean |
