# Implementation Plan: Add Your Own Kinds

**Branch**: `016-new-kinds` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

## Summary

A new kind is one more entry in the settings' `categories`. Its id is `k1` to `k12`. Beside the built-in fields it
has two more: `color`, one of six ready colours, and `side`, which is `a`, `b`, or absent for neither.

The work is in three places:
- **The settings check and load** accept new kinds and build `CATS`, the balance families and the kind order
  from them.
- **The screens** stop listing the 9 ids by hand, and read the kind order and a class helper instead.
- **The editor's kinds part** can add, change and delete a new kind.

As in 014 and 015, the research, data model and checks are kept in this file instead of separate files.

## Technical Context

- **Language**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/app/*.js`.
- **Storage**: the settings store (013). Settings keep version 1, because a file without new kinds is unchanged.
- **Tests**:
  - `tools/check-schedule.js` for the rules and the colour contrast;
  - `tools/check-backup.js`, which runs the real `validateSettings`;
  - `tools/check-parity.js` must give 0 on the example and the private file;
  - Playwright E2E in `tests/e2e/schedule.spec.js`.
- **Target**: phone browsers at 375 px, offline (PWA).
- **Constraints**: no new library, no network, no file over 600 lines, no unused code (`check-code.js`).

Nothing is left as NEEDS CLARIFICATION.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | A kind change waits in the draft until the user saves, with 014's change summary. |
| II. Checking off is human | Adding, changing or deleting a kind ticks, cancels and moves nothing. Ticks of a deleted kind stay stored. |
| III. Data stays on the device | Kinds live in the settings store and its file. No network. |
| IV. Honest, offline day | A new kind's free time is used by 009's rules, as for any free kind. |
| V. Simple, single file | No new part file. Three rules in the schedule rules block, one helper in the day model. |
| VI. General repo | The colours and tests are generic. Nothing personal. |

All gates pass, before and after the design.

## Decisions (research)

1. **Ids `k1`…`k12`, given in order like subjects' `S1`…**
   - **Why**: an id never changes, so ticks (keyed by start and kind) and blocks stay linked when the name
     changes. A name-based id would break them on a rename.
   - **Rejected**: free ids. They could clash with a future built-in id.
2. **Six ready colours, each a pair of tokens in the CSS, light and dark.**
   - The colours are `teal`, `blue`, `green`, `slate`, `copper` and `olive`. Their tokens are `--k-teal` and so on.
   - Each pair holds AA contrast on paper and on its own tint, like the built-ins (DESIGN.md).
   - `check-schedule.js` reads the CSS and checks the contrast of the 6 pairs.
   - **Why**: the owner chose ready colours. Tokens keep the colours in the stylesheet, so the CSP hashes do not
     change at runtime.
3. **One class helper, `kc(cat)`.**
   - It returns `'c-' + cat` for a built-in, and `'c-k-' + colour` for a new kind.
   - It replaces the hand-made `'c-' + b.cat` in Today, the review, the Week strip, the Week rows, the now card,
     the check button and the balance petals (about 10 places).
   - The CSS gains `.c-k-teal{--c:var(--k-teal)}` and the other five.
   - **Rejected**: one class per kind id. The colour can change, so the id cannot carry it.
4. **One kind order, `KIND_IDS`, built at load.**
   - It holds the 9 built-ins, then the new kinds present in the settings, by number.
   - The places that list kinds by hand read it: the editor's block kinds, «ضيف حاجة لليوم ده», the Week rows and
     the balance order.
5. **Balance families come from the kinds.**
   - `FAMILY` keeps the built-ins' sides as they are, and adds each new kind's `side`.
   - Each side's petal order is the built-ins' order, then that side's new kinds.
   - The balance names (`BAL_A` and `BAL_B`) stay as they are.
6. **Deleting a kind is a rule, not a screen check.**
   - `removeKind(draft, id)` refuses a built-in, and a kind that a block uses. A refusal returns `{code: 'used',
     days}` with the days that use it.
   - **Why**: it can then be tested with mutations, like the other draft operations.
7. **Built-in kinds refuse `color` and `side`.**
   - The settings check refuses them with the field named. This keeps the built-in look and the balance as they
     are (spec, edge cases).
   - No existing file has them, so nothing that worked before breaks.

## Data model

- **Settings** `categories` (`01-settings-validate.js`):
  - an id is a built-in, or `k1`…`k12`;
  - a new kind has a `label` (1–30), and may have `long`, `track`, `postpone` and `free`, as before;
  - it must have a `color` from the six;
  - it may have a `side`, `'a'` or `'b'`; with no side, it counts on neither;
  - a label used by another kind is refused, for new kinds only. Built-in labels are not checked against each
    other, so older files stay valid.
- **Load** (`02-settings-load.js`):
  - `CATS` gains the new kinds;
  - `KIND_IDS` holds the order;
  - a new kind with no `long` uses its `label`.
- **Progress**: unchanged. Ticks of a deleted kind stay, keyed as before.

## Design

### Rules, in the schedule rules block (`src/app/13a-schedule-rules.js`, tested by `tools/check-schedule.js`)

- `addKind(draft, fields)` gives the next free id up to `k12`.
  - It returns `{ok, draft, id}`, or `{ok: false, code: 'full'}`.
  - A label already used gives `{ok: false, code: 'same-name', id}`, with the id of the kind that has it.
- `setKind` gains `color` and `side` in `KIND_FIELDS`. It keeps refusing nothing, and the settings check
  validates the result at save.
- `kindUses(draft, id)` returns the days whose blocks use the kind, in week order. This covers both versions of a
  two-version day.
- `removeKind(draft, id)` returns `{ok, draft}`, or `{ok: false, code: 'built-in' | 'used', days}`.

### Screens

- **`07-day-model.js`**: `FAMILY` is built from the kinds, and `kc(cat)` is added.
- **`08-ui-small.js`**: the check button and the petals use `kc`. The balance order is built-ins first, then
  new kinds.
- **`09-today.js`, `10-postpone-ui.js`, `11-week.js`**:
  - the hand-made classes become `kc`;
  - «ضيف حاجة لليوم ده» lists `KIND_IDS`, without move and rest, as now;
  - the Week adds a row per tracked new kind, after the built-in rows.
- **`14b-editor-view.js`**:
  - the block kind list reads the draft's kinds;
  - `KindsPart` lists built-ins, then new kinds;
  - a new kind shows a colour choice (6 round buttons with their names, each 44 px), a side select («الكفة
    الأولى» / «الكفة التانية» / «ولا كفة») and «امسح النوع»;
  - «امسح النوع» refused names the days: «مستخدم يوم السبت والتلات»;
  - «ضيف نوع» at the end opens one blank new kind in the draft. When 12 are there, it is replaced by «وصلت لآخر
    عدد (12)».
- **The editor's save summary** (014) already lists changed kinds. A deleted kind is listed by the name it had.

### Tests

- **`tools/check-schedule.js`**:
  - `addKind`: ids in order, the limit at 12, the same name;
  - `kindUses` and `removeKind`: a built-in, a used kind, a kind used only on a two-version day's B side, an
    unused kind;
  - `setKind` with `color` and `side`;
  - an oracle over 300 random drafts: a kind is removable exactly when no block of any version uses it;
  - the contrast of the 6 colour pairs on paper, on the dark surface and on their own tints;
  - the mutations: the limit removed, the used check skipped, version B not searched, a built-in removable.
- **Settings check** (in `check-backup.js`, which runs the real `validateSettings`):
  - a file with new kinds is valid;
  - a bad id (`k13`, `x1`), a bad colour, a bad side, a colour on a built-in, and two new kinds with one name are
    each refused with the field named.
- **Parity**: 0 differences on the example and the private file.
- **`tests/e2e/schedule.spec.js`**:
  - **US1**: add «تدريس» with a colour and the second side, put it on a block, and save. Today shows the block in
    that colour, ticking it moves the second side, and the Week has its row.
  - **US2**: deleting it while used names the day. Remove the block, delete the kind, save: it is gone from the
    lists.
  - **US3**: export, then import into a fresh page: the same kind.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | Settings check and load, `KIND_IDS`, `FAMILY`, `kc`, the CSS colours; screens use them | all | `check-backup`, contrast checks green; parity 0 |
| 2 | Rules `addKind`, `kindUses`, `removeKind`, with checks and mutations | US1, US2 | `check-schedule` green, mutations caught |
| 3 | The editor's kinds part: add, colour, side, delete | US1, US2 | Browser at 375 px, light and dark |
| 4 | Week rows and the balance for new kinds | US1 | E2E US1 |
| 5 | Export and import, E2E for US2 and US3, docs (README, DESIGN palette, PRODUCT), ticks, PR | US3 | All checks; `check-private` clean |

Phases 2 and 3 are one commit if `check-code` refuses the rules before their first use, as in 013–015.

## Risks

- **A missed hand-made class** would show a new kind without colour. A check greps the joined source for
  `'c-' + ` outside `kc` and fails on any left.
- **The balance names** say «محاضرات وكورس» even with a new kind on that side. This is accepted: renaming the
  sides is not part of this feature.
- **`ed-kind` grows** with 12 new kinds. Kinds stay inside the closed «الأنواع» panel, and each new kind is a
  collapsed row that opens on a tap.
