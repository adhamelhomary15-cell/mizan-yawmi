# Implementation Plan: How to Add the App to the Home Screen

**Branch**: `034-install-hint` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

## Summary

One pure rule decides which steps a device needs: `installHintFor({ua, touch, standalone, offer})` returns `null`
(nothing to show) or `{os: 'ios' | 'android', inApp}`. A new part, `src/app/14c-install-hint.js`, reads the device
once, draws the steps (`InstallSteps`) and the dismissible notice (`InstallHint`). The shell shows the notice with the
other notices; Settings shows the steps under the storage line. Phase 1 is the iPhone, phase 2 adds Android. As in
earlier features, the decisions, data model and checks are kept in this file.

## Technical Context

- **Language**: the app script (`src/app/*.js`), CSS in `src/planner.html`.
- **Storage**: `mizan-install-hint` in localStorage, `"done"` once dismissed; its own key, outside progress, settings
  and backup, like `mizan-look`. Refused storage hides the notice until the page closes.
- **Tests**: `tools/check-install.js` (new, with `--self-test`) runs the rule against a table of user agents; E2E in
  `tests/e2e/install-hint.spec.js` with an iPhone, Android and desktop user agent; every other check and parity.
- **Constraints**: no network, no library, no file over 600 lines.

## Constitution Check (v3.0.1)

| Principle | Status |
|---|---|
| I. Human review | The owner approved running to the PR. |
| II. Checking off is human | No marks are touched. |
| III. Data stays on the device | No network; one local key for the dismissal. The notice exists to keep data on the phone. |
| IV. Honest, offline day | Day plans unchanged (parity 0). |
| V. Simple, single file | One rule, one small part, a few CSS lines. |
| VI. General repo | No personal value. |

## Decisions (research)

1. **Detection from the user agent, once.** iPhone, iPod and iPad by name, and an iPad that presents itself as a Mac by
   its touch points (`maxTouchPoints > 1`). Android by name. Opened from the home screen when
   `matchMedia('(display-mode: standalone)')` matches or `navigator.standalone` is true (Safari). In-app browsers by
   their usual markers (`FBAN`, `FBAV`, `FB_IAB`, `Instagram`, `WhatsApp`, `Line/`, `Snapchat`, `musical_ly`,
   `TikTok`, `Twitter`). Chrome, Firefox and Edge on iOS get the iPhone steps (they add to the home screen through the
   same Share sheet).
2. **The rule is pure and checked** (AGENTS.md: rules apart from screens): it sits in `13-rules.js` between
   `// start of install hint` and `// end of install hint`, run by `tools/check-install.js` like `check-now.js`.
3. **Android only when there is no install offer**: the existing «ثبّت» banner stays for Chrome's offer; the rule
   returns `null` on Android while the offer is held, so the two never show together. Settings passes `offer: false`
   so its steps always show while the app runs in a browser.
4. **The notice markup** follows `.notice` (same box), with an ordered list of two steps; `Notice` itself puts its text
   in a `<p>`, which cannot hold a list, so the hint has its own small markup with the same classes.
5. **The Share drawing**: a box with an arrow up, a 16 px line icon in the app's stroke, `aria-hidden` (the step's
   words name it).
6. **Copy** (Egyptian Arabic, with the English menu names in brackets because the phone may be in English):
   - title «ضيف ميزان يومي للشاشة الرئيسية»;
   - iPhone reason «على الآيفون، Safari ممكن يمسح بياناتك لو مافتحتش التطبيق فترة. من الشاشة الرئيسية بتفضل محفوظة.»;
   - Android reason «هتلاقيه بسرعة، ويفتح من غير نت زي أي تطبيق.»;
   - in-app: one step, «افتح اللينك في Safari (أو المتصفح) الأول، من قايمة التطبيق اللي انت فيه.»

## Design

- **`src/app/13-rules.js`**: the `install hint` rule block.
- **`src/app/14c-install-hint.js`** (new, in `ORDER` before `15-settings-view.js`): `INSTALL_DEVICE`, `InstallSteps`,
  `InstallHint`.
- **`src/app/21-shell.js`**: `<InstallHint offer=${!!installEvt} />` with the notices.
- **`src/app/15-settings-view.js`**: the steps under the storage line.
- **`src/planner.html`**: `.install-hint` styles.
- **`tools/check-install.js`** (new) and **`.github/workflows/checks.yml`**: two lines to run it.
- **README**: one line in the privacy part on the dismissal key.

### Tests

- **`tools/check-install.js`**: a table of user agents (Safari iPhone, iPad, iPad as Mac with touch, Chrome iOS,
  Instagram iOS, Chrome Android with and without the offer, Firefox Android, WhatsApp Android, desktop Chrome, desktop
  Safari, standalone iPhone) and their expected result. Mutations: the iPad-as-Mac case dropped; Android shown with
  the offer; standalone ignored.
- **`tests/e2e/install-hint.spec.js`**: iPhone shows the notice with both steps and the icon; «تمام» hides it after a
  reload; standalone shows nothing; desktop shows nothing; Android without offer shows the Android steps; Settings
  shows the steps after dismissal; storage blocked does not break; 375 px no sideways scroll.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | Rule (iPhone), check, part, shell, Settings, CSS | US1, US3 | Every check; parity 0; iPhone look at 375 px |
| 2 | Android in the rule and the copy | US2, US3 | Every check |
| 3 | E2E, README, ticks | all | Full E2E; `check-private` clean |
