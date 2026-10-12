---
target: ميزان يومي (src/planner.html)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/claude/mizan-yawmi/src/planner.html"
target_fingerprint: "sha256:e616d57d24466873f3ae1fdbc2baf731d06b5f83435678887817a51113aeb7ae"
target_path: /home/claude/mizan-yawmi/src/planner.html
timestamp: 2026-10-12T20-18-11Z
slug: src-planner-html
---
⚠️ DEGRADED: single-context (sub-agents not used in this session; Assessment A was written before the detector ran)

## Design Health Score (Operate mode)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | "دلوقتي" pill, day progress and save status are there; the current block itself is off-screen on open |
| 2 | Match System / Real World | 3 | Egyptian Arabic, prayer names, ص/م times; "شغل حقيقي" collides with "شغل" (the job) |
| 3 | User Control and Freedom | 2 | Ticks undo fine; tasks and appointments delete instantly with no undo |
| 4 | Consistency and Standards | 3 | One check pattern everywhere; time ranges render differently between rows |
| 5 | Error Prevention | 2 | No confirm or undo on task delete; nothing distinguishes "skipped" from "forgot" |
| 6 | Recognition Rather Than Recall | 3 | Labeled nav and category labels on blocks; the week chart needs a 10-item legend |
| 7 | Flexibility and Efficiency | 2 | Mid-day tick needs ~1.7 screens of scroll; no way to adjust a block in the app |
| 8 | Aesthetic and Minimalist Design | 2 | Four stacked panels before the timeline; nine category colors |
| 9 | Error Recovery | 3 | Form errors are specific and in place |
| 10 | Help and Documentation | 2 | Day notes help; rules are a wall of 8 bullets at the bottom of Week |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

LLM assessment: the content is unmistakably this product (prayer times inside the blocks that contain them, gym anchored to Maghrib, tasmee after Isha, the real timetable and course). The visual structure is generic: tinted rounded cards stacked in a column, a progress bar, a rainbow chart. The name and the icon are a balance, and nothing in the interface shows balance.

Deterministic scan: CLI on src/planner.html found 1 finding (low-contrast #94a3b0 on #ffffff), a false positive: that is the dark-theme muted color paired with the light surface. Browser injection (phone and laptop, Today) found 2 real findings: work tag #a35f00 on #f7f1e8 at 4.46:1 and personal tag #b5577e on #f8f0f3 at 4.1:1, both 12px text. Week view: clean.

## Priority Issues

1. [P1] The current block is buried. On a 390px phone at 11:15pm the "دلوقتي" block starts 1,432px down, under the day picker, prayers, target card, progress and the day note. Fix: a compact "دلوقتي / الجاي" card at the top with a one-tap check, prayers and target folded into one slim strip, and the timeline scrolled to now on open. Commands: layout, distill.
2. [P1] Check targets are 26px. The main mid-day action is a thumb tap. Fix: make the whole block row the toggle, or a 44px target. Command: adapt.
3. [P2] Color overload. Nine categories; كلية, مذاكرة and كورس sit in close blue/teal/violet; amber and pink tags fail AA; the week strip needs a 10-item legend. Fix: three families (university, course, life) plus quiet tones for rest and commute; darken tag text. Commands: colorize, quieter.
4. [P2] Done or not-done only. Gym days get skipped, lectures move; stats cannot tell skipped from forgotten, and small schedule edits in the app (wanted) do not exist. Fix: a second action per block (اتلغى / اتنقل), then an edit mode. Command: shape.
5. [P2] Copy and time formatting. "0 س شغل حقيقي", "0 من 11" with no unit, end times wrapping to a lone "ل". Fix: rewrite labels and keep the range on one line. Command: clarify.

## Persona Red Flags

Casey (distracted, one hand): opens mid-day to tick the gym, scrolls past four panels, hits a 26px circle.
Riley (stress tester): deletes a task by mistake, gone; week opens with red "0 / 3".
Sam (keyboard / screen reader): checks are real buttons with role=checkbox and labels, focus ring visible. Two tag colors fail contrast.

## Minor Observations

- Laptop: the selected day chip shows only "اتنين"; the date number overlaps it.
- Week opens Saturday with red zeros that read as failure.
- Laptop Today: the side column ends early and leaves a long empty column.

## Questions to Consider

- What if the app opened on "the block you are in now" instead of the whole day?
- Could the balance itself be the progress visual: university and course on one side, life on the other?
- Does the week need ten colors, or three?
