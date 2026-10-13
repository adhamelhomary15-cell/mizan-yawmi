---
target: ميزان يومي (src/planner.html)
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:/home/claude/mizan-yawmi/src/planner.html"
target_fingerprint: "sha256:70128cb201f5aae7b2fc14288180fd58398a4daef94960c347312c2e55d8a897"
target_path: /home/claude/mizan-yawmi/src/planner.html
timestamp: 2026-10-12T20-30-06Z
slug: src-planner-html
---
⚠️ DEGRADED: single-context (sub-agents not used in this session; the same context built the changes)

## Design Health Score (Operate mode)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Now card with countdown, next block, next prayer and day progress; undo toast confirms deletions |
| 2 | Match System / Real World | 3 | Egyptian Arabic throughout; course subtitle mixes Arabic and Latin and breaks badly |
| 3 | User Control and Freedom | 3 | Skip and delete are reversible; "اتلغى النهارده" on the now card has no undo and the card jumps away |
| 4 | Consistency and Standards | 3 | One check, one row pattern, one undo pattern |
| 5 | Error Prevention | 3 | Time and title validation on new blocks; undo instead of confirm |
| 6 | Recognition Rather Than Recall | 3 | Six-item legend; skip is discoverable only through a hint line |
| 7 | Flexibility and Efficiency | 3 | One tap from the top of Today; add and skip in the app; no keyboard shortcuts |
| 8 | Aesthetic and Minimalist Design | 3 | Four families, no hero counters; phone Today still stacks target and note before the first block |
| 9 | Error Recovery | 3 | Inline errors with role=alert, work kept |
| 10 | Help and Documentation | 3 | Hint under the timeline, rules folded into a details block |
| **Total** | | **31/40** | **Good** |

## Design Specificity Verdict

The balance graphic now carries the product name into the interface: university and course on one pan, work and life on the other, tilting toward the side that got done. Prayer marks inside blocks, the gym anchored to Maghrib and the now card's next-prayer line keep the content specific. The row and card vocabulary is still conventional, which suits an Operate surface.

Deterministic scan: CLI 1 finding, the same false positive as before (#94a3b0, the dark-theme muted token, paired with the light surface). Browser injection: Today (phone light, phone dark, laptop) and Week clean. Tasks flagged two placeholders at 4.1:1, fixed after the scan by theming ::placeholder. Course reported 1 finding whose detail was not captured.

## Priority Issues

1. [P2] "اتلغى النهارده" on the now card applies at once with no undo, and the card moves on to the next block. Fix: send it through the undo toast. Command: harden.
2. [P2] On phones the target card and the day note still sit between the now card and the first block (~600px). Fix: fold the note under the heading or after the timeline; consider a slimmer target line. Command: distill.
3. [P2] Mixed-direction text breaks: a mixed-script course subtitle splits across lines, and long lecturer names wrap mid-name in row meta. Fix: isolate Latin runs with bdi, shorten meta. Command: typeset.
4. [P3] The Course tab detector finding is unexamined. Command: audit.

## Persona Red Flags

Casey: one tap on the now card, 48px buttons; a mis-tap on "اتلغى" has no undo.
Riley: deletions undo; a one-off block ending past midnight is accepted only before 7:00.
Sam: checks are role=checkbox with labels; rows expose aria-expanded.

## Questions to Consider

- Should the now card also offer "مدّ البلوك ربع ساعة" for blocks that run over?
- Does the target card need to be on Today at all once the course tab has a badge?
