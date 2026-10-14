# Quickstart: Postpone What Was Not Done

Build with `python3 tools/build.py` (or `py` on Windows), serve the repo root, and open `index.html` at 375 px.
Generic data only.

## 1. Dev checks

```bash
node tools/check-postpone.js
node tools/check-postpone.js --self-test
node tools/check-settings.js --self-test
```

All of them pass. Parity (with the same settings on both sides) for a file without the flags shows 0 differences.

## 2. One block (US1)

1. With the example, leave a study block open today. Open «راجع يومك» and tap «أجّلها».
2. The proposal names a day and time inside «وقتك», with the same length. Tap «تمام».
3. Today's row shows «اتأجل لـ …». The new day shows the block with «اتأجلت من …». Undo restores both.
4. «غيّر»: pick a time that overlaps a tracked block, and it is refused. Pick a free one, and it is accepted.
5. Postpone the new extra again; it keeps the first date in «اتأجلت من».

## 3. Everything left (US2)

Leave three study, course or Quran blocks and one work block open, and tap «أجّل اللي فاضل كله». The list has
the three, each in its own place with no overlaps; work is not in it. Confirm, then undo once: everything is
back.

## 4. Tasks (US3)

Add a task due today and leave it open. In the review, «أجّلها» moves it to tomorrow; undo restores it.

## 5. Totals and privacy

- The week view counts a moved block's minutes once, on its new day.
- No done mark changes anywhere, and no network request is made.
- `check-private.js` is clean.
