# Contract: postponing in the day review

Egyptian Arabic, right to left. Dates and times in Latin digits inside `<bdi>`. Every control is at least 44 px.
Existing classes only (`.review-list`, `.btn`, `.notice`, `.field`).

## Settings

```json
"categories": {
  "study":    {"label": "مذاكرة", "track": true, "postpone": true},
  "personal": {"label": "وقتك", "free": true}
}
```

| Case | Result |
|---|---|
| `postpone` or `free` not a boolean | refused: `postpone must be true or false` / `free must be true or false` |
| No kind has `postpone` | no «أجّلها» anywhere; the app behaves as before |
| No kind has `free` | «أجّلها» still works, but every proposal is "nothing fits", so the picker opens |

## The review (one block)

- Row actions: «خلّصته», «أجّلها» (only for postponable kinds), «اتلغى».
- «أجّلها» opens, under the row:
  - when a place is found: «هتتحط <bdi>الخميس، 15 أكتوبر</bdi> من <bdi>11:30م</bdi> لحد <bdi>12:30ص</bdi>»,
    with «تمام» (primary, focused first), «غيّر» and «لأ»;
  - when nothing fits in 7 days: «مفيش وقت فاضي يسعها في الأسبوع الجاي، اختار يوم وميعاد», with the picker open.
- «غيّر» shows a day select (the next 14 dates, as weekday and date) and a start time. The end is the start plus
  the block's length. Refusals:
  - «الميعاد ده بيتداخل مع <اسم البلوك>»
  - «الميعاد ده بيعدّي آخر اليوم»
- Confirm shows the toast «اتأجلت "<العنوان>" لـ <اليوم>», with «رجّعها» for 7 seconds.
- Escape is the same as «لأ».

## The review (everything left)

- «أجّل اللي فاضل كله» appears when there are 2 or more postponable open blocks or tasks.
- It shows a list: «<العنوان> ← <اليوم> <من–لحد>», or «← بكره» for a task. An item with no place reads
  «مفيش مكان، هيفضل زي ما هو».
- Buttons: «أجّلهم» and «لأ». The toast: «اتأجل <N> حاجة».

## Tasks

- Each open task due on the reviewed day is listed with «خلّصتها» and «أجّلها». «أجّلها» sets the due date to
  the next day, with the toast and undo.

## On the days

- **Original day**: the row shows «اتأجل لـ <اليوم>», in the skipped row style, without the strike-through, and
  can be tapped to go to that day.
- **New day**: the extra block shows its title, kind and time, with the detail «اتأجلت من <التاريخ>».
- **Day progress**: «خلّصت N من M · اتأجل K».

## Guarantees (testable)

1. Nothing moves without a tap.
2. No `true` is written to `checks` by postponing.
3. Postponed items never overlap each other, a tracked block or another extra.
4. One undo restores the exact store.
5. A file without the flags shows no «أجّلها», and its day plans are unchanged.
