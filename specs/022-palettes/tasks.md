---

description: "Task list for feature 022: colour palettes and a light, dark or automatic choice"
---

# Tasks: Colour Palettes and a Light, Dark or Automatic Choice

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**:
- `tools/check-schedule.js`, with `--self-test`, in CI;
- `tools/check-code.js`, `tools/check-security.js`, `tools/check-parity.js`;
- E2E in `tests/e2e/look.spec.js`.

## Binding rules

- No kind ink and no `--fg` changes in any palette (FR-002). The contrast check decides every colour.
- The look is written only when the user taps. Opening the app, importing settings and restoring a backup never
  write `mizan-look` (FR-004).
- Nothing reads or writes progress, workouts or settings (FR-007). No network, no library.
- The palette list lives only in the top script (`mizanLook`). The app holds no colours of its own (plan, decision 6).
- Show the diff before each commit. Run `node tools/check-private.js` (it reads `.private/settings.json`) with the
  files staged, and commit only on `RESULT: clean`.

---

## Phase 1: The colours and their checks (US1 colours)

- [x] T001 In `src/planner.html`, remove the `@media (prefers-color-scheme: dark)` block that copies
  `:root[data-theme="dark"]` (plan, decision 2). Leave `:root[data-theme="dark"]` as the one dark block.
- [x] T002 In `src/planner.html`, after the dark block, add the palette blocks for `olive`, `navy` and `graphite`:
  - `:root[data-palette="<id>"]{…}` for light, and `:root[data-palette="<id>"][data-theme="dark"]{…}` for dark;
  - each sets only `--shell`, `--shell-dim`, `--bg`, `--surface`, `--line`, `--quiet` and `--muted`, from the
    plan's table (decision 3). `--line` and `--quiet` follow the ground, a step darker in light and lighter in dark.
- [x] T003 [P] In `tools/check-schedule.js`, widen the contrast check to every palette × light/dark:
  - every ink, the nine and the six ready ones, holds 4.5:1 on `--surface`, on `--bg` and on its own tint (9% light,
    15% dark);
  - `--muted` holds 4.5:1 on `--surface`, and `--shell-fg` and `--shell-dim` hold 4.5:1 on `--shell`;
  - no palette block sets a kind ink or `--fg`;
  - two mutations, both caught by `--self-test`: an ink set inside a palette block, and a dark palette block
    missing a value.
- [x] T004 Until T005 lands, set `data-theme` by hand in the browser to check both themes. Then run parity: 0
  differences (SC-004). **Commit**.

## Phase 2: Picking a palette and a theme (US1, US2)

- [x] T005 In `src/planner.html`, before `<style>`, add the top script (plan, decisions 1, 5, 6 and 7):
  - reads `mizan-look` as `{"palette":"oxblood","theme":"auto"}`; a missing, broken or unknown field reads as its
    default;
  - sets `data-theme` (`light` or `dark`, never `auto`) and `data-palette` on `<html>`;
  - under `auto`, follows `matchMedia('(prefers-color-scheme: dark)')`, including a change while the page is open;
  - sets `<meta name="theme-color">` to the resolved band;
  - exposes `window.mizanLook = {palettes, get(), set({palette, theme})}`. `palettes` is
    `[{id, name, light, dark}]`, with the Arabic names «عنابي», «زيتي», «كحلي», «رمادي»;
  - `set` writes the key inside `try`, and applies the choice even when the write fails;
  - the storage read and write inside `try`, under 50 lines (plan, Complexity Tracking).
- [x] T006 [US1] [US2] In `src/app/15-settings-view.js`, add `LookSection` under «المستخدم دلوقتي»:
  - title «الشكل»;
  - a group of three: «فاتح» · «غامق» · «تلقائي», with the line «تلقائي بيمشي زي الموبايل» under it;
  - a group of four palette swatches with their names, each showing its light band colour from
    `mizanLook.palettes`;
  - the editor's kind-colour pattern (`.ed-colors` with `.swatch` buttons and `aria-pressed`, as in
    `14b-editor-view.js`), so the targets are 44px and the keyboard works as it does there;
  - one tap calls `mizanLook.set`, with no confirmation;
  - the line «الشكل بيتحفظ على الجهاز ده بس، ومش بيتغيّر لما تستورد إعدادات أو ترجّع نسخة احتياطية.»
- [x] T007 [P] [US1] Styles for the two groups: none needed. The existing `.ed-colors` and `.swatch` styles already
  give a one-pixel line, no shadow, and the band colour through `--c` (DESIGN.md).
