---
target: ميزان يومي (src/planner.html)
total_score: 33
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:/home/claude/mizan-yawmi/src/planner.html"
target_fingerprint: "sha256:451af6a00923f3129f053ae6a132676f0a56574acb08db411da41967e764e55f"
target_path: /home/claude/mizan-yawmi/src/planner.html
timestamp: 2026-10-12T20-58-39Z
slug: src-planner-html
---
⚠️ DEGRADED: single-context (sub-agents not used; the reviewing context also built the changes)

## Design Health Score (Operate mode)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Now card, countdown, unmarked-count at day end, toasts |
| 2 | Match System / Real World | 3 | Long English subject names wrap in the Week stats labels |
| 3 | User Control and Freedom | 4 | Every mark, skip and delete is reversible |
| 4 | Consistency and Standards | 4 | Forms open on demand everywhere; one check and undo pattern |
| 5 | Error Prevention | 3 | Validation and undo; no guard on marking a future block done |
| 6 | Recognition Rather Than Recall | 3 | The end-of-day card points to a button "فوق" instead of carrying it |
| 7 | Flexibility and Efficiency | 3 | Night review is one tap per block; no "mark all" |
| 8 | Aesthetic and Minimalist Design | 3 | On laptops "راجع يومك" floats alone under the day picker |
| 9 | Error Recovery | 3 | Inline errors with role=alert |
| 10 | Help and Documentation | 3 | Hint line and folded rules |
| **Total** | | **33/40** | **Good** |

## Design Specificity Verdict

Unchanged: the balance and the prayer-anchored schedule carry the product; rows and cards stay conventional for an Operate surface.

Deterministic scan: CLI 1 finding, the known false positive (dark-theme muted token on the light surface). Browser injection on 6 views including the open review and the open task form: clean.

## Priority Issues

1. [P2] At day end the now card says "دوس راجع يومك فوق" while the button sits in another element. Fix: put the review button inside the card when blocks are unmarked. Command: layout.
2. [P2] Night review costs one tap per block; a typical day is 7. Fix: "علّمهم كلهم خلصوا" with one undo. Command: shape.
3. [P3] Laptop: "راجع يومك" floats alone under the day picker. Fix: move it into the header actions. Command: layout.
4. [P3] Week per-subject labels wrap ("Operations Research"). Fix: wider label column or short codes (OR, NET). Command: typeset.
