# Workout Guide exercise drawings

- **Source**: https://github.com/bryllim/workout-guide, commit `aac599224bb9780305239607ef98540b7e0ce389`
  (2026-08-26), folder `packages/workout-guide/assets`.
- **Authors**: Bryl Lim, building on artwork by Everkinetic. See [ATTRIBUTION.md](ATTRIBUTION.md).
- **License**: CC BY-SA 4.0. See [LICENSE-ASSETS.md](LICENSE-ASSETS.md). The two files beside this one are
  copied unchanged from that commit.

## What ميزان يومي changed

- Each exercise's start, middle and finish frames are stored as a JSON array of three SVG strings, gzipped, in
  `frames/<slug>.json.gz`.
- The app draws them in solid black (a CSS filter) on a light card.

These files are distributed under the same license, CC BY-SA 4.0.

## How the app uses them

- `tools/build.py` inlines only the drawings named in `WORKOUT_GUIDE_BUILTIN_SLUGS` (the built-in exercises).
- `names.json` maps English exercise names (lower case) to drawing names; the build inlines it, so a custom
  exercise with a known name can offer its drawing.
- Any other drawing is served from this folder by the app's own site. It is downloaded only when the user taps
  «نزّل الرسمة» on an exercise's page (feature 011).
