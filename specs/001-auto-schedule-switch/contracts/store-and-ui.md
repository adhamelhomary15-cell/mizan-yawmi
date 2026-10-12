# Contract: stored field and notice UI

This app has no external API. The two surfaces this feature touches are the stored object and one
piece of UI.

## Stored object

- Key: `fall26-planner-v1` in `localStorage` (and the same object in the claude.ai synced copy).
- New optional field: `phaseSeen: 'A' | 'B' | null`.
- Guarantees: loading data that lacks the field yields `null`; saving preserves it; no other field is
  modified by showing or dismissing the notice.

## Version function

- `phaseFor(iso: 'YYYY-MM-DD') -> 'A' | 'B'`.
- Deterministic per date. Uses computed Maghrib when available, else the fallback rule from
  [data-model.md](../data-model.md). Never throws.

## Notice UI

| Property | Contract |
|---|---|
| Shown when | `phaseSeen` is non-null and differs from `phaseFor(today)` |
| Where | Top of the main column, above the active tab, on any tab |
| Content | One sentence (Egyptian Arabic) and one button `تمام`. To late: «المغرب بقى بعد 5:45، فمواعيد الشغل والجيم اتغيرت.» To early: «المغرب بقى قبل 5:45، فمواعيد الشغل والجيم اتغيرت.» (see research.md R6) |
| Dismiss | `تمام` sets `phaseSeen` to the current version; the notice does not return for that switch |
| Accessibility | `role="status"` region; button reachable by keyboard; text meets the contrast of existing banners |
| Style | Existing `.install` banner pattern and DESIGN.md tokens only |
| Must not | Touch checks, skip, or one-off blocks; auto-dismiss on a timer; make any network call |
