# Quickstart: Choose Which Block Absorbs a Prayer Shift

A validation guide. Build with `python3 tools/build.py` (or `py` on Windows), serve the repo root locally, and
open `index.html` at 375 px. Use only the example or scratch settings.

## 1. Dev checks

```bash
node tools/check-anchors.js
node tools/check-anchors.js --self-test
node tools/check-anchors.js --require-fit
node tools/check-settings.js
node tools/check-settings.js --self-test
```

Expected results:
- All checks pass.
- The self-test notices every mutation.
- The example sweep for 2026 to 2028 fits on every date, with 0 rule breaks.

## 2. Nothing changes without the key

```bash
node tools/check-parity.js --old <main build> --new src/planner.html --settings <a file with anchors but no absorb>
```

Expected result: 0 differences, with and without `--no-adhan`.

## 3. The example day in the browser (US1)

Import nothing, so the example is shown. Open the anchored day of the example on these dates:
- **A summer date**: the workout is later than 16:30. Dinner follows it. The course block is shorter by the
  same amount and ends at 21:00. Free time starts at 21:00 as usual.
- **A winter date**: the workout is earlier. The study block before it is shorter, and the course block is
  longer.
- **The Week view**: its bars agree with Today on both dates.

## 4. Import cases (US2)

Import, in turn:
- the example with `absorb` changed to a time that matches no block;
- a time before the anchored block;
- a time on a later anchored day after another anchor;
- `"7pm"`.

Each must show its message naming the day and block, and the stored settings key must be unchanged. A
correct file shows «بلوك بياخد فرق الصلاة» in the import preview.

## 5. Privacy

`node tools/check-private.js` is clean before each commit, and no network request is made at any point.
