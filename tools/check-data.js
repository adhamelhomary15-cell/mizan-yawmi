#!/usr/bin/env node
/*
 * Dev-only check for the data rules (feature 013; not shipped with the app).
 *
 *   node tools/check-data.js              run the checks against the joined app source
 *   node tools/check-data.js --self-test  break the rules on purpose and check that this script notices
 *
 * It runs the app's own code: the "data rules" block. Migrations are
 * checked against an independent oracle on generated progress data: every valid entry stays equal, every bad one
 * is set aside unchanged, and no mark is ever added or cleared. All data is generated; output is check names only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const {readSource, ruleBlock} = require('./lib/source.js');
const html = readSource();

const load = source => new Function(
  ruleBlock(source, 'data rules') +
  '\nreturn {fnv1a, STORE_FORMAT, CURRENT_VERSION, sealStore, openEnvelope, checkProgress, migrate, pickCopy, keepSnapshots};')();

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const freeze = o => { if (o && typeof o === 'object') { Object.values(o).forEach(freeze); Object.freeze(o); } return o; };
const NOW = Date.UTC(2026, 9, 17, 12);

// Generated version-1 progress, with some entries broken on purpose.
function genProgress(rnd) {
  const pick = a => a[rnd(a.length)], day = k => '2026-10-' + String(1 + (k % 28)).padStart(2, '0');
  const goodMarks = [true, 'skip', {moved: '2026-11-02'}], badMarks = [false, 'done', 1, null, {moved: 'soon'}, [], {}];
  const checks = {};
  for (let i = 0; i < rnd(8); i++) {
    const m = {};
    for (let j = 0; j < 1 + rnd(4); j++) m[pad(j) + '-study'] = rnd(5) ? pick(goodMarks) : pick(badMarks);
    checks[rnd(9) ? day(i) : 'not-a-day-' + i] = rnd(12) ? m : 'oops';
  }
  const tasks = Array.from({length: rnd(6)}, (_, i) => rnd(6) ? {id: 't' + i, text: 'task ' + i, tag: 'uni', due: '', done: !!rnd(2), created: day(i)} : pick([{text: 'no id'}, {id: 't' + i}, null, 'x']));
  const appts = Array.from({length: rnd(5)}, (_, i) => rnd(6) ? {id: 'a' + i, label: 'appt ' + i, day: rnd(2) ? rnd(7) : String(rnd(7)), time: rnd(3) ? '09:30' : ''} : pick([{id: 'a' + i, label: 'x', day: 9}, {id: 'a' + i, label: 'x', day: 1, time: '9am'}, {label: 'no id', day: 1}]));
  return {v: 1, checks, modules: {m1: true}, tasks, appts, courses: [], mainCourse: 'aa', extras: {}, phaseSeen: 'A'};
}
const pad = n => String(n).padStart(2, '0');

// The oracle: what must survive, and what must be set aside, computed separately from the app's code.
function oracle(d) {
  const okMark = v => v === true || v === 'skip' || (v && typeof v === 'object' && !Array.isArray(v) && /^\d{4}-\d{2}-\d{2}$/.test(v.moved));
  let keptMarks = 0, asideCount = 0;
  Object.entries(d.checks).forEach(([k, m]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !m || typeof m !== 'object' || Array.isArray(m)) { asideCount++; return; }
    Object.values(m).forEach(v => { if (okMark(v)) keptMarks++; else asideCount++; });
  });
  const okTask = t => t && typeof t === 'object' && typeof t.id === 'string' && typeof t.text === 'string';
  const okAppt = a => a && typeof a === 'object' && typeof a.id === 'string' && typeof a.label === 'string' && /^[0-6]$/.test(String(a.day)) && (a.time === undefined || a.time === '' || /^\d{2}:\d{2}$/.test(a.time));
  const tasks = d.tasks.filter(okTask), appts = d.appts.filter(okAppt);
  asideCount += d.tasks.length - tasks.length + d.appts.length - appts.length;
  return {keptMarks, asideCount, tasks, appts};
}
// The original value a set-aside entry came from: a whole day or one mark in checks, or a task or appointment.
function originalOf(d, x) {
  if (x.where === 'checks') { const [day, key] = x.key.split(' '); return key === undefined ? d.checks[day] : d.checks[day][key]; }
  return (d[x.where] || []).find(v => eq(v, x.value));
}
const countMarks = checks => Object.values(checks).reduce((n, m) => n + Object.keys(m).length, 0);

function runChecks(h, source) {
  const results = [];
  const check = (name, fn) => { let ok = false; try { ok = !!fn(); } catch (e) { ok = false; } results.push([name, ok]); };

  check('an envelope opens back to the same data, from text or from an object', () => {
    const data = {a: [1, 'b', {c: null}]}, e = h.sealStore('progress', 2, data, NOW);
    const t = h.openEnvelope(JSON.stringify(e), 'progress'), o = h.openEnvelope(e, 'progress');
    return t.ok && o.ok && eq(t.data, data) && eq(o.data, data) && t.version === 2 && t.savedAt === new Date(NOW).toISOString() && e.format === h.STORE_FORMAT;
  });
  check('a changed byte, a wrong store, bad JSON or a missing copy is never opened', () => {
    const text = JSON.stringify(h.sealStore('progress', 2, {n: 1}, NOW));
    return h.openEnvelope(text.replace('"n":1', '"n":2'), 'progress').code === 'damaged'
      && h.openEnvelope(text, 'workouts').code === 'wrong-store'
      && h.openEnvelope(text.slice(0, -2), 'progress').code === 'damaged'
      && h.openEnvelope(JSON.stringify({n: 1}), 'progress').code === 'damaged'
      && ['', null, undefined].every(v => h.openEnvelope(v, 'progress').code === 'missing');
  });
  check('migrating 300 generated progress files keeps every valid entry and sets every bad one aside', () => {
    let seed = 1301; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let k = 0; k < 300; k++) {
      const d = genProgress(rnd), want = oracle(d), input = freeze(JSON.parse(JSON.stringify(d)));
      const r = h.migrate('progress', 1, input);
      if (!r.ok || r.version !== h.CURRENT_VERSION.progress) return false;
      if (countMarks(r.data.checks) !== want.keptMarks || r.data.setAside.length !== want.asideCount || r.setAside !== want.asideCount) return false;
      if (!eq(r.data.tasks, want.tasks) || !eq(r.data.appts, want.appts) || !eq(r.data.modules, d.modules)) return false;
      // nothing kept changed, and every set-aside value is the original value
      for (const [day, m] of Object.entries(r.data.checks)) for (const [key, v] of Object.entries(m)) if (!eq(v, d.checks[day][key])) return false;
      if (!r.data.setAside.every(x => eq(x.value, originalOf(d, x)))) return false;
    }
    return true;
  });
  check('migration never adds or clears a mark', () => {
    const d = {checks: {'2026-10-01': {a: true, b: 'skip', c: {moved: '2026-10-02'}, d: false}}, tasks: [], appts: []};
    const r = h.migrate('progress', 1, freeze(JSON.parse(JSON.stringify(d))));
    const c = r.data.checks['2026-10-01'];
    return c.a === true && c.b === 'skip' && eq(c.c, {moved: '2026-10-02'}) && !('d' in c) && r.data.setAside.length === 1 && r.data.setAside[0].value === false;
  });
  check('a newer version is never brought down, a broken step fails, and the input is never changed', () => {
    const d = freeze({checks: {}, tasks: [], appts: []});
    return h.migrate('progress', 9, d).code === 'too-new' && h.migrate('progress', 0, d).code === 'failed'
      && h.migrate('progress', 2, d).ok && eq(h.migrate('workouts', 1, {x: 1}).data, {x: 1}) && h.migrate('nope', 1, {}).code === 'failed';
  });
  check('the newer valid copy is used and the other is repaired; a too-new copy is never written over', () => {
    const at = (v, t) => ({ok: true, version: v, savedAt: new Date(NOW + t).toISOString(), data: {t}});
    const bad = {ok: false, code: 'damaged'};
    const r1 = h.pickCopy('progress', at(2, 0), at(2, 5)), r2 = h.pickCopy('progress', at(2, 5), at(2, 0));
    const r3 = h.pickCopy('progress', bad, at(2, 0)), r4 = h.pickCopy('progress', at(2, 0), bad), r5 = h.pickCopy('progress', bad, bad);
    const r6 = h.pickCopy('progress', at(2, 9), at(3, 0)), r7 = h.pickCopy('progress', at(2, 0), at(2, 0));
    return r1.use === 'mirror' && r1.repair === 'local' && r2.use === 'local' && r2.repair === 'mirror'
      && r3.use === 'mirror' && r3.repair === 'local' && r4.use === 'local' && r4.repair === 'mirror'
      && r5.use === null && r6.use === 'mirror' && r6.tooNew && r6.repair === null && r7.repair === null;
  });
  check('only the 7 most recent snapshot days are kept, and junk keys go', () => {
    const days = Array.from({length: 10}, (_, i) => '2026-10-' + pad(10 + i));
    const del = h.keepSnapshots(days.concat(['junk']));
    return eq(del.sort(), ['2026-10-10', '2026-10-11', '2026-10-12', 'junk']) && h.keepSnapshots(days.slice(0, 7)).length === 0 && h.keepSnapshots(days, 3).length === 7;
  });
  check('the data rules block never mentions storage, the page or the network', () => {
    const b = ruleBlock(source, 'data rules').split('\n').map(l => l.replace(/\/\/[^\r\n]*/, '')).join('\n');
    return !/localStorage|indexedDB|document\.|window\.|fetch\(|XMLHttp|navigator\./.test(b);
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
  const mutations = [
    ['the checksum is not checked', s => s.replace("if (fnv1a(JSON.stringify(e.data)) !== e.sum) return {ok: false, code: 'damaged'};", '')],
    ['a set-aside entry is dropped', s => s.replace('const put = (where, key, value) => aside.push({where, key, value});', 'const put = () => {};')],
    ['the older copy is preferred', s => s.replace('Date.parse(valid[1][1].savedAt) > Date.parse(valid[0][1].savedAt)', 'Date.parse(valid[1][1].savedAt) < Date.parse(valid[0][1].savedAt)')],
    ['a too-new copy is migrated', s => s.replace("if (version > target) return {ok: false, code: 'too-new'};", '')],
    ['8 snapshots are kept', s => s.replace('function keepSnapshots(dates, keep = 7)', 'function keepSnapshots(dates, keep = 8)')],
    ['a valid mark is set aside', s => s.replace("const goodMark = v => v === true || v === 'skip' ||", "const goodMark = v => v === true ||")]
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
