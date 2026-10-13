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
const html = fs.readFileSync(path.join(ROOT, 'src', 'planner.html'), 'utf8');

function grabFunction(name) {
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('function ' + name + ' not found in src/planner.html');
  let depth = 0;
  for (let j = html.indexOf('{', start); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}' && --depth === 0) return html.slice(start, j + 1);
  }
  throw new Error('unbalanced braces in ' + name);
}
const validateSettings = new Function(grabFunction('validateSettings') + '\nreturn validateSettings;')();

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
    ['file over 1 MB', JSON.stringify(Object.assign(ex(), {name: 'x'})) + ' '.repeat(MAX_BYTES), false, 'too-large'],
    ['unknown top-level field is only a warning', JSON.stringify(Object.assign(ex(), {extraThing: 1})), true, null]
  ];
  let failed = 0;
  cases.forEach(([label, text, wantOk, wantCode]) => {
    const res = checkText(text);
    const codeOk = wantOk ? true : res.errors.some(e => e.code === wantCode);
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
