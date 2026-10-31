---

description: "Task list for feature 029: «أجّلها» on the block's row"
---

# Tasks: «أجّلها» on the Block's Row

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**:
- `tools/check-postpone.js` (the rule, with self-test mutations), `tools/check-code.js`, `tools/check-security.js`,
  `tools/check-parity.js`, `tools/check-private.js`;
- E2E in `tests/e2e/block-postpone-row.spec.js` (new);
- by hand on the owner's phone.

## Binding rules

- A row shows «أجّلها» only for a tracked, open block of a postponable kind whose time has come: a past day always,
  today once it has started (`start <= now.min`), a future day never (FR-001).
- The button opens the same proposal as the block's actions (`PostponePanel`); only one proposal is open at a time
  (FR-002).
- Where a block goes, «تمام», «غيّر», «لأ», the day review and the ended-days question do not change (FR-007).
- At 375 px: no horizontal scroll, time, title and duration readable, the button at least 44 px tall (FR-005).
- No library, no network, no file over 600 lines.
- Build with `py -3 tools/build.py` on this machine.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: The rule (foundational)

- [x] T001 In `src/app/13-rules.js`, inside the postpone rules block, after `taskNextDay`, add
  `function timeHasCome(iso, start, today, nowMin){ return iso < today || (iso === today && start <= nowMin); }` with a
  one-line comment (a past day always, today once started, a future day never; minutes are the app's day minutes).
- [x] T002 [P] In `tools/check-postpone.js`, add `timeHasCome` to the names `load` returns, and checks:
  - a past day → true for starts 420, 900 and 1500; a future day → false for the same starts;
  - today with now at 960: start 900 → true, start 960 → true, start 961 → false;
  - after midnight in the app's day: start 1470 with now 1485 → true, with now 1455 → false.
  Self-test mutations, each of which a check must catch: "today only" (`iso === today && …` without `iso < today ||`),
  "strictly before now" (`start < nowMin`), "future days too" (`iso <= today || …` → any day), and "compared with now
  the other way" (`start >= nowMin`).
- [x] T003 Build, run `check-postpone` (with `--self-test`) and `check-code`. `check-code` refuses a function nothing
  uses, so T001 and T005 land in the same commit if T005 is not yet done; otherwise **Commit**.

## Phase 2: The button on today's rows (US1)

**Goal**: on today, every open postponable block from the one in progress back shows «أجّلها» on its row; one tap opens
the proposal.

**Independent test**: at 16:00 on Thursday, the study block that passed without a tick shows «أجّلها»; one tap opens
«هتتحط …»; later blocks show none.

- [x] T004 [P] [US1] In `src/planner.html`, after `.row-actions`, add `.row-pp{grid-column:2 / -1;display:flex;
  padding:0 0 var(--s2)}` and `.row-pp .btn{min-height:44px}`.
- [x] T005 [US1] In `src/app/10-postpone-ui.js`, in `TodayView`'s timeline map (plan decisions 2 and 3):
  - `const onRow = tracked && st === null && canPostpone(b) && timeHasCome(iso, b.s, now.iso, now.min) && !isOpen;`
  - after the duration (`denom`) and before `row-actions`, when `onRow`:
    `<div class="row-pp"><button type="button" class="btn" aria-label=${'أجّلها: ' + blockName(b, store)}
    aria-expanded=${postponing === b.key ? 'true' : 'false'} onClick=${() => { setOpen(null); setPostponing(postponing === b.key ? null : b.key); }}>أجّلها</button></div>`;
  - the proposal renders on `postponing === b.key` (drop the `isOpen &&` in front of it); its `onClose` stays
    `setPostponing(null); setOpen(null)`.
- [x] T006 [US1] Build, run `check-code`, `check-postpone` and parity (0 differences). In the browser at 375 px, light
  and dark, on the example week at 16:00 on Thursday:
  - the open postponable blocks up to the one in progress have «أجّلها» on their rows, and later blocks none;
  - one tap opens the proposal under the row; «تمام» moves the block; «رجّعها» brings the button back;
  - tapping a row's body shows its actions with one «أجّلها» only;
  - the «الآن» line on the row in progress: if it crosses the button, measure its share against `.row-body` (plan,
    decision 5);
  - no horizontal scroll; the button is 44 px tall.

  **Commit** (with T001 to T003 if they were not committed alone).

  Done on 2026-10-31, T001 to T006 in one commit (`check-code` needs `timeHasCome` used). `check-postpone` 12 of 12,
  self-test 17 of 17 (4 new mutations, each caught). On Chromium and WebKit at 375 px, light and dark, at 16:00 on the
  example Thursday: «أجّلها: مثال: مذاكرة مادة 1» and «أجّلها: مثال: مذاكرة مادة 2» (the one in progress), none on
  «مثال: كورس» at 19:00 nor on «مثال: شغل»; one tap opened «هتتحط الجمعة، 16 أكتوبر من 3:00م لحد 5:00م», «تمام» moved
  the block and removed its button, «رجّعها» brought it back; a tapped row showed one «أجّلها»; the button is 44 px;
  no horizontal scroll.
  - **Decision 5 was needed**: the «الآن» line sat at 387 px, across the button (375 to 419 px). A row with the button
    now carries `--pp` (the button's line: 44 px, its padding and the grid gap), and the line's top is
    `share × (100% − --pp)`, so it stays over the block part (342 px, beside «العصر 3:57»).
  - `escape.spec.js` clicked «أجّلها» anywhere in the page; at its 22:30 other rows now have one, so it clicks the one
    in the opened row's actions.
  Every check passes, parity 0 on the example and a private settings file, E2E 184 passed.

## Phase 3: Other days and the clock (US2, FR-004)

**Goal**: a past day shows the button on every open postponable block; a future day on none; on today, a block gains it
when its start passes.

**Independent test**: pick yesterday: the open study block shows «أجّلها». Pick tomorrow: no row does.

- [ ] T007 [US2] In the browser: a past day picked in the strip and a future day, as in the goal; on today, with the
  app open, moving past the next block's start gives that row the button within one clock tick. No code is expected
  here: `timeHasCome` already covers both. If the check finds a gap, fix it in `src/app/10-postpone-ui.js`. **Commit**
  only if something changed.

## Phase 4: Tests, docs

- [ ] T008 In `tests/e2e/block-postpone-row.spec.js` (Chromium and WebKit, `openApp` with `at` set to 16:00 Thursday
  15 October 2026 in Cairo, `new Date('2026-10-15T13:00:00Z')`, on the example week; progress seeded as
  `task-postpone.spec.js` does where marks are needed):
  - **US1**: the open postponable blocks up to the one in progress have «أجّلها» on their rows, later ones none; a
    done block, a cancelled block, and a block of a kind that cannot be postponed (e.g. «مثال: شغل») have none;
  - one tap opens the proposal under the row; «تمام» postpones the block (the row reads «اتأجل لـ …» and has no
    button); «رجّعها» brings it back;
  - tapping a row's body shows the actions with exactly one «أجّلها»;
  - **FR-004**: `page.clock.setFixedTime` past the next block's start, then `page.clock.runFor(30000)`: that row
    gains the button;
  - **US2**: a past day picked in the strip shows the button on every open postponable block; a future day shows none;
  - **FR-005**: at 375 px, no horizontal scroll, and the button's height is at least 44 px;
  - **FR-006**: the button's accessible name is «أجّلها: <block>».
- [ ] T009 [P] README.md, postponing: «أجّلها» shows on the row of an open block once its time has come (today from the
  one in progress back, a past day all of them); a later block keeps it behind a tap.
- [ ] T010 [P] DESIGN.md, «Block rows»: the «أجّلها» line under the title, only on open postponable blocks whose time
  has come.
- [ ] T011 Rebuild, then run every check with `--self-test`, parity on the example and on `.private/settings.json`, and
  the whole E2E suite. Run the new spec against broken sources (the rule always true, the button without
  `canPostpone`, the proposal still needing `isOpen`), rebuilt each time, and see it fail. Tick the tasks. **Commit**.

## Phase 5: PR

- [ ] T012 Push and open the PR when the owner asks. Merge when the owner asks. After it is published, the owner looks
  at it on the phone mid-day: a study block that passed without a tick shows «أجّلها», and later blocks don't.

## Dependencies

- Phase 1 comes first; `check-code` ties T001 to its first use (T005), so they may share a commit.
- Phase 2 (US1) before phase 3 (US2), which only checks what phase 2 built.
- Phase 4 needs phases 2 and 3; phase 5 needs phase 4.

## Parallel

- T002 with T001 (a different file); T004 with T005 (a different file).
- T009 and T010 with T008.

## Summary

- Total: 12 tasks.
  - The rule: 3.
  - US1, today's rows: 3.
  - US2, other days and the clock: 1.
  - Tests and docs: 4.
  - The PR and the phone check: 1.
- MVP: phases 1 and 2 (the button on today's rows, which is what the owner asked for).
