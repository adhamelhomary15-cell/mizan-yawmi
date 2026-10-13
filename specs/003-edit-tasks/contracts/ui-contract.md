# UI Contract: Edit Tasks and Weekly Appointments

The app has no external API. The contract is the visible behavior of the Tasks tab. Copy is Egyptian
Arabic, right-to-left, using existing design tokens; no new colors or components beyond one form
variant.

## Task row

- A small pencil icon button (tooltip `عدّل`) sits next to `امسح`, with `aria-label="عدّل " + <task text>`; minimum hit area
  44 × 44 px like `.del`.
- It appears on open and done tasks alike (FR-001).

## Edit form (task), shown in place of the row

| Element | Content |
|---|---|
| Fields | same as the add form: text (`maxlength=140`), type (select from `TASK_TAGS`), due date (optional) |
| Title of the text field | `نص المهمة` (the add form keeps `مهمة جديدة`) |
| Buttons | `احفظ التعديل` (submit), `إلغاء` |
| Empty text | inline `form-err` (`role="alert"`): `اكتب نص المهمة.`; record unchanged |
| Date not a real date | `التاريخ مش مظبوط.`; record unchanged |
| Type no longer available | select shows an empty `اختار النوع` option; save blocked with `اختار النوع.` |
| Focus | first field on open; Escape = cancel; back to the row's `عدّل` button after save or cancel |

The add task form uses the same component and now also shows `اكتب نص المهمة.` on empty text instead of
doing nothing.

## Appointment row

- A small pencil icon button next to `افتح اليوم` and `امسح`, `aria-label="عدّل " + <name>`. The three
  buttons wrap under the text on narrow screens.

## Edit form (appointment), shown in place of the row

| Element | Content |
|---|---|
| Fields | same as the add form: name (`maxlength=60`), day (select), time |
| Buttons | `احفظ التعديل`, `إلغاء` |
| Errors | `اكتب اسم الميعاد.` / `اختار الساعة.` (existing wording); record unchanged |

## After a successful save

- Toast (existing `.toast`, 7 seconds): `اتعدّلت المهمة` or `اتعدّل الميعاد`, with the existing button
  `رجّعها`.
- `رجّعها` restores only the edited record's old values. It never touches any other record, any tick,
  or any other part of the store.
- The list order, the late marker, and the matching day of the schedule reflect the new values at once.

## Guarantees (testable)

1. After any edit, `done`, `created`, and `id` of the task are identical to before.
2. No code path in this feature writes `checks`, `modules`, or `done` (grep-able in the diff).
3. Cancel, Escape, and opening another edit change no stored data.
4. No network request is made by edit, save, or undo.
