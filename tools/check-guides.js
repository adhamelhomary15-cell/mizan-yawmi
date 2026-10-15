#!/usr/bin/env node
/*
 * Dev-only check for the exercise drawings (feature 011; not shipped with the app).
 *
 *   node tools/check-guides.js              run the checks against src/planner.html, index.html and sw.js
 *   node tools/check-guides.js --self-test  break things on purpose and check that this script notices
 *
 * It runs the app's own code: the block between "start of guide rules" and "end of guide rules". It also checks
 * that the vendored drawings are complete and valid, that the app's only network request is the drawing
 * download, that the service worker keeps downloaded drawings, and that the built app stays small.
 * Run tools/build.py first. Output is check names only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const FRAMES = path.join(ROOT, 'tools', 'vendor', 'workout-guide', 'frames');
const MAX_APP = 2 * 1024 * 1024;
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const START_MARK = '// start of guide rules', END_MARK = '// end of guide rules';
function block(source) {
  const a = source.indexOf(START_MARK), b = source.indexOf(END_MARK);
  if (a < 0 || b < a) throw new Error('guide rules block not found in src/planner.html');
  return source.slice(a, b);
}
const load = source => new Function(block(source) + '\nreturn {GUIDE_PATH, guideUrl, checkGuideFrames};')();

// The slugs named by a table such as WORKOUT_GUIDE_BUILTIN_SLUGS = {...} in the source.
function slugsOf(source, name) {
  const m = source.match(new RegExp('const ' + name + ' = \\{([^}]*)\\}'));
  if (!m) throw new Error(name + ' not found');
  return new Set([...m[1].matchAll(/:\s*"([a-z0-9-]+)"/g)].map(x => x[1]));
}
// The body of a function, by brace matching from the brace after its parameters.
function fnBody(source, name) {
  const s = source.indexOf('function ' + name + '(');
  if (s < 0) return '';
  let depth = 0;
  for (let j = source.indexOf('{', source.indexOf(')', s)); j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}' && --depth === 0) return source.slice(s, j + 1);
  }
  return '';
}

const files = fs.readdirSync(FRAMES).filter(f => f.endsWith('.json.gz')).sort();
const vendored = files.map(f => ({slug: f.slice(0, -8), frames: JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(FRAMES, f))).toString('utf8'))}));
const svg = body => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' + body + '</svg>';
const ok3 = [svg('<path d="M0 0L9 9"/>'), svg('<use href="#a"/>'), svg('<g id="a"/>')];

function runChecks(src, app, sw) {
  const results = [];
  const check = (name, fn) => { let ok = false; try { ok = !!fn(); } catch (e) { ok = false; } results.push([name, ok]); };
  const h = load(src);

  check('a drawing path is built only from a plain slug', () =>
    h.guideUrl('cable-fly') === h.GUIDE_PATH + 'cable-fly.json.gz' && h.GUIDE_PATH === 'tools/vendor/workout-guide/frames/'
    && ['', '../x', 'a/b', 'Cable', 'a--b', '-a', 'https://x', 'a.b', null, 3].every(s => h.guideUrl(s) === null));
  check('every vendored drawing passes the frame rules', () => vendored.length > 0 && vendored.every(v => h.checkGuideFrames(v.frames).ok));
  check('bad drawings are refused', () => {
    const bad = [
      null, 'x', ok3.slice(0, 2), ok3.concat(ok3[0]), [ok3[0], ok3[1], 7], [ok3[0], ok3[1], '<div></div>'],
      [ok3[0], ok3[1], svg('<script>alert(1)</script>')], [ok3[0], ok3[1], svg('<g onload="x()"/>')],
      [ok3[0], ok3[1], svg('<foreignObject/>')], [ok3[0], ok3[1], svg('<a href="https://x/">a</a>')],
      [ok3[0], ok3[1], svg('<use xlink:href="https://x/#a"/>')], [ok3[0], ok3[1], svg('<g style="fill:url(https://x/)"/>')],
      [ok3[0], ok3[1], svg('<a href="javascript:x()">a</a>')], [ok3[0], ok3[1], svg('<path d="' + 'M0 0'.repeat(300000) + '"/>')]
    ];
    return h.checkGuideFrames(ok3).ok && bad.every(f => !h.checkGuideFrames(f).ok);
  });
  check('the vendor folder has exactly the drawings the app names', () => {
    const named = new Set([...slugsOf(src, 'WORKOUT_GUIDE_BUILTIN_SLUGS'), ...slugsOf(src, 'WORKOUT_GUIDE_NAME_TO_SLUG')]);
    const have = new Set(vendored.map(v => v.slug));
    return [...named].every(s => have.has(s)) && [...have].every(s => named.has(s));
  });
  check('the only network request in the app is the drawing download, to a drawing path', () => {
    const fetches = src.split('fetch(').length - 1, dl = fnBody(src, 'downloadGuide');
    return fetches === 1 && /await fetch\(url, \{credentials: 'omit'/.test(dl) && /const url = guideUrl\(slug\);/.test(dl)
      && !/XMLHttpRequest|sendBeacon|WebSocket|EventSource|\bimport\(|\.src\s*=\s*['"]https?:/.test(src);
  });
  check('kept drawings are only looked up, never requested, before a tap', () => {
    const kept = fnBody(src, 'keptGuide'), loadFn = fnBody(src, 'loadWorkoutGuideFrames');
    return /\.match\(url\)/.test(kept) && !/fetch\(|downloadGuide/.test(kept + loadFn)
      && /onClick=\$\{download\}/.test(fnBody(src, 'ExerciseArt')) && (src.match(/downloadGuide\(/g) || []).length === 2;
  });
  check('the source leaves the built-in drawings to the build', () => src.includes('const WORKOUT_GUIDE_ASSETS = {};'));
  check('the built app inlines exactly the built-in drawings and stays under 2 MB', () => {
    const m = app.match(/const WORKOUT_GUIDE_ASSETS = \{([^}]*)\}/);
    const inl = new Set([...m[1].matchAll(/"([a-z0-9-]+)":"H4sI/g)].map(x => x[1])), want = slugsOf(src, 'WORKOUT_GUIDE_BUILTIN_SLUGS');
    return Buffer.byteLength(app) < MAX_APP && inl.size === want.size && [...want].every(s => inl.has(s));
  });
  check('the service worker leaves drawings to the app and keeps their cache on update', () =>
    sw.includes("url.pathname.includes('/tools/vendor/workout-guide/')) return;") && sw.includes("!k.startsWith('mizan-guides-')")
    && /const GUIDE_CACHE = 'mizan-guides-v\d+';/.test(src));
  check('the rules block never mentions storage, the page or the network', () => {
    const b = block(src).split('\n').map(l => l.replace(/\/\/[^\r\n]*/, '')).join('\n');
    return !/localStorage|caches\.|fetch\(|XMLHttp|document\.|window\.|navigator\./.test(b);
  });
  return results;
}

