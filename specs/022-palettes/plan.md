# Implementation Plan: Colour Palettes and a Light, Dark or Automatic Choice

**Branch**: `022-palettes` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

## Summary

A new «الشكل» section in Settings offers four palettes («عنابي», «زيتي», «كحلي», «رمادي») and three theme choices
(«فاتح», «غامق», «تلقائي»). The choice is kept on the device under its own key, outside the settings, the progress
and the backup. Four parts change:
- **A small script at the top of the page** reads the kept choice and sets `data-theme` and `data-palette` on
  `<html>` before anything is drawn, so the app opens in the kept colours with no flash. It also follows the phone
  under «تلقائي» and sets the status bar colour.
- **The colours** gain three palette blocks in `src/planner.html`. Each block holds only the frame and ground
  colours, in light and dark. The kinds' inks are not touched.
- **The fade**: the colour variables are registered as colours and given a 450ms transition on `:root`. Turning
  reduced motion on removes the transition.
- **The checks**: the contrast check now covers every ink on every palette, light and dark, plus the band text.

As in 014, 015 and 021, the decisions, the data model and the checks are kept in this file.

## Technical Context

- **Language**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/planner.html` and
  `src/app/*.js`.
- **Storage**: one new localStorage key, `mizan-look`. It is not one of the three stores (`STORE_KEYS` in
  `01b-storage.js`), so it has no envelope, no IndexedDB mirror, no snapshot and no place in the backup file.
- **Tests**:
  - `tools/check-schedule.js`: contrast;
  - `tools/check-code.js`: line counts and unused code;
  - `tools/check-parity.js`: 0 differences;
  - `tools/check-security.js`: the Content-Security-Policy still covers every inline script;
  - Playwright E2E in `tests/e2e`.
- **Target**: phone browsers at 375 px, offline. Fading registered colours needs `@property` (Chrome 85+, Safari
  16.4+, Firefox 128+). Older browsers change the colours at once (spec, Assumptions).
- **Constraints**: no new library, no network, no file over 600 lines, no unused code.

Nothing is left as NEEDS CLARIFICATION.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | The look changes only when the user taps it. Nothing changes on open or on import. |
| II. Checking off is human | No mark, task or course module is read or written (FR-007). |
| III. Data stays on the device | One localStorage key. No network, and not in the export or the backup (FR-004). |
| IV. Honest, offline day | The colours are inline CSS and an inline script. Parity stays at 0 (SC-004). |
| V. Simple, single file | No library and no build step. One small inline script in `src/planner.html` (see Complexity Tracking). |
| VI. General repo | Palette names and colours are general. No personal value is added. |

All gates pass, before and after the design.

## Decisions (research)

1. **The look is applied before the page is drawn.**
   - **Decision**: an inline `<script>` at the top of `src/planner.html`, before `<style>`, does three things:
     1. It reads `mizan-look`.
     2. It works out the theme: under «تلقائي», from `matchMedia('(prefers-color-scheme: dark)')`.
     3. It sets `data-theme` (always `light` or `dark`) and `data-palette` on `<html>`, and the
        `<meta name="theme-color">`.
   - **Why**: the app script runs at the end of the body, after the first paint. Setting the look there would flash
     the default colours (FR-005). A browser applies no transition to the first style it computes, so the first paint
     shows the kept colours with no fade (FR-010).
   - **Rejected**: setting the look in the app script, which flashes; a CSS-only `prefers-color-scheme`, which cannot
     know the user's choice.
2. **`data-theme` is always set, so the dark colours live in one block.**
   - **Decision**: the script always writes `light` or `dark`. The `@media (prefers-color-scheme: dark)` block in
     `planner.html`, a copy of `:root[data-theme="dark"]`, is removed.
   - **Why**: today both blocks hold the same 24 values. With palettes they would double again: each palette would
     need a media copy as well as its `[data-theme="dark"]` block. One block per palette and theme is easier to check
     and to read.
   - **Risk**: if the script fails, the page shows light. It is about 40 lines, wraps everything in `try`, and the
     E2E covers it.
3. **A palette is a block of frame and ground colours.**
   - **Decision**: «عنابي» is the current `:root`. Each other palette is two blocks:
     - `:root[data-palette="olive"]{…}` for light;
     - `:root[data-palette="olive"][data-theme="dark"]{…}` for dark, which outranks the plain dark block.
   - **What a block sets**: only `--shell`, `--shell-dim`, `--bg`, `--surface`, `--line`, `--quiet` and `--muted`.
     `--fg`, `--shell-fg`, `--danger` and every kind ink stay as they are (FR-002).
   - **Candidate colours**: these pass the check below, each with at least 5.18:1 for every ink on its ground and
     tint. The owner may change them; the check decides.

     | Palette | Light: shell / dim / bg / surface / muted | Dark: shell / dim / bg / surface / muted |
     |---|---|---|
     | «عنابي» (now) | `#6E1A28` / `#E9C9CF` / `#E7ECE3` / `#FAFBF6` / `#585C52` | `#3A1119` / `#C9A3AA` / `#16141A` / `#201D24` / `#A7A39A` |
     | «زيتي» | `#434C14` / `#DDE3BF` / `#E9EADF` / `#FBFBF5` / `#5A5C4E` | `#262B0C` / `#C3C9A0` / `#151611` / `#1E2019` / `#A6A796` |
     | «كحلي» | `#1F2F4F` / `#C7D2E6` / `#E4E8EE` / `#F8FAFC` / `#545B66` | `#121C30` / `#A9B8D3` / `#12151B` / `#1A1F27` / `#A0A7B2` |
     | «رمادي» | `#2E3135` / `#D3D5D8` / `#E8E8E6` / `#FAFAF9` / `#57585A` | `#1E2023` / `#BFC1C4` / `#141516` / `#1D1E20` / `#A5A6A8` |

     `--line` and `--quiet` follow each palette's ground, a step darker in light and lighter in dark, as now.
4. **The fade is a CSS transition on registered colours.**
   - **Decision**: every colour variable is registered with `@property --x{syntax:'<color>';inherits:true;initial-value:…}`,
     and `--tint` with `'<percentage>'`. `:root` gets `transition` on these properties for 450ms with the rosette's
     curve, `cubic-bezier(.16,1,.3,1)`. The existing reduced-motion rule gains `:root{transition:none}`.
   - **Why**:
     - A registered variable is a real colour, so the browser can fade it, and every `var()` and `color-mix()` that
       uses it fades with it, all together (US3, scenario 1).
     - A CSS transition never blocks a tap (FR-011).
     - A second tap retargets from the current colour, with no flicker (spec, Edge Cases).
   - **Rejected**:
     - The View Transitions API: it draws a snapshot over the page during the fade, so taps go to the snapshot,
       which breaks FR-011.
     - A JavaScript tween: more code, and no gain.
5. **The choice is a small key of its own.**
   - **Decision**: `mizan-look` holds `{"palette":"oxblood","theme":"auto"}`. It is written only when the user taps.
     A missing, broken or unknown value reads as the default for that field.
   - **Why**:
     - Not a store, so it stays out of the backup, the export and the snapshots (FR-004).
     - Restoring a backup or importing settings never touches it (spec, Edge Cases).
     - When storage is blocked, the write fails quietly and the choice lasts until the page closes.
6. **One owner for the look.**
   - **Decision**: the top script exposes one object, `window.mizanLook = {palettes, get(), set({palette, theme})}`.
     The palette list (id, Arabic name, swatch colours) is held only there. The Settings section reads it and calls
     `set`; it holds no colours of its own.
   - **Why**: the script must know each palette's band colour before the app loads (for `theme-color`), so it owns
     the list. A second copy in the app would drift.
7. **The status bar follows the band.**
   - **Decision**: `set` and the phone listener update `<meta name="theme-color">` to the resolved `--shell`. Today
     it is fixed at `#6E1A28`, even in dark. The static value in `tools/build.py` stays as the value before the script
     runs.

## Data model

- **`mizan-look`** (localStorage, not a store): `{palette: 'oxblood' | 'olive' | 'navy' | 'graphite', theme: 'light' | 'dark' | 'auto'}`.
  Defaults are `oxblood` and `auto`.
- **On `<html>`**: `data-palette` (one of the four ids) and `data-theme` (`light` or `dark`, never `auto`).
- **Settings, progress, workouts, backup**: unchanged.

## Design

### Changes

| File | Change |
|---|---|
| `src/planner.html` | The top script (decisions 1, 5, 6, 7). Three palette blocks in light and dark. The duplicate dark media block removed. `@property` registrations and the `:root` transition. `:root{transition:none}` in the reduced-motion rule. Styles for the «الشكل» section's two radio groups. |
| `src/app/15-settings-view.js` | A `LookSection` component under «المستخدم دلوقتي»: four palette swatches and three theme buttons, each as a radio group with 44px targets and the chosen one marked. It calls `mizanLook.set` and keeps the choice in component state. The file stays under 600 lines (about 380). |
| `tools/check-schedule.js` | The contrast check covers every palette × light/dark (decision 3, check below). |
| `README.md`, `PRODUCT.md`, `DESIGN.md` | «الشكل» in the Settings capabilities. The palettes and the fade in the design colours. |

`tools/build.py` does not change. Its Content-Security-Policy step already hashes every inline script, so the new
one is allowed; `check-security.js` confirms it.

### UI copy

- Section title: «الشكل».
- Theme: «فاتح» · «غامق» · «تلقائي». Under «تلقائي»: «زي الموبايل».
- Palettes: «عنابي» · «زيتي» · «كحلي» · «رمادي».
- A line under the section: «الشكل بيتحفظ على الجهاز ده بس، ومش بيتغيّر لما تستورد إعدادات أو ترجّع نسخة احتياطية.»

### Tests

- **`tools/check-schedule.js`**:
  - For each palette and theme: every ink (the nine and the six ready ones) holds 4.5:1 on `--surface`, on `--bg`
    and on its own tint (9% light, 15% dark). `--muted` holds 4.5:1 on `--surface`, and `--shell-fg` and
    `--shell-dim` hold 4.5:1 on `--shell` (SC-003).
  - No palette block sets a kind ink or `--fg` (FR-002).
  - Every `--` colour used in `:root` is registered with `@property` (decision 4).
  - Mutations: an ink inside a palette block, and a dark palette block missing a value. Both must be caught.
- **`tools/check-parity.js`**: 0 differences (SC-004).
- **`tests/e2e/look.spec.js`**:
  - **US1**: pick «كحلي»: the band and the ground change, a block row's ink does not, and after a reload it is still
    «كحلي». The first frame after reload already has `data-palette="navy"` (no flash).
  - **US2**:
    - with the phone emulated light, tap «غامق», reload: dark;
    - tap «تلقائي», switch the emulated phone to dark: the page turns dark without a reload (SC-005);
    - under «فاتح», switching the phone changes nothing.
  - **US3**:
    - right after a tap, the computed `--bg` is between the old and new value, and at 500ms it is the new one
      (SC-006);
    - with reduced motion emulated, it is the new one at once;
    - a check tap during the fade ticks the block.
  - **Edge**: storage blocked: the choice applies, and a reload opens with the default and no error. A broken
    `mizan-look` reads as the defaults. Restoring a backup and importing settings leave the look as it was, and the
    backup file has no `mizan-look`.
  - **Status bar**: `theme-color` equals the palette's band in light and in dark.
- **By hand**: a phone-sized screen in daylight and at night, every palette, offline (constitution, Workflow).

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | Palette blocks, the single dark block, and the contrast checks | US1 colours | `check-schedule` green, mutations caught; parity 0 |
| 2 | Top script, `mizanLook`, `theme-color`, and the «الشكل» section | US1, US2 | E2E for US1 and US2; browser at 375 px |
| 3 | `@property`, the fade and reduced motion | US3 | E2E for US3; a fade measured on a throttled phone profile |
| 4 | Docs (README, PRODUCT, DESIGN), ticks, PR | — | All checks; `check-private` clean |

## Complexity Tracking

| Deviation | Why it is needed | Simpler choice rejected because |
|---|---|---|
| A script outside the `src/app` parts (in `src/planner.html`) | It must run before the first paint. The app parts run at the end of the body. | Setting the look in the app flashes the default colours (FR-005). |

`check-code.js` does not read this script, so its size and behaviour are held by the E2E. It stays under 50 lines.

## Risks

- **Fade cost on slow phones**: fading about 25 registered variables restyles the page each frame for 450ms. Phase 3
  measures it on a 4× CPU-throttled phone profile. If frames drop noticeably, the fade keeps only the ground and the
  band (`--bg`, `--surface`, `--line`, `--shell`, `--fg`), and the inks change at once.
- **Palette band close to a kind's ink**: «زيتي»'s band is near the added kind colour olive, «كحلي»'s near blue, and
  «رمادي»'s near slate. The band is only used for the frame, as oxblood already sits near the university ink today.
  The owner decides on the swatches in phase 2; the colours can move without any change to the plan.
- **Removing the media dark block**: every path to dark now goes through the top script. The E2E covers a first
  open with no stored choice on a dark phone.
