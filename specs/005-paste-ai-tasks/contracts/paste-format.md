# Contract: the paste format and the paste area

The app has no external API. This contract is the text format an AI must produce, and the visible behaviour
of the paste area on the Tasks tab. All examples are generic.

## The line format

```text
type | task text | due date
```

| Part | Rule |
|---|---|
| `type` | a type id from the user's list (for example `uni`, `work`); the type's label is also accepted, matched case-insensitively after trimming |
| `task text` | 1 to 140 characters after trimming; must not contain `|` |
| `due date` | `YYYY-MM-DD` and a real date, or empty; the whole third field (with its `|`) may be left out |

Valid lines:

```text
uni | Solve the first practice sheet | 2026-10-20
work | Review the draft |
personal | Plan the weekend
```

### What the app skips without a message

- blank lines;
- a line that is only a code fence (three backticks, with an optional language word);
- a leading list marker: `-`, `*`, `•`, or a number followed by `.` or `)` (Latin or Arabic-Indic digits).

### What the app reports (the line is listed, never added, never hides other lines)

| Code | Message (Arabic, short) | When |
|---|---|---|
| `no-separator` | مفيش `|` في السطر ده | the line has no `|`, for example a greeting |
| `too-many-separators` | فيه `|` أكتر من اللازم | more than two `|` |
| `empty-text` | نص المهمة فاضي | the text between the separators is empty |
| `too-long` | النص أطول من 140 حرف (N) | text over 140 characters |
| `bad-date` | التاريخ مش مظبوط | a third field that is not an empty or real `YYYY-MM-DD` |

A line with an unknown or missing type is **not** an error: it appears in the preview with a type picker
(see below) and is added only after a type is chosen.

### Limits

- At most 50 candidate lines are read (fences and blanks do not count). Extra lines are counted and reported:
  «سيبت N سطر زيادة عن الحد (50)».
- The paste box accepts at most 20,000 characters.

## The instruction text (built by the app)

Built from the current type list and today's date. Shape (Arabic, shown to the user and copied as one block):

```text
قسّم المهمة الكبيرة اللي تحت لمهام فرعية صغيرة، وردّ بالمهام بس في كتلة كود واحدة، مهمة في كل سطر بالشكل ده بالظبط:
النوع | نص المهمة | آخر ميعاد

- النوع: واحد من دول بالظبط: <id1> (<label1>)، <id2> (<label2>)، ...
- نص المهمة: جملة قصيرة، أقل من 140 حرف، من غير الرمز | جواها، وبنفس لغة المهمة الكبيرة.
- آخر ميعاد: تاريخ بصيغة YYYY-MM-DD، أو سيبه فاضي لو مفيش. النهارده <today>.
- من غير ترقيم، ومن غير عناوين، ومن غير أي شرح قبل الكتلة أو بعدها.

مثال:
<id1> | حل شيت التمارين الأول | <today + 7 days>
<id2> | مراجعة المسودة |

المهمة الكبيرة:
اكتب مهمتك هنا
```

Rules: the example lines use the user's first two types and generic text; the format words never depend on
the user's data; the text contains no personal information.

## The paste area (Tasks tab)

- A button «الصق مهام من AI» next to «مهمة جديدة» opens the area in the Tasks section; it closes with
  «إلغاء» or Escape. No new colours or components: it reuses the panel, field, button, notice and toast styles.
- **Step 1**: the instruction text in a read-only box with the button «انسخ التعليمات». If the browser cannot
  copy, the box can be selected by hand and a short note says so.
- **Step 2**: a paste box labelled «الصق رد الـ AI هنا» (maxlength 20,000) and the button «افحص».
- **Preview** after «افحص»:
  - each proposed task: a checkbox to include it, its text, type, and due date (or «من غير ميعاد»);
  - a type picker with the empty option «اختار النوع» for a line with an unknown or missing type (unchecked and
    not includable until picked);
  - «ممكن يكون مكرر» on a duplicate, unchecked by default;
  - a separate list of rejected lines with the line number, the line, and the reason;
  - a count line: «N مهمة في المعاينة، M سطر مش مفهوم» (N counts every proposed task, including those that still need a type).
- **Confirm**: «ضيف N مهمة» (N = ticked tasks, disabled at 0). Closing or cancelling adds nothing.
- **After confirming**: the area closes, the draft is cleared, and the toast reads «اتضافت N مهمة» with the
  existing «رجّعها» button.
- Editing the paste box after a check discards the preview (the user presses «افحص» again), so the preview
  never shows stale results.
- Focus: «افتح» moves focus to the paste box; after confirm or cancel, focus returns to the button that
  opened the area. All controls are real buttons, selects and checkboxes, labelled for screen readers; the
  area fits 375 px with no horizontal scroll.

## Guarantees (testable)

1. Every candidate line ends in exactly one place: proposed, rejected, or counted as left out (SC-002).
2. Added tasks are always `done: false`; nothing in this feature writes `done`, `checks` or `modules`.
3. Undo removes only the batch tasks that are still untouched; every other record is unchanged.
4. No type is ever guessed; no text is ever cut.
5. No network request, no AI call, no clipboard read; the draft is never stored beyond the session.
