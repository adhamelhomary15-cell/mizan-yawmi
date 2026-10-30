#!/usr/bin/env node
/*
 * Dev-only check for the backup rules (not shipped with the app).
 *
 *   node tools/check-backup.js              run the checks against src/planner.html
 *   node tools/check-backup.js --self-test  break the rules on purpose and check that this script notices
 *
 * It runs the app's own code: the block between "start of backup rules" and "end of backup rules", the real
 * normalizeRoot from the workout rules block, and the real validateSettings (pulled out the same way
 * tools/check-settings.js does). The progress normaliser depends on settings-derived constants, so a small
 * stand-in with the same shape is used for it. All data is generated and generic; output is check names only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const fs = require('fs');
const path = require('path');

const {readSource, grabFunction} = require('./lib/source.js');
const html = readSource();

function between(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end);
  if (a < 0 || b < a) throw new Error('block "' + start + '" not found in src/planner.html');
  return source.slice(a, b);
}
const backupBlock = source => between(source, '// start of backup rules', '// end of backup rules');
function load(source) {
  const rules = new Function(between(source, '// start of data rules', '// end of data rules') + backupBlock(source) +'\nreturn {BACKUP_FORMAT, BACKUP_VERSION, BACKUP_MAX_BYTES, fnv1a, makeBackup, readBackup};')();
  const wk = new Function(between(source, '// start of workout rules', '// end of workout rules') + '\nreturn {normalizeRoot, EMPTY_WORKOUTS};')();
  const validateSettings = new Function(grabFunction(source, 'clone') + grabFunction(source, 'dayBounds') + grabFunction(source, 'validateSettings') + '\nreturn validateSettings;')();
  return Object.assign(rules, {normalizeRoot: wk.normalizeRoot, EMPTY_WORKOUTS: wk.EMPTY_WORKOUTS, validateSettings});
}

// Stand-in for the app's progress normaliser: same shape, copies what it keeps, never invents a mark.
function normalize(d) {
  const o = d && typeof d === 'object' ? d : {};
  const obj = x => x && typeof x === 'object' && !Array.isArray(x) ? JSON.parse(JSON.stringify(x)) : {};
  const arr = x => Array.isArray(x) ? JSON.parse(JSON.stringify(x)) : [];
  return {v: 1, checks: obj(o.checks), modules: obj(o.modules), tasks: arr(o.tasks), appts: arr(o.appts), courses: arr(o.courses),
    mainCourse: typeof o.mainCourse === 'string' ? o.mainCourse : 'main', extras: obj(o.extras), phaseSeen: o.phaseSeen === 'A' || o.phaseSeen === 'B' ? o.phaseSeen : null,
    askedUpTo: typeof o.askedUpTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.askedUpTo) ? o.askedUpTo : null};
}

const exMatch = html.match(/<script type="application\/json" id="example-settings">([\s\S]*?)<\/script>/);
const EXAMPLE = exMatch ? JSON.parse(exMatch[1]) : null;
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {}) : v;
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

function sample() {
  return {
    progress: {v: 1, checks: {'2026-10-01': {'0': true, '2': true}, '2026-10-02': {'1': true}, '2026-10-05': {'0': true}},
      modules: {m1: true}, tasks: [{id: 't1', text: 'Read chapter 2', tag: 'uni', due: '2026-10-20', done: false}, {id: 't2', text: 'Draft', tag: 'work', due: '', done: true}],
      appts: [{id: 'a1', day: 2, s: '10:00', e: '11:00', title: 'Weekly meeting'}], courses: [], mainCourse: 'main', extras: {}, phaseSeen: 'A', askedUpTo: '2026-10-04'},
    workouts: {v: 1, custom: [{id: 'c1', name: 'My lift'}], routines: [{id: 'r1', name: 'Push', exIds: ['c1'], sets: [3]}],
      workouts: [{id: 'w1', startedAt: 1000, endedAt: 4000, routineName: 'Push', exercises: [{exId: 'c1', name: 'My lift', sets: [{w: 22.5, r: 8}]}]}],
      current: {id: 'o1', startedAt: 5000, rest: null, exercises: [{exId: 'c1', sets: [{w: '20', r: '', done: false}]}]}, prefs: {restSeconds: 90, sound: true}},
    settings: null
  };
}
function bigHistory() {
  const workouts = Array.from({length: 700}, (_, i) => ({id: 'w' + i, startedAt: i * 86400000, endedAt: i * 86400000 + 3600000,
    exercises: Array.from({length: 10}, (_, e) => ({exId: 'e' + e, name: 'Exercise ' + e, sets: Array.from({length: 4}, (_, s) => ({w: 20 + (i % 50) + s, r: 5 + s}))}))}));
  const checks = {};
  for (let i = 0; i < 730; i++) { const d = new Date(Date.UTC(2025, 0, 1) + i * 86400000).toISOString().slice(0, 10); checks[d] = {'0': true, '3': true, '5': true}; }
  return {progress: Object.assign(sample().progress, {checks}), workouts: {v: 1, custom: [], routines: [], workouts, current: null, prefs: {restSeconds: 90, sound: true}}, settings: null};
}

function runChecks(h, source) {
  const results = [];
  const check = (name, fn) => { let ok = false; try { ok = !!fn(); } catch (e) { ok = false; } results.push([name, ok]); };
  const deps = {normalize, normalizeRoot: h.normalizeRoot, validateSettings: h.validateSettings};
  const NOW = Date.UTC(2026, 9, 14, 9, 30);
  const made = parts => h.makeBackup(parts, NOW, '2026-10-14');
  const edit = (text, fn) => { const f = JSON.parse(text); fn(f); return JSON.stringify(f); };

  check('the constants: marker, version 1, and a 5 MB limit', () => h.BACKUP_FORMAT === 'mizan-backup' && h.BACKUP_VERSION === 1 && h.BACKUP_MAX_BYTES === 5 * 1024 * 1024);
  check('the file carries the marker, version, time, checksum and the three parts, as plain JSON', () => {
    const f = JSON.parse(made(sample()).text);
    return f.format === 'mizan-backup' && f.version === 1 && f.createdAt === new Date(NOW).toISOString() && /^[0-9a-f]{8}$/.test(f.checksum)
      && eq(Object.keys(f.data).sort(), ['progress', 'settings', 'workouts']) && f.data.settings === null;
  });
  check('the file name is the app name and the date only', () => made(sample()).name === 'mizan-backup-2026-10-14.json');
  check('a round trip gives back the same parts and the right preview counts', () => {
    const s = sample(), r = h.readBackup(made(s).text, deps);
    return r.ok && eq(r.parts.progress, normalize(s.progress)) && eq(r.parts.workouts, h.normalizeRoot(s.workouts).root) && r.parts.settings === null && r.parts.settingsValid === 'none'
      && eq(r.preview, {createdAt: new Date(NOW).toISOString(), tasks: 2, appts: 1, courses: 0, tickDays: 3, workouts: 1, openWorkout: true, settings: 'none'});
  });
  check('marks come back exactly: nothing added, nothing dropped, done flags unchanged', () => {
    const s = sample(), r = h.readBackup(made(s).text, deps);
    return eq(r.parts.progress.checks, s.progress.checks) && eq(r.parts.progress.modules, s.progress.modules) && eq(r.parts.progress.tasks.map(t => t.done), [false, true]);
  });
  check('an open workout keeps its original start time', () => h.readBackup(made(sample()).text, deps).parts.workouts.current.startedAt === 5000);
  check('valid settings are carried and marked valid', () => {
    if (!EXAMPLE || !h.validateSettings(EXAMPLE).ok) return false;
    const r = h.readBackup(made(Object.assign(sample(), {settings: EXAMPLE})).text, deps);
    return r.ok && r.parts.settingsValid === 'valid' && r.preview.settings === 'valid' && !!r.parts.settings;
  });
  check('invalid settings are reported and dropped; the rest can still be restored', () => {
    const r = h.readBackup(made(Object.assign(sample(), {settings: {format: 'mizan-settings', version: 1}})).text, deps);
    return r.ok && r.parts.settingsValid === 'invalid' && r.parts.settings === null && r.preview.settings === 'invalid' && r.preview.tasks === 2;
  });
  check('empty and blank text are refused as empty', () => ['', '   \n ', null, undefined].every(t => eq(h.readBackup(t, deps), {ok: false, code: 'empty'})));
  check('text that is not JSON is refused as not-json', () => ['garbage{', 'ÿØÿà JFIF', '{"a":'].every(t => h.readBackup(t, deps).code === 'not-json'));
  check('a settings file is recognised and pointed to the settings importer', () => h.readBackup(JSON.stringify(EXAMPLE || {format: 'mizan-settings', version: 1}), deps).code === 'settings-file');
  check('other JSON is refused as not-backup', () => ['[]', '5', '"x"', 'null', '{}', '{"format":"other"}'].every(t => { const c = h.readBackup(t, deps).code; return c === 'not-backup' || (t === 'null' && c === 'not-backup'); }));
  check('a newer file version, or a workouts part from a newer app, is refused as too-new', () => {
    const t = made(sample()).text;
    const v2 = edit(t, f => { f.version = 2; });
    const s = sample(); s.workouts.v = 2; const wk2 = made(s).text;
    return h.readBackup(v2, deps).code === 'too-new' && h.readBackup(wk2, deps).code === 'too-new';
  });
  check('a missing part, a wrong type, a bad version, a bad date or no checksum is refused as damaged', () => {
    const t = made(sample()).text;
    const cases = [f => { delete f.data.workouts; }, f => { f.data.progress = []; }, f => { f.data.settings = 'x'; }, f => { delete f.data; }, f => { f.version = 0; }, f => { f.version = 1.5; },
      f => { f.createdAt = 'yesterday'; }, f => { delete f.checksum; }, f => { f.checksum = 123; }];
    return cases.every(c => h.readBackup(edit(t, c), deps).code === 'damaged');
  });
  check('a broken part is refused even when its checksum was recomputed to match', () => {
    const t = made(sample()).text;
    const resum = fn => edit(t, f => { fn(f.data); f.checksum = h.fnv1a(JSON.stringify(f.data)); });
    const cases = [d => { delete d.workouts; }, d => { delete d.progress; }, d => { d.workouts = []; }, d => { d.progress = 'x'; }, d => { d.settings = 7; }, d => { delete d.settings; }];
    return cases.every(c => h.readBackup(resum(c), deps).code === 'damaged');
  });
  check('a cut or half-downloaded backup is refused as damaged, not as a foreign file', () => {
    const t = made(sample()).text;
    return [t.slice(0, Math.floor(t.length / 2)), t.slice(0, -1), t.slice(0, 60)].every(x => h.readBackup(x, deps).code === 'damaged');
  });
  check('one character changed inside the data is caught by the checksum', () => {
    const t = made(sample()).text, bad = t.replace('Read chapter 2', 'Read chapter 3');
    return bad !== t && h.readBackup(bad, deps).code === 'damaged';
  });
  check('the checksum is stable, 8 hex digits, and changes with the input', () => {
    const a = h.fnv1a('abc'), b = h.fnv1a('abd');
    return a === h.fnv1a('abc') && /^[0-9a-f]{8}$/.test(a) && a !== b && h.fnv1a('') === '811c9dc5' && h.fnv1a('a') === 'e40c292c';
  });
  check('reading never throws on 200 random inputs', () => {
    let seed = 99; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    const bits = ['{', '}', '"format"', ':', '"mizan-backup"', ',', '"data"', '[', ']', 'null', '1', '"version"', '"x"'];
    for (let i = 0; i < 200; i++) {
      const text = Array.from({length: 1 + rnd(20)}, () => bits[rnd(bits.length)]).join('');
      const r = h.readBackup(text, deps);
      if (!r || r.ok) return false;
    }
    const throwing = {normalize: () => { throw new Error('x'); }, normalizeRoot: h.normalizeRoot, validateSettings: h.validateSettings};
    return h.readBackup(made(sample()).text, throwing).code === 'damaged';
  });
  check('making and reading 700 workouts and two years of ticks takes under 500 ms', () => {
    const big = bigHistory(), t0 = Date.now();
    const r = h.readBackup(made(big).text, deps), dt = Date.now() - t0;
    return r.ok && r.preview.workouts === 700 && r.preview.tickDays === 730 && dt < 500;
  });
  check('the rules block uses no storage, page, or network', () => {
    const b = backupBlock(source).split('\n').map(l => l.replace(/\/\/[^\r\n]*/, '')).join('\n');
    return !/localStorage|sessionStorage|navigator\.|document\.|window\.|fetch\(|XMLHttp|sendBeacon|WebSocket/.test(b);
  });
  return results;
}

