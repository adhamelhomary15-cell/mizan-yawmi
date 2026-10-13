# Quickstart: validate Blocks Anchored to a Prayer Time

Format and rules: [contracts/settings-anchor.md](contracts/settings-anchor.md). Layout rule:
[data-model.md](data-model.md).

## Prerequisites

- Branch `004-prayer-anchored-blocks`, built with `PYTHONUTF8=1 python tools/build.py` (then `git checkout`
  the icon files if Pillow re-rendered them).
- A local static server on the repository folder, and a 375 px wide viewport.
- The example settings (they include one anchored block), plus a copy with the anchor removed.

## 1. Script checks (no browser)

```bash
node tools/check-anchors.js
node tools/check-anchors.js --self-test
node tools/check-settings.js --self-test
node tools/check-edit.js
node tools/check-private.js
```

Expected: all pass. `check-anchors.js` runs the synthetic cases and a year sweep with the real prayer
calculation for the example city: SC-001, SC-002, SC-003 over every date and weekday.

## 2. No change without anchors (SC-006)

Load a settings file with no anchors in the build from `main` and in this branch's build:

```bash
node tools/check-parity.js --old <build-from-main> --new index.html --settings <file-without-anchors>
```

Expected: 0 differences over a full year (also with `--no-adhan`).

## 3. Anchored block follows the prayer (US1)

1. Open the example's anchored day on four dates across the year (the app's day picker): early winter,
   late winter, spring, midsummer.
2. On each, the anchored block starts 30 minutes before that date's Maghrib shown in the prayer card, within
   the 5-minute rounding. The first block's start and the last block's end are the same on all four.

## 4. The rest of the day stays honest (US2)

On the latest and the earliest Maghrib dates, open the anchored day: no overlap, no block under 15
minutes, only the block before the anchored one and the last block differ in length from the winter
layout, and the day ends at 01:00. The Week view's bars match the Today layout.

## 5. Fallbacks (US3)

1. Remove the location from the settings (or run with no prayer library): the anchored block is at its fixed
   time and the line «أوقات الصلاة مش متاحة…» shows.
2. Use settings with a tiny last block (for example 10 minutes of free time): on a late-Maghrib date the
   line «اليوم ده مش بيسع…» shows and every anchored block is at its fixed time.
3. Restore valid settings: the anchor applies again with no other action.

## 6. Import checks (US4)

Import, one at a time: unknown prayer; `min` of 200; direction `later`; anchor on the first block of a day;
anchor on the last block; a valid anchored file. The first five are rejected with a message naming the day
and block (nothing replaced); the last is accepted and the summary shows the count of anchored blocks.

## 7. Ticks stay put (Principle II)

Tick the anchored block on a date, then switch the location off and back on (so the block moves between
its computed and fixed time). The tick is still on the block and no other block gained or lost a tick.

## 8. Layout, offline, privacy

- 375 px: no horizontal scroll; the notice line wraps cleanly.
- Airplane mode: everything above works; the network panel shows 0 requests.
- `node tools/check-private.js` is clean; `git diff main` shows no write to `checks`, `modules` or `done`.