function report(results) {
  results.forEach(([n, ok]) => console.log((ok ? 'ok    ' : 'FAIL  ') + n));
  const failed = results.filter(r => !r[1]).length;
  console.log('\n' + (results.length - failed) + ' of ' + results.length + ' checks passed');
  return failed;
}

let src, app, sw;
try { src = read('src/planner.html'); app = read('index.html'); sw = read('sw.js'); } catch (e) { console.error(e.message); process.exit(2); }

if (process.argv.includes('--self-test')) {
  // [name, which file, mutation]
  const mutations = [
    ['a second network request', 'src', s => s.replace('  // end of guide rules', '  fetch(\'x\');\n  // end of guide rules')],
    ['the slug check is dropped', 'src', s => s.replace("/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)", "slug.length > 0")],
    ['scripts are allowed', 'src', s => s.replace('/<script|<foreignObject', '/<foreignObject')],
    ['outside links are allowed', 'src', s => s.replace("if (!/^#[\\w.:-]+$/.test(m[2])) return {ok: false};", '')],
    ['the frame count is not checked', 'src', s => s.replace('frames.length !== 3', 'frames.length < 1')],
    ['a kept drawing is fetched instead of looked up', 'src', s => s.replace('.match(url);', '.match(url) || await fetch(url);')],
    ['a built-in drawing is left out of the build', 'app', s => s.replace('"bench-press":"H4sI', '"bench-pressx":"H4sI')],
    ['the service worker deletes downloaded drawings', 'sw', s => s.replace(" && !k.startsWith('mizan-guides-')", '')],
    ['the service worker caches drawings itself', 'sw', s => s.replace(" || url.pathname.includes('/tools/vendor/workout-guide/')", '')]
  ];
  let missed = 0;
  mutations.forEach(([name, which, mutate]) => {
    const files = {src, app, sw}, before = files[which];
    files[which] = mutate(before);
    if (files[which] === before) { console.log('FAIL  mutation did not apply: ' + name); missed++; return; }
    let results;
    try { results = runChecks(files.src, files.app, files.sw); } catch (e) { results = [['load', false]]; }
    const noticed = results.some(r => !r[1]);
    console.log((noticed ? 'ok    ' : 'FAIL  ') + 'noticed: ' + name);
    if (!noticed) missed++;
  });
  const clean = runChecks(src, app, sw).every(r => r[1]);
  console.log((clean ? 'ok    ' : 'FAIL  ') + 'the unmodified files pass');
  if (!clean) missed++;
  console.log('\n' + (missed ? missed + ' self-test case(s) failed' : 'all ' + (mutations.length + 1) + ' self-test cases passed'));
  process.exit(missed ? 1 : 0);
}

let results;
try { results = runChecks(src, app, sw); } catch (e) { console.error(e.message); process.exit(2); }
process.exit(report(results) ? 1 : 0);
