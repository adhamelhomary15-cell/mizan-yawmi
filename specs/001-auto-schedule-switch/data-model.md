# Data Model: Automatic Schedule Switch

## Existing entities (unchanged)

- **Day plan**: `SCHED[weekday].blocks`, either one list or `{A, B}` (late and early versions).
- **Block**: tuple `[time, category, title, detail?, subject?]`; its done/skip key is `time + '-' + category`.
- **Prayer times**: computed per ISO date by `prayers(iso)` (adhan, Egyptian method, Giza); `maghrib` in minutes.
- **Checks**: `store.checks[iso][blockKey]`. Not touched by this feature.

## Derived value: Version

| Field | Meaning |
|---|---|
| Input | Cairo ISO date (`YYYY-MM-DD`) |
| Primary rule | `'A'` (late) if that date's Maghrib is at or after 17:45, else `'B'` (early) |
| Fallback rule (prayer times unavailable) | `'A'` from 16 Feb through the last Thursday of October inclusive, else `'B'` |
| Stability | One value per date, never changes within a day |

## New stored field

On the single store object (`fall26-planner-v1`, `v:1`):

| Field | Type | Default | Validation |
|---|---|---|---|
| `phaseSeen` | `'A'` \| `'B'` \| `null` | `null` | anything else normalizes to `null` |

Meaning: the version the owner last saw or dismissed.

### State transitions

```text
null ──(first open)──────────────► current version      (silent, no notice)
X ───(current version == X)──────► X                    (no notice)
X ───(current version != X)──────► notice shown
notice ──(owner taps تمام)───────► phaseSeen = current version   (notice hidden)
```

Rules:
- The comparison uses the version for today's effective Cairo date (the day ends at 1:00am).
- The notice never writes `checks`, `extras`, or any other field (Principle II).
- If storage is unavailable (`LOCAL_OK` false), the notice may reappear each load; acceptable, since
  the app already warns that nothing is saved in that case.

## Compatibility

Additive and optional: existing saved data without `phaseSeen` loads as `null`; no version bump or
migration is needed. `normalize()` and `EMPTY()` must both carry the field or it is lost.
