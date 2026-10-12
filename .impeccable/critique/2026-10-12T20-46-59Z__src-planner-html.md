---
target: ميزان يومي (src/planner.html)
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:/home/claude/mizan-yawmi/src/planner.html"
target_fingerprint: "sha256:a25d730ef27abb6b3c575700dee5eeaa93f71b5d75f0748e6f388342633a3966"
target_path: /home/claude/mizan-yawmi/src/planner.html
timestamp: 2026-10-12T20-46-59Z
slug: src-planner-html
---
⚠️ DEGRADED: single-context (sub-agents not used; the reviewing context also built the changes)

## Design Health Score (Operate mode)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Now card, countdown, next prayer, progress, toasts |
| 2 | Match System / Real World | 3 | Egyptian Arabic; English module names wrap with a leading "·" in the target card |
| 3 | User Control and Freedom | 4 | Tick, skip, delete and one-off blocks are all reversible |
| 4 | Consistency and Standards | 3 | One check, row and undo pattern; Tasks uses always-open forms unlike Today |
| 5 | Error Prevention | 3 | Validation on new blocks and courses; undo instead of confirm |
| 6 | Recognition Rather Than Recall | 3 | Skip is found through a hint line |
| 7 | Flexibility and Efficiency | 3 | One tap from the top; no shortcut for the night review |
| 8 | Aesthetic and Minimalist Design | 3 | Tasks opens on two forms before the list |
| 9 | Error Recovery | 3 | Inline errors with role=alert |
| 10 | Help and Documentation | 3 | Hint line and folded rules |
| **Total** | | **32/40** | **Good** |

## Design Specificity Verdict

The balance carries the product idea; prayer marks, Maghrib-anchored gym and recitation keep the content specific. Rows and cards are conventional, which fits an Operate surface.

Deterministic scan: CLI 1 finding, the known false positive (dark-theme muted token against the light surface). Browser injection on 7 views (phone light and dark Today, Week, Course, Tasks; laptop Today and Week): clean.

## Priority Issues

1. [P2] The night review is not served. After the last block the now card says there is nothing left, while the day can sit at 0 of 7 ticked; reviewing at night is a stated use. Fix: after the last tracked block, the card becomes "راجع يومك" listing unticked blocks with one-tap done or skip, next to the day balance. Command: shape.
2. [P2] Tasks opens on two always-open forms; the task list starts below the fold on phones. Fix: list first, "+ مهمة" and "+ ميعاد" open inline. Command: distill.
3. [P3] Day picker chips are about 36px wide on a 390px phone. Command: adapt.
4. [P3] Target card "الجاي" line wraps and starts its second line with "·". Command: typeset.

## Persona Red Flags

Casey: at 11pm opens the app to tick the day and finds no prompt to do it.
Riley: nothing broken found; extras past 1:00 are not supported.
Sam: no findings; checks and rows are labeled.
