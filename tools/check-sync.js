#!/usr/bin/env node
/*
 * Dev-only check for the sync rules (feature 025; not shipped with the app).
 *
 *   node tools/check-sync.js              run the checks against the joined app source
 *   node tools/check-sync.js --self-test  break the rules on purpose and check that this script notices
 *
 * It runs the app's own code: the block between "start of sync rules" and "end of sync rules". The main check is an
 * oracle: 2 to 4 devices make random edits, often offline, and sync in random orders through one server copy; at the
 * end every device must hold, for every item, the value of the edit with the highest stamp, and nothing else.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const html = require('./lib/source.js').readSource();

function block(source) {
  const a = source.indexOf('// start of sync rules'), b = source.indexOf('// end of sync rules');
  if (a < 0 || b < a) throw new Error('sync rules block not found');
  return source.slice(a, b);
}
const load = source => new Function(block(source) + '\nreturn {itemsOf, fromItems, stampChanges, mergeStore, dropOldTombstones, pathOf};')();

// Same content whatever the key order.
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {}) : v;
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const clone = v => JSON.parse(JSON.stringify(v));
const progress = () => ({v: 1, checks: {}, modules: {}, tasks: [], appts: [], courses: [{id: 'c1', name: 'Course', from: '2026-10-01', to: '2026-12-01', modules: [{id: 'm1', title: 'One'}, {id: 'm2', title: 'Two'}], done: {}}],
  mainCourse: 'c1', extras: {}, phaseSeen: null, askedUpTo: null, setAside: []});
const workouts = () => ({v: 1, custom: [], routines: [], workouts: [], current: null, prefs: {restSeconds: 90, sound: true}});

// One random edit on a device's progress, as the app would make it.
function edit(d, rnd, n){
  const day = '2026-10-' + (10 + rnd(4)), key = ['08:30-study', '10:45-work', '14:30-study'][rnd(3)];
  const op = rnd(9), task = d.tasks[rnd(Math.max(1, d.tasks.length))];
  if (op === 0) (d.checks[day] = d.checks[day] || {})[key] = [true, 'skip', {moved: '2026-10-20'}][rnd(3)];
  else if (op === 1 && d.checks[day]) { delete d.checks[day][key]; if (!Object.keys(d.checks[day]).length) delete d.checks[day]; }
  else if (op === 2) d.tasks.push({id: 't' + n, text: 'task ' + n, done: false});
  else if (op === 3 && task) task.done = !task.done;
  else if (op === 4 && task) d.tasks = d.tasks.filter(t => t !== task);
  else if (op === 5) (d.extras[day] = d.extras[day] || []).push({id: 'x' + n, s: '20:00', e: '21:00', cat: 'study', title: 'extra ' + n});
  else if (op === 6) { const c = d.courses[0], m = ['m1', 'm2'][rnd(2)]; if (c.done[m]) delete c.done[m]; else c.done[m] = true; }
  else if (op === 7) d.askedUpTo = day;
  else (d.checks[day] = d.checks[day] || {})[key] = true;
}

function runChecks(h){
  const results = [];
  const check = (name, fn) => { let ok = false; try { ok = !!fn(); } catch (e) { ok = false; } results.push([name, ok]); };

  check('items and back give the same store, for progress, workouts and settings', () => {
    const p = progress(); p.checks['2026-10-12'] = {'08:30-study': true, '10:45-work': 'skip'}; p.tasks.push({id: 't1', text: 'x'}); p.courses[0].done = {m1: true};
    p.extras['2026-10-13'] = [{id: 'x1', s: '20:00', e: '21:00', cat: 'study', title: 'e'}]; p.modules = {'aa:01': true};
    const w = workouts(); w.workouts.push({id: 'w1', startedAt: 1, endedAt: 2, exercises: []}); w.custom.push({id: 'u1', name: 'Row'});
    const s = {format: 'mizan-settings', version: 1, week: {0: {blocks: [['08:00', 'rest', 'x']]}}};
    return eq(h.fromItems('progress', h.itemsOf('progress', p)), p) && eq(h.fromItems('workouts', h.itemsOf('workouts', w)), w) && eq(h.fromItems('settings', h.itemsOf('settings', s)), s);
  });

  check('500 runs of 2 to 4 devices, offline edits and random sync orders: every item ends at its latest edit, on every device', () => {
    let seed = 2025; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let run = 0; run < 500; run++) {
      const n = 2 + rnd(3), start = progress();
      const devices = Array.from({length: n}, (_, i) => ({id: 'd' + i, data: clone(start), stamps: {}, clock: 1000 + rnd(50)}));
      let server = {data: clone(start), stamps: {}}, count = 0;
      const latest = new Map();    // path -> [stamp, value or undefined]
      const sync = dv => { const m = h.mergeStore('progress', dv, server); server = {data: m.data, stamps: m.stamps}; dv.data = clone(m.data); dv.stamps = clone(m.stamps); };
      for (let step = 0; step < 30; step++) {
        const dv = devices[rnd(n)];
        if (rnd(3) === 0) { sync(dv); continue; }
        const before = clone(dv.data);
        edit(dv.data, rnd, count++);
        dv.clock += 1 + rnd(5);
        dv.stamps = h.stampChanges('progress', before, dv.data, dv.stamps, dv.clock, dv.id);
        const after = h.itemsOf('progress', dv.data);
        Object.entries(dv.stamps).forEach(([p, s]) => {
          const cur = latest.get(p);
          if (!cur || s[0] > cur[0][0] || (s[0] === cur[0][0] && s[1] > cur[0][1])) latest.set(p, [s, s[2] ? undefined : after.get(p)]);
        });
      }
      for (let round = 0; round < 2; round++) devices.forEach(sync);
      const want = new Map([...latest].filter(([, [, v]]) => v !== undefined).map(([p, [, v]]) => [p, v]));
      h.itemsOf('progress', start).forEach((v, p) => { if (!latest.has(p)) want.set(p, v); });
      for (const dv of devices) {
        const got = h.itemsOf('progress', dv.data);
        if (got.size !== want.size || [...want].some(([p, v]) => !eq(got.get(p), v))) return false;
      }
    }
    return true;
  });

  check('two devices ticking two modules of one course both keep their tick', () => {
    const a = {data: progress(), stamps: {}}, b = {data: progress(), stamps: {}}, before = progress();
    a.data.courses[0].done.m1 = true; a.stamps = h.stampChanges('progress', before, a.data, {}, 100, 'a');
    b.data.courses[0].done.m2 = true; b.stamps = h.stampChanges('progress', before, b.data, {}, 101, 'b');
    const m = h.mergeStore('progress', a, b);
    return eq(m.data.courses[0].done, {m1: true, m2: true}) && m.lost.length === 0;
  });

  check('the same block ticked on one device and cancelled on the other: the later wins, and the loser is reported', () => {
    const day = '2026-10-12', before = progress(), a = {data: progress(), stamps: {}}, b = {data: progress(), stamps: {}};
    a.data.checks[day] = {'08:30-study': true}; a.stamps = h.stampChanges('progress', before, a.data, {}, 100, 'a');
    b.data.checks[day] = {'08:30-study': 'skip'}; b.stamps = h.stampChanges('progress', before, b.data, {}, 200, 'b');
    const m = h.mergeStore('progress', a, b), back = h.mergeStore('progress', b, a);
    return m.data.checks[day]['08:30-study'] === 'skip' && m.lost.length === 1 && back.data.checks[day]['08:30-study'] === 'skip' && back.lost.length === 0;
  });

  check('a device with its clock behind still writes after what it has read', () => {
    const before = progress(), a = {data: progress(), stamps: {}};
    a.data.tasks.push({id: 't1', text: 'from a', done: false}); a.stamps = h.stampChanges('progress', before, a.data, {}, 5000, 'a');
    const b = {data: clone(a.data), stamps: clone(a.stamps)}, next = clone(b.data);
    next.tasks[0].done = true;
    b.stamps = h.stampChanges('progress', b.data, next, b.stamps, 10, 'b'); b.data = next;    // b's clock reads 10
    return h.mergeStore('progress', a, b).data.tasks[0].done === true;
  });

  check('a removed task stays removed, and tombstones go after 60 days but live stamps stay', () => {
    const before = progress(); before.tasks.push({id: 't1', text: 'x', done: false});
    const a = {data: clone(before), stamps: h.stampChanges('progress', progress(), before, {}, 100, 'a')}, b = {data: clone(before), stamps: clone(a.stamps)};
    const gone = clone(before); gone.tasks = []; b.stamps = h.stampChanges('progress', b.data, gone, b.stamps, 200, 'b'); b.data = gone;
    const m = h.mergeStore('progress', a, b), p = h.pathOf('t', 't1');
    const kept = h.dropOldTombstones(m.stamps, 200 + 59 * 864e5), dropped = h.dropOldTombstones(m.stamps, 200 + 61 * 864e5);
    return m.data.tasks.length === 0 && kept[p] && !dropped[p] && dropped[h.pathOf('s', 'v')];
  });

  check('settings merge as one item: the later save wins whole', () => {
    const s1 = {format: 'mizan-settings', version: 1, name: 'one', week: {0: {blocks: [['08:00', 'rest', 'a']]}}};
    const s2 = {format: 'mizan-settings', version: 1, name: 'two', week: {1: {blocks: [['09:00', 'rest', 'b']]}}};
    const a = {data: s1, stamps: h.stampChanges('settings', {}, s1, {}, 100, 'a')}, b = {data: s2, stamps: h.stampChanges('settings', {}, s2, {}, 200, 'b')};
    return eq(h.mergeStore('settings', a, b).data, s2) && eq(h.mergeStore('settings', b, a).data, s2);
  });

  check('a merge never makes a value that no device had', () => {
    const a = {data: progress(), stamps: {}}, b = {data: progress(), stamps: {}};
    const m = h.mergeStore('progress', a, b);
    return eq(m.data, progress()) && m.lost.length === 0;
  });

  check('the sync rules block never mentions storage, the page or the network', () => {
    const b = block(html).split('\n').map(l => l.replace(/\/\/[^\r\n]*/, '')).join('\n');
    return !/localStorage|indexedDB|document\.|window\.|fetch\(|navigator\.|Date\.now/.test(b);
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
    ['the whole store goes to the later device', s => s.replace('useRemote = beats(rs, ls) && !sameValue(rs, ls)', 'useRemote = latestTime(remote.stamps) > latestTime(local.stamps)')],
    ['a removal leaves no tombstone', s => s.replace('if (!sameValue(was.get(p), is.get(p))) out[p]', 'if (is.has(p) && !sameValue(was.get(p), is.get(p))) out[p]')],
    ['a clock behind writes before what it has read', s => s.replace('const stampTime = (stamps, now) => Math.max(now, latestTime(stamps) + 1);', 'const stampTime = (stamps, now) => now;')],
    ['module marks travel inside their course', s => s.replace("if (kind !== 'k') { items.set(pathOf(kind, x.id), x); return; }", 'items.set(pathOf(kind, x.id), x); return;')],
    ['remote-only items are dropped', s => s.replace(', ...ri.keys(), ...Object.keys(remote.stamps)])]', '])]')],
    ['a tombstone is kept for ever', s => s.replace('if (!s[2] || s[0] >= limit) out[p] = s;', 'out[p] = s;')],
    ['losses are not reported', s => s.replace('if (useRemote && li.has(p) && !sameValue(li.get(p), merged.get(p))) lost.push(p);', '')]
  ];
  let missed = 0;
  mutations.forEach(([name, mutate]) => {
    const mutated = mutate(html);
    if (mutated === html) { console.log('FAIL  mutation did not apply: ' + name); missed++; return; }
    let results;
    try { results = runChecks(load(mutated)); } catch (e) { results = [['load', false]]; }
    const noticed = results.some(r => !r[1]);
    console.log((noticed ? 'ok    ' : 'FAIL  ') + 'noticed: ' + name);
    if (!noticed) missed++;
  });
  const clean = runChecks(load(html)).every(r => r[1]);
  console.log((clean ? 'ok    ' : 'FAIL  ') + 'the unmodified source passes');
  if (!clean) missed++;
  console.log('\n' + (missed ? missed + ' self-test case(s) failed' : 'all ' + (mutations.length + 1) + ' self-test cases passed'));
  process.exit(missed ? 1 : 0);
}

let results;
try { results = runChecks(load(html)); } catch (e) { console.error(e.message); process.exit(2); }
process.exit(report(results) ? 1 : 0);
