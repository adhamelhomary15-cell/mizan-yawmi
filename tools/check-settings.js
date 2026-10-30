#!/usr/bin/env node
/*
 * Dev-only check for the settings format (not shipped with the app).
 *
 *   node tools/check-settings.js [file]            validate a settings file (default: the example embedded in the app)
 *   node tools/check-settings.js --write-example   write settings.example.json from the embedded example
 *   node tools/check-settings.js --self-test       check that bad inputs are rejected and the example is accepted
 *
 * It runs the app's own validateSettings, pulled out of src/planner.html, so the app and this tool cannot
 * disagree. Output lists paths and rule messages only; it never prints values from the file.
 *
 * Exit codes: 0 valid, 1 invalid, 2 usage or I/O error.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAX_BYTES = 1024 * 1024;
const {readSource, grabFunction} = require('./lib/source.js');
const html = readSource();

const validateSettings = new Function(grabFunction(html, 'clone') + grabFunction(html, 'dayBounds') + grabFunction(html, 'validateSettings') + '\nreturn validateSettings;')();

const exMatch = html.match(/<script type="application\/json" id="example-settings">([\s\S]*?)<\/script>/);
if (!exMatch) { console.error('embedded example not found in src/planner.html'); process.exit(2); }
const exampleText = exMatch[1].trim();

// Same order of checks as the importer: size, empty, JSON, then the format rules.
function checkText(text) {
  if (text.length > MAX_BYTES) return {ok: false, errors: [{code: 'too-large', path: 'file', detail: 'file over 1 MB'}], warnings: []};
  if (!text.trim()) return {ok: false, errors: [{code: 'not-settings', path: 'file', detail: 'the file is empty'}], warnings: []};
  let obj;
  try { obj = JSON.parse(text); } catch (e) { return {ok: false, errors: [{code: 'not-settings', path: 'file', detail: 'not valid JSON'}], warnings: []}; }
  return validateSettings(obj);
}

function report(label, res) {
  console.log(label + ': ' + (res.ok ? 'valid' : 'INVALID'));
  res.errors.slice(0, 20).forEach(e => console.log('  [' + e.code + '] ' + e.path + ': ' + e.detail));
  res.warnings.forEach(w => console.log('  (warning) ' + w.path + ': ' + w.detail));
}

function selfTest() {
  const ex = () => JSON.parse(exampleText);
  // The example with an anchor set on one block of day 0 (index -1 means the last block); empty detail and subject fill the gap.
  const withAnchor = (index, a) => JSON.stringify((() => {
    const o = ex(), blocks = o.week['0'].blocks, b = blocks[index < 0 ? blocks.length + index : index];
    while (b.length < 5) b.push('');
    b[5] = a;
    return o;
  })());
  // The example with the day-0 anchor's absorb set to a value (and optional extra anchor keys).
  const withAbsorb = (v, extra) => JSON.stringify((() => {
    const o = ex(), b = o.week['0'].blocks.find(x => x.length === 6);
    b[5] = Object.assign({}, b[5], {absorb: v}, extra || {});
    return o;
  })());
  const withHistory = history => JSON.stringify(Object.assign(ex(), {history}));
  const cases = [
    ['example is accepted', exampleText, true, null],
    ['empty file', '', false, 'not-settings'],
    ['not JSON', 'not json at all', false, 'not-settings'],
    ['wrong format', JSON.stringify(Object.assign(ex(), {format: 'something-else'})), false, 'not-settings'],
    ['newer version', JSON.stringify(Object.assign(ex(), {version: 99})), false, 'too-new'],
    ['bad time zone', JSON.stringify(Object.assign(ex(), {timezone: 'Not/AZone'})), false, 'invalid'],
    ['missing location', JSON.stringify((() => { const o = ex(); delete o.location; return o; })()), false, 'invalid'],
    ['latitude out of range', JSON.stringify(Object.assign(ex(), {location: {lat: 123, lng: 0}})), false, 'invalid'],
    ['unknown category in a block', JSON.stringify((() => { const o = ex(); o.week['0'].blocks[0][1] = 'nope'; return o; })()), false, 'unknown-id'],
    ['unknown subject in a block', JSON.stringify((() => { const o = ex(); o.week['0'].blocks[1][4] = 'ZZ'; return o; })()), false, 'unknown-id'],
    ['blocks out of order', JSON.stringify((() => { const o = ex(); o.week['0'].blocks[1][0] = '06:00'; return o; })()), false, 'invalid'],
    ['bad time text', JSON.stringify((() => { const o = ex(); o.week['0'].blocks[0][0] = '25:99'; return o; })()), false, 'invalid'],
    ['bad day key', JSON.stringify((() => { const o = ex(); o.week['9'] = o.week['0']; return o; })()), false, 'invalid'],
    ['bad prayer method', JSON.stringify(Object.assign(ex(), {prayerMethod: 'Nope'})), false, 'invalid'],
    ['course week with from after to', JSON.stringify((() => { const o = ex(); o.course.plan[0].from = '2030-01-01'; return o; })()), false, 'invalid'],
    // postpone and free flags on a kind (feature 009)
    ['postpone and free flags are accepted', JSON.stringify((() => { const o = ex(); o.categories.study.postpone = true; o.categories.personal.free = true; o.categories.work.postpone = false; return o; })()), true, null],
    ['postpone that is not a boolean', JSON.stringify((() => { const o = ex(); o.categories.study.postpone = 'yes'; return o; })()), false, 'invalid', 'postpone must be true or false'],
    ['free that is not a boolean', JSON.stringify((() => { const o = ex(); o.categories.personal.free = 1; return o; })()), false, 'invalid', 'free must be true or false'],
    ['file over 1 MB', JSON.stringify(Object.assign(ex(), {name: 'x'})) + ' '.repeat(MAX_BYTES), false, 'too-large'],
    // Blocks tied to a prayer time: a sixth element {prayer, dir, min}. Blocks at index 2 are in the middle of day 0.
    ['anchor on a middle block is accepted', withAnchor(2, {prayer: 'maghrib', dir: 'before', min: 30}), true, null],
    ['anchor with min 0 and 180 is accepted', withAnchor(2, {prayer: 'isha', dir: 'after', min: 180}), true, null],
    ['anchor with an unknown prayer', withAnchor(2, {prayer: 'sunrise', dir: 'before', min: 30}), false, 'invalid'],
    ['anchor with an unknown direction', withAnchor(2, {prayer: 'maghrib', dir: 'later', min: 30}), false, 'invalid'],
    ['anchor minutes out of range', withAnchor(2, {prayer: 'maghrib', dir: 'before', min: 200}), false, 'invalid'],
    ['anchor minutes not a whole number', withAnchor(2, {prayer: 'maghrib', dir: 'before', min: 30.5}), false, 'invalid'],
    ['anchor with an extra key', withAnchor(2, {prayer: 'maghrib', dir: 'before', min: 30, extra: 1}), false, 'invalid'],
    ['anchor that is not an object', withAnchor(2, 'maghrib'), false, 'invalid'],
    ['anchor on the first block', withAnchor(0, {prayer: 'maghrib', dir: 'before', min: 30}), false, 'invalid'],
    ['anchor on the last block', withAnchor(-1, {prayer: 'maghrib', dir: 'before', min: 30}), false, 'invalid'],
    ['a block with seven items', JSON.stringify((() => { const o = ex(); const b = o.week['0'].blocks[2]; while (b.length < 5) b.push(''); b.push({prayer: 'maghrib', dir: 'before', min: 30}, 'x'); return o; })()), false, 'invalid'],
    ['unknown top-level field is only a warning',JSON.stringify(Object.assign(ex(), {extraThing: 1})), true, null],
    // absorb (feature 008): the example's day-0 workout (block 7) names the work block at 20:15; each rule has a case
    ['absorb naming a later block is accepted', withAbsorb('20:15'), true, null],
    ['absorb naming the last block is accepted', withAbsorb('23:30'), true, null],
    ['absorb that is not HH:MM', withAbsorb('7pm'), false, 'invalid', 'absorb must be HH:MM'],
    ['absorb that is a number', withAbsorb(2015), false, 'invalid', 'absorb must be HH:MM'],
    ['absorb naming no block on the day', withAbsorb('19:31'), false, 'invalid', 'absorb must name the start of a later block on this day'],
    ['absorb naming the anchored block itself', withAbsorb('18:00'), false, 'invalid', 'absorb must name the start of a later block on this day'],
    ['absorb naming an earlier block', withAbsorb('16:00'), false, 'invalid', 'absorb must name the start of a later block on this day'],
    ['absorb naming a block after the next anchored block', JSON.stringify((() => { const o = JSON.parse(withAbsorb('20:15')), b = o.week['0'].blocks[8]; while (b.length < 5) b.push(''); b[5] = {prayer: 'isha', dir: 'after', min: 0}; return o; })()), false, 'invalid', 'absorb must name a block before the next block tied to a prayer'],
    ['anchor with an unknown key besides absorb', withAbsorb('20:15', {later: true}), false, 'invalid', 'anchor has only prayer, dir, min and absorb'],
    // kept weeks (feature 021): a bad entry is set aside with a warning, so the settings still load
    ['a kept week with a removed kind and subject is accepted', withHistory([{until: '2026-01-04', days: {'0': {blocks: [['08:00', 'k7', 'old', '', 'S9']]}, '6': null}}]), true, null],
    ['a kept week with a bad time is only a warning', withHistory([{until: '2026-01-04', days: {'0': {blocks: [['8am', 'study', 'old']]}}}]), true, null],
    ['a kept week with a kind of a bad shape is only a warning', withHistory([{until: '2026-01-04', days: {'0': {blocks: [['08:00', 'nope', 'old']]}}}]), true, null],
    ['kept weeks out of date order give a warning', withHistory([{until: '2026-02-01', days: {'0': null}}, {until: '2026-01-04', days: {'0': null}}]), true, null],
    ['history that is not a list', withHistory({until: '2026-01-04'}), false, 'invalid', 'history must be a list'],
    ['fromExample that is not true', JSON.stringify(Object.assign(ex(), {fromExample: 'yes'})), false, 'invalid', 'fromExample is true or left out']
  ];
  let failed = 0;
  cases.forEach(([label, text, wantOk, wantCode, wantDetail]) => {
    const res = checkText(text);
    const codeOk = wantOk ? true : res.errors.some(e => e.code === wantCode && (!wantDetail || e.detail === wantDetail));
    const pass = res.ok === wantOk && codeOk && (wantOk ? true : res.errors.length > 0);
    if (label.indexOf('warning') >= 0 && !res.warnings.length) { console.log('FAIL  ' + label + ' (no warning raised)'); failed++; return; }
    console.log((pass ? 'ok    ' : 'FAIL  ') + label);
    if (!pass) failed++;
  });
  console.log('\n' + (failed ? failed + ' self-test case(s) failed' : 'all ' + cases.length + ' self-test cases passed'));
  process.exit(failed ? 1 : 0);
}

const argv = process.argv.slice(2);
if (argv.includes('--self-test')) selfTest();

if (argv.includes('--write-example')) {
  const res = checkText(exampleText);
  if (!res.ok) { report('embedded example', res); process.exit(1); }
  fs.writeFileSync(path.join(ROOT, 'settings.example.json'), exampleText + '\n', 'utf8');
  console.log('wrote settings.example.json (' + exampleText.length + ' characters)');
  process.exit(0);
}

const file = argv.find(a => !a.startsWith('--'));
let text = exampleText, label = 'embedded example';
if (file) {
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { console.error('cannot read ' + file); process.exit(2); }
  label = path.basename(file);
}
const res = checkText(text);
report(label, res);
process.exit(res.ok ? 0 : 1);