- [x] T008 Run `tools/check-code.js` (the file stays under 600 lines) and `tools/check-security.js` (the new inline
  script is in the policy). Then, in the browser at 375 px, light and dark:
  - every palette, and the kinds' inks unchanged;
  - reopen offline: the kept look, with no flash;
  - «تلقائي» follows the phone;
  - the status bar takes the band's colour;
  - no sideways scroll.

  Show the owner the swatches (plan, Risks: bands near a kind's ink). **Commit**.

  Not checked by hand, moved to T013: reopening offline, and «تلقائي» following a phone change while open (the
  browser pane changes the emulated scheme without firing the `change` event; Playwright's `emulateMedia` does).

## Phase 3: The soft change (US3)

- [x] T009 [US3] In `src/planner.html`, register every colour variable used in `:root` with
  `@property --x{syntax:'<color>';inherits:true;initial-value:<its light value>}`, and `--tint` with
  `'<percentage>'`.
- [x] T010 [US3] In `src/planner.html`, give `:root` a transition on those variables, `.45s
  cubic-bezier(.16,1,.3,1)`. Add `:root{transition:none}` to the existing `prefers-reduced-motion` rule.
- [x] T011 [P] [US3] In `tools/check-schedule.js`, check that every `--` colour set in `:root` is registered with
  `@property`, with one mutation: a variable left unregistered.
- [x] T012 [US3] Measure a theme change on a 4× CPU-throttled phone profile. If frames drop noticeably, keep the fade
  on `--bg`, `--surface`, `--line`, `--shell` and `--fg` only, and let the inks change at once (plan, Risks).
  **Commit**.

  Measured on 2026-10-23 (Chromium, 375×812, CPU 4×, page open 3 s first, 700 ms after each change):
  - all 24 colours: 31 to 33 frames (about 45 fps), worst frame 33 to 50 ms;
  - 5 colours only: mostly 41 to 43 frames (about 60 fps), with an occasional slow frame of 67 to 83 ms;
  - reduced motion: 43 to 44 frames, and the new colour at once;
  - a check tap during the fade ticks the block.
  Kept all 24: no frame went past 50 ms, and with 5 the rows' inks would jump while the ground fades, against US3.
  A change in the first second after the page opens can take about 1 s on this profile, while the page is still
  busy loading.

## Phase 4: Tests, docs, PR

- [x] T013 In `tests/e2e/look.spec.js`:
  - **US1**: pick «كحلي»: the band and the ground change and a block row's ink does not; after a reload it is still
    «كحلي», and the first frame already has `data-palette="navy"`;
  - **US2**:
    - with the phone emulated light, tap «غامق» and reload: dark;
    - tap «تلقائي», switch the emulated phone to dark: dark without a reload;
    - under «فاتح», switching the phone changes nothing;
    - a first open on a dark phone with no stored choice: dark;
  - **US3**:
    - right after a tap, the computed `--bg` is between the old and the new value, and at 500ms it is the new one;
    - with reduced motion, the new one at once;
    - a check tap during the fade ticks the block;
    - «فاتح» then «غامق» within the fade: the page ends dark, and `--bg` never goes back toward light on the way;
  - **Edge**:
    - storage blocked: the choice applies, and a reload opens in the default with no error;
    - a broken `mizan-look` reads as the defaults;
    - restoring a backup and importing settings leave the look as it was, and the backup file has no `mizan-look`;
  - **Status bar**: `theme-color` equals the band, in light and in dark.

  Found while writing them: `openApp` fixes the date through Playwright's clock, which also replaces
  `requestAnimationFrame` and `performance.now`. The tests that read frames (the first frame and US3) open the app on
  the real clock with `openLive` instead, and count drawn frames rather than timers. Result: 25 passed and 1 skipped
  (offline on WebKit, as in `offline.spec.js`), stable over 8 runs and 5 repeats of each test.
- [x] T014 [P] Docs:
  - README: «الشكل» in the Settings part;
  - PRODUCT: the palettes and the theme choice in Capabilities, and that they stay on the device;
  - DESIGN: the four palettes, what they change and what they keep (the Denomination Rule), and the 450ms fade.
- [x] T015 Rebuild, then run every check, parity, the E2E tests and a 375 px look, offline. Tick the tasks, then push
  and open the PR when the owner asks. Merge when the owner asks.

## Summary

- Total: 15 tasks.
  - Colours and checks: 4.
  - Picking a palette and a theme: 4.
  - The soft change: 4.
  - Tests, docs and the PR: 3.
- MVP: phases 1 and 2 (US1 and US2). The look can be picked and kept, with the colours changing at once. Phase 3
  adds the fade on top, and nothing in phases 1 and 2 depends on it.
- Parallel: T003 with T001 and T002; T007 with T006; T011 with T009 and T010; T014 with T013.
