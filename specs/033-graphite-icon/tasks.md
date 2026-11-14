---

description: "Task list for feature 033: the app icon in graphite"
---

# Tasks: The App Icon in Graphite

**Input**: [spec.md](spec.md), [plan.md](plan.md)

## Binding rules

- The rosette's shape does not change. No screen changes. No network, no new library.
- Run `node tools/check-private.js` with the files staged; commit only on `RESULT: clean`. No push, no PR.

## Phase 1: The icon and the frame colours

- [ ] T001 `tools/build.py`: the head meta `#1F1F22`; the manifest `theme_color` `#1F1F22`, `background_color`
  `#F2F2F0`; the icon colours of option B.
- [ ] T002 Build with `--icons`; check each icon by eye; every check; parity 0.
- [ ] T003 [P] `PRODUCT.md`, `DESIGN.md`: the icon line.

## Phase 2: Tests

- [ ] T004 `tests/e2e/icon.spec.js`: manifest, first meta, icon pixels.
- [ ] T005 Full E2E with `--workers=2`, `check-private`. Tick the tasks.