function report(results) {
  results.forEach(([n, ok]) => console.log((ok ? 'ok    ' : 'FAIL  ') + n));
  const failed = results.filter(r => !r[1]).length;
  console.log('\n' + (results.length - failed) + ' of ' + results.length + ' checks passed');
  return failed;
}

if (process.argv.includes('--self-test')) {
  // Each mutation breaks one rule in a copy of the source; the checks MUST notice.
  const mutations = [
    ['the checksum is skipped', s => s.replace("if (typeof f.checksum !== 'string' || f.checksum !== fnv1a(JSON.stringify(d))) return {ok: false, code: 'damaged'};", '')],
    ['a version 2 file is accepted', s => s.replace("if (f.version > BACKUP_VERSION) return {ok: false, code: 'too-new'};", '')],
    ['a settings file is taken for a backup', s => s.replace("if (f.format === 'mizan-settings') return {ok: false, code: 'settings-file'};", '')],
    ['invalid settings are kept', s => s.replace("else settingsValid = 'invalid';", "else { settings = d.settings; settingsValid = 'valid'; }")],
    ['days with ticks are counted from the wrong list', s => s.replace('tickDays: Object.keys(progress.checks).length', 'tickDays: Object.keys(progress.modules).length')],
    ['a mark is dropped on reading', s => s.replace('const progress = deps.normalize(d.progress);', 'const progress = deps.normalize(d.progress); { const k = Object.keys(progress.checks)[0]; if (k) delete progress.checks[k]; }')],
    ['the size limit is raised', s => s.replace('const BACKUP_MAX_BYTES = 5 * 1024 * 1024;', 'const BACKUP_MAX_BYTES = 50 * 1024 * 1024;')],
    ['a missing workouts part is accepted', s => s.replace('!isObj(d.workouts) || ', '')],
    ['a newer workouts part is accepted', s => s.replace("if (w.tooNew) return {ok: false, code: 'too-new'};", '')],
    ['a cut backup is called a foreign file', s => s.replace(`code: /"format"\\s*:\\s*"mizan-backup"/.test(text) ? 'damaged' : 'not-json'`, "code: 'not-json'")],
    ['the file name carries more than the date', s => s.replace("name: 'mizan-backup-' + dateIso + '.json'", "name: 'mizan-backup-' + dateIso + '-' + now + '.json'")]
  ];
  let missed = 0;
  mutations.forEach(([name, mutate]) => {
    const mutated = mutate(html);
    if (mutated === html) { console.log('FAIL  mutation did not apply: ' + name); missed++; return; }
    let results;
    try { results = runChecks(load(mutated), mutated); } catch (e) { results = [['load', false]]; }
    const noticed = results.some(r => !r[1]);
    console.log((noticed ? 'ok    ' : 'FAIL  ') + 'noticed: ' + name);
    if (!noticed) missed++;
  });
  const clean = runChecks(load(html), html).every(r => r[1]);
  console.log((clean ? 'ok    ' : 'FAIL  ') + 'the unmodified source passes');
  if (!clean) missed++;
  console.log('\n' + (missed ? missed + ' self-test case(s) failed' : 'all ' + (mutations.length + 1) + ' self-test cases passed'));
  process.exit(missed ? 1 : 0);
}

let results;
try { results = runChecks(load(html), html); } catch (e) { console.error(e.message); process.exit(2); }
process.exit(report(results) ? 1 : 0);
