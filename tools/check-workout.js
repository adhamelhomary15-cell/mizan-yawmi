#!/usr/bin/env node
/*
 * Dev-only check for the workout log rules (not shipped with the app).
 *
 *   node tools/check-workout.js              run the checks against src/planner.html
 *   node tools/check-workout.js --self-test  break the rules on purpose and check that this script notices
 *
 * It runs the app's own code: the block between "start of workout rules" and "end of workout rules" in
 * src/planner.html, so the app and this tool cannot disagree. Records and previous sets are also computed by a
 * deliberately different, quadratic "oracle" below, and the two must agree on generated histories.
 * All samples are made up and generic. It prints check names and counts only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'planner.html'), 'utf8');
const START = '// start of workout rules', END = '// end of workout rules';

function block(source) {
  const a = source.indexOf(START), b = source.indexOf(END);
  if (a < 0 || b < a) throw new Error('workout rules block not found in src/planner.html');
  return source.slice(a, b);
}
function load(source) {
  return new Function(block(source) + '\nreturn {WORKOUTS_KEY, STARTER_EXERCISES, EMPTY_WORKOUTS, parseNumber, validateSet, normName, isNameTaken, elapsedMs, restLeft, formatClock, restLabel, previousSets, computeRecords, bestSet, volumeOf, recordCount, finishWorkout, startFromRoutine, canDeleteExercise, normalizeRoot};')();
}

const clone = x => JSON.parse(JSON.stringify(x));
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {}) : v;
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const deepFreeze = o => { Object.values(o).forEach(v => { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); };

// ---- the oracle: simple, slow, and written differently from the app ----
function oracleRecords(workouts) {
  // every set in chronological order, with its position
  const all = [];
  workouts.forEach((wo, wi) => wo.exercises.forEach((e, ei) => e.sets.forEach((s, si) => all.push({wo, wi, ei, si, exId: e.exId, w: s.w, r: s.r}))));
  all.sort((a, b) => a.wo.startedAt - b.wo.startedAt || a.wi - b.wi || a.ei - b.ei || a.si - b.si);
  const flags = {}, best = {};
  all.forEach((x, k) => {
    const earlier = all.slice(0, k).filter(y => y.exId === x.exId);
    const hasEarlierWorkout = earlier.some(y => y.wi !== x.wi);
    // an exercise's first workout is the earliest one that contains it
    const firstWi = all.filter(y => y.exId === x.exId)[0].wi;
    const inFirst = x.wi === firstWi;
    if (!inFirst && earlier.length) {
      const weight = earlier.every(y => x.w > y.w), reps = earlier.every(y => x.r > y.r);
      if (weight || reps) flags[x.wo.id + ':' + x.ei + ':' + x.si] = {weight, reps};
    }
    void hasEarlierWorkout;
  });
  const ids = [...new Set(all.map(x => x.exId))];
  ids.forEach(id => {
    const mine = all.filter(x => x.exId === id);
    const maxW = Math.max(...mine.map(x => x.w)), maxR = Math.max(...mine.map(x => x.r));
    const wHit = mine.find(x => x.w === maxW), rHit = mine.find(x => x.r === maxR);
    best[id] = {bestWeight: {value: maxW, date: wHit.wo.startedAt, workoutId: wHit.wo.id}, bestReps: {value: maxR, date: rHit.wo.startedAt, workoutId: rHit.wo.id}};
  });
  return {flags, best};
}
function oraclePrevious(workouts, exId, beforeTs) {
  const cands = workouts.filter(w => w.startedAt < beforeTs && w.exercises.some(e => e.exId === exId));
  if (!cands.length) return [];
  const top = Math.max(...cands.map(w => w.startedAt));
  const pick = cands.filter(w => w.startedAt === top).pop();
  return [].concat(...pick.exercises.filter(e => e.exId === exId).map(e => e.sets.map(s => ({w: s.w, r: s.r}))));
}

function history(rnd, n, pool, perWorkout, setsPer) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const exs = [];
    const count = 1 + rnd(perWorkout);
    for (let k = 0; k < count; k++) {
      const exId = pool[rnd(pool.length)];
      const sets = Array.from({length: 1 + rnd(setsPer)}, () => ({w: [0, 20, 20, 40, 42.5, 60, 60, 80, 100][rnd(9)], r: 1 + rnd(12)}));
      exs.push({exId, name: exId, sets});
    }
    out.push({id: 'w' + i, startedAt: 1000000 + rnd(20) * 86400000 + i, endedAt: 0, exercises: exs});
  }
  return out;
}

function runChecks(h, source) {
  const results = [];
  const check = (name, fn) => { let ok = false; try { ok = !!fn(); } catch (e) { ok = false; } results.push([name, ok]); };
  let seed = 4242; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };

  check('numbers: Latin and Arabic-Indic digits and the three decimal marks are read', () => {
    return h.parseNumber('22.5') === 22.5 && h.parseNumber('22,5') === 22.5 && h.parseNumber('٢٢٫٥') === 22.5 && h.parseNumber('١٢') === 12 && h.parseNumber('.5') === 0.5 && h.parseNumber(' 7 ') === 7
      && ['', 'abc', '1.2.3', '-5', '5 kg', '1e3', null, undefined].every(t => Number.isNaN(h.parseNumber(t)));
  });
  check('a set needs a weight and repetitions, each with its own message and field', () => {
    const a = h.validateSet({w: '', r: '5'}), b = h.validateSet({w: '50', r: ''}), c = h.validateSet({w: '  ', r: null});
    return !a.ok && a.field === 'w' && a.error === 'اكتب الوزن' && !b.ok && b.field === 'r' && b.error === 'اكتب التكرارات' && !c.ok && c.field === 'w';
  });
  check('weight is 0 to 999.9 (zero and decimals allowed); repetitions are whole numbers 1 to 999', () => {
    const w = x => h.validateSet({w: x, r: 5}), r = x => h.validateSet({w: 50, r: x});
    return w('0').ok && w('22.5').ok && w('999.9').ok && !w('1000').ok && !w('-1').ok && !w('x').ok && w('22.5').value.w === 22.5
      && r('1').ok && r('999').ok && !r('0').ok && !r('1.5').ok && !r('1000').ok && !r('x').ok && r('٨').value.r === 8
      && h.validateSet({w: '1000', r: 5}).error === 'الوزن من 0 لـ 999.9' && h.validateSet({w: 5, r: '0'}).error === 'التكرارات من 1 لـ 999';
  });
  check('names are compared ignoring case and repeated spaces', () => {
    const list = [{id: 'a', name: 'Bench Press'}];
    return h.normName('  bench   PRESS ') === 'bench press' && h.isNameTaken('bench press', list) && h.isNameTaken(' BENCH   press', list) && !h.isNameTaken('Squat', list) && !h.isNameTaken('bench press', list, 'a');
  });
  check('the starter list has about 30 unique generic exercises with fixed s- ids', () => {
    const l = h.STARTER_EXERCISES;
    return l.length >= 28 && l.length <= 32 && new Set(l.map(x => x.id)).size === l.length && new Set(l.map(x => h.normName(x.name))).size === l.length && l.every(x => x.id.indexOf('s-') === 0 && /^[A-Za-z -]+$/.test(x.name));
  });
  check('the clock: elapsed never goes below zero, rest counts down and then up, text is m:ss and h:mm:ss', () => {
    return h.elapsedMs(1000, 5000) === 4000 && h.elapsedMs(5000, 1000) === 0 && h.elapsedMs(NaN, 5) === 0
      && h.restLeft(null, 10) === null && h.restLeft({startedAt: 1000, seconds: 90}, 31000) === 60000 && h.restLeft({startedAt: 1000, seconds: 90}, 101000) === -10000
      && h.formatClock(0) === '0:00' && h.formatClock(59999) === '0:59' && h.formatClock(61000) === '1:01' && h.formatClock(3600000) === '1:00:00' && h.formatClock(3661000) === '1:01:01' && h.formatClock(-61000) === '+1:01'
      && h.restLabel(1500) === '0:02' && h.restLabel(1000) === '0:01' && h.restLabel(0) === '+0:00' && h.restLabel(-10000) === '+0:10' && h.restLabel(60000) === '1:00';
  });
  check('previous sets come from the most recent earlier workout that has the exercise, by set number', () => {
    const ws = [
      {id: 'a', startedAt: 100, endedAt: 200, exercises: [{exId: 'x', name: 'x', sets: [{w: 10, r: 5}, {w: 12, r: 4}]}]},
      {id: 'b', startedAt: 300, endedAt: 400, exercises: [{exId: 'y', name: 'y', sets: [{w: 1, r: 1}]}]},
      {id: 'c', startedAt: 500, endedAt: 600, exercises: [{exId: 'x', name: 'x', sets: [{w: 20, r: 6}]}]}
    ];
    return eq(h.previousSets(ws, 'x', 1000), [{w: 20, r: 6}]) && eq(h.previousSets(ws, 'x', 500), [{w: 10, r: 5}, {w: 12, r: 4}]) && eq(h.previousSets(ws, 'x', 100), []) && eq(h.previousSets(ws, 'z', 1000), []) && eq(h.previousSets([], 'x', 1000), []);
  });
  check('records: strictly above everything earlier, none in an exercise\'s first workout, best values with dates', () => {
    const ws = [
      {id: 'a', startedAt: 100, endedAt: 1, exercises: [{exId: 'x', name: 'x', sets: [{w: 50, r: 10}, {w: 60, r: 5}]}]},
      {id: 'b', startedAt: 200, endedAt: 1, exercises: [{exId: 'x', name: 'x', sets: [{w: 60, r: 5}, {w: 62.5, r: 5}, {w: 55, r: 12}]}]},
      {id: 'c', startedAt: 300, endedAt: 1, exercises: [{exId: 'x', name: 'x', sets: [{w: 62.5, r: 12}]}]}
    ];
    const r = h.computeRecords(ws);
    return eq(r.flags, {'b:0:1': {weight: true, reps: false}, 'b:0:2': {weight: false, reps: true}}) && eq(r.perExercise.x.bestWeight, {value: 62.5, date: 200, workoutId: 'b'}) && eq(r.perExercise.x.bestReps, {value: 12, date: 200, workoutId: 'b'});
  });
  check('records do not depend on the order the workouts are stored in', () => {
    const ws = history(rnd, 12, ['x', 'y', 'z'], 3, 4), shuffled = ws.slice().reverse();
    return eq(h.computeRecords(ws), h.computeRecords(shuffled));
  });
  check('records and previous sets equal an independent oracle on 300 generated histories', () => {
    for (let k = 0; k < 300; k++) {
      const ws = history(rnd, rnd(30), ['a', 'b', 'c', 'd', 'e', 'f'], 4, 5);
      const mine = h.computeRecords(ws), oracle = oracleRecords(ws);
      if (!eq(mine.flags, oracle.flags)) return false;
      if (!eq(mine.perExercise, oracle.best)) return false;
      for (let q = 0; q < 8; q++) {
        const exId = ['a', 'b', 'c', 'd', 'e', 'f', 'none'][rnd(7)], ts = 1000000 + rnd(22) * 86400000;
        if (!eq(h.previousSets(ws, exId, ts), oraclePrevious(ws, exId, ts))) return false;
      }
    }
    return true;
  });
  check('records over 700 workouts of 10 exercises and 4 sets take under 200 ms', () => {
    const ws = Array.from({length: 700}, (_, i) => ({id: 'w' + i, startedAt: i * 86400000, endedAt: i * 86400000 + 3600000, exercises: Array.from({length: 10}, (_, e) => ({exId: 'e' + e, name: 'e' + e, sets: Array.from({length: 4}, (_, s) => ({w: 20 + (i % 50) + s, r: 5 + (s % 6)}))}))}));
    const t0 = Date.now(); const r = h.computeRecords(ws); const dt = Date.now() - t0;
    return dt < 200 && Object.keys(r.perExercise).length === 10;
  });
  const open = () => ({id: 'o1', startedAt: 1000, rest: null, exercises: [
    {exId: 'x', sets: [{w: '50', r: '8', done: true}, {w: '', r: '', done: false}, {w: '55', r: '6', done: true}]},
    {exId: 'y', sets: [{w: '10', r: '10', done: false}]},
    {exId: 'z', sets: [{w: 0, r: 12, done: true}]}]});
  check('finishing keeps only done valid sets, drops empty exercises, counts what it dropped, saves names', () => {
    const r = h.finishWorkout(open(), 9000, {x: 'Bench Press', z: 'Plank'});
    return r.ok && r.dropped === 2 && eq(r.workout.exercises, [{exId: 'x', name: 'Bench Press', sets: [{w: 50, r: 8}, {w: 55, r: 6}]}, {exId: 'z', name: 'Plank', sets: [{w: 0, r: 12}]}]) && r.workout.startedAt === 1000 && r.workout.endedAt === 9000 && r.workout.id === 'o1';
  });
  check('finishing needs a done set, never ends before it started, and keeps the routine name', () => {
    const none = {id: 'o', startedAt: 5, exercises: [{exId: 'x', sets: [{w: '1', r: '1', done: false}]}]};
    const a = h.finishWorkout(none, 10, {}), b = h.finishWorkout(open(), 10, {}), c = h.finishWorkout(Object.assign(open(), {routineName: 'Push'}), 9000, {});
    const bad = h.finishWorkout({id: 'o', startedAt: 5, exercises: [{exId: 'x', sets: [{w: '1000', r: '5', done: true}]}]}, 10, {});
    return !a.ok && a.error === 'سجّل مجموعة واحدة على الأقل' && b.ok && b.workout.endedAt === 1000 && c.workout.routineName === 'Push' && !bad.ok && bad.dropped === 1;
  });
  check('finishing does not change the open workout it reads', () => {
    const o = deepFreeze(open());
    return h.finishWorkout(o, 9000, {}).ok === true;
  });
  check('starting from a routine adds its exercises in order with one empty set and leaves the routine alone', () => {
    const routine = deepFreeze({id: 'r1', name: 'Push', exIds: ['x', 'gone', 'y']});
    let n = 0; const w = h.startFromRoutine(routine, {x: {id: 'x'}, y: {id: 'y'}}, 777, () => 'new' + (++n));
    return w.id === 'new1' && w.startedAt === 777 && w.routineId === 'r1' && w.routineName === 'Push' && w.rest === null && eq(w.exercises, [{exId: 'x', sets: [{w: '', r: '', done: false}]}, {exId: 'y', sets: [{w: '', r: '', done: false}]}]);
  });
  check('delete rules: starter never, history blocks, a routine blocks and names it, otherwise allowed', () => {
    const ws = [{id: 'a', startedAt: 1, endedAt: 2, exercises: [{exId: 'c1', name: 'c1', sets: [{w: 1, r: 1}]}]}];
    const rs = [{id: 'r', name: 'Legs', exIds: ['c2']}];
    return eq(h.canDeleteExercise('s-squat', [], []), {ok: false, reason: 'starter'}) && eq(h.canDeleteExercise('c1', ws, rs), {ok: false, reason: 'history'})
      && eq(h.canDeleteExercise('c2', ws, rs), {ok: false, reason: 'routine', routineName: 'Legs'}) && eq(h.canDeleteExercise('c3', ws, rs), {ok: true});
  });
  check('loading never throws: bad text, nothing, the wrong type and damaged parts give a valid root', () => {
    const empty = h.EMPTY_WORKOUTS();
    const cases = [null, undefined, '', 'garbage{', '[]', 5, [], {}, {v: 1}, {v: 1, custom: 'x', routines: 3, workouts: {}, current: 'x', prefs: 9}];
    return cases.every(c => { const r = h.normalizeRoot(c); return !r.tooNew && eq(r.root, empty); });
  });
  check('a newer data version is reported and not read; the stored text round-trips unchanged', () => {
    const newer = h.normalizeRoot({v: 2, workouts: [{id: 'a'}]}), text = JSON.stringify({v: 1, custom: [{id: 'c', name: 'My lift'}], routines: [{id: 'r', name: 'Legs', exIds: ['c']}], workouts: [{id: 'w', startedAt: 1, endedAt: 2, exercises: [{exId: 'c', name: 'My lift', sets: [{w: 20, r: 5}]}]}], current: null, prefs: {restSeconds: 120, sound: false}});
    const round = h.normalizeRoot(text);
    return newer.tooNew === true && eq(newer.root, h.EMPTY_WORKOUTS()) && !round.tooNew && eq(round.root, JSON.parse(text));
  });
  check('an open workout and its running rest survive loading exactly', () => {
    const cur = {id: 'o', startedAt: 123, routineId: 'r', routineName: 'Push', rest: {startedAt: 200, seconds: 90, alerted: true, ei: 0, si: 1}, exercises: [{exId: 'x', sets: [{w: '50', r: '', done: false}, {w: 60, r: 5, done: true}]}]};
    const r = h.normalizeRoot({v: 1, current: cur});
    return eq(r.root.current, cur);
  });
  check('the default rest is clamped to whole seconds from 10 to 600 and the sound flag is kept', () => {
    const f = p => h.normalizeRoot({v: 1, prefs: p}).root.prefs;
    return f({restSeconds: 5}).restSeconds === 10 && f({restSeconds: 9999}).restSeconds === 600 && f({restSeconds: 45.4}).restSeconds === 45 && f({restSeconds: 'x'}).restSeconds === 90 && f({sound: false}).sound === false && f({sound: 'no'}).sound === true;
  });
  check('damaged records inside valid data are dropped, valid ones kept', () => {
    const r = h.normalizeRoot({v: 1, custom: [{id: 'a', name: ' Ok '}, {id: 'b', name: ''}, null, {name: 'x'}], routines: [{id: 'r', name: 'R', exIds: ['a', 5]}, {id: 'q', name: ''}],
      workouts: [{id: 'w', startedAt: 1, endedAt: 0, exercises: [{exId: 'a', sets: [{w: 1, r: 1}, {w: 'x', r: 1}]}, {exId: 'b', sets: []}]}, {id: 'v'}]});
    return eq(r.root.custom, [{id: 'a', name: 'Ok'}]) && eq(r.root.routines, [{id: 'r', name: 'R', exIds: ['a']}]) && r.root.workouts.length === 1 && r.root.workouts[0].endedAt === 1 && eq(r.root.workouts[0].exercises, [{exId: 'a', name: 'a', sets: [{w: 1, r: 1}]}]);
  });
  check('the best set is the heaviest, a tie goes to more repetitions, and no sets gives none', () => {
    return eq(h.bestSet([{w: 20, r: 15}, {w: 20, r: 12}, {w: 15, r: 20}]), {w: 20, r: 15}) && eq(h.bestSet([{w: 20, r: 8}, {w: 20, r: 12}]), {w: 20, r: 12})
      && eq(h.bestSet([{w: 0, r: 9}, {w: 0, r: 3}]), {w: 0, r: 9}) && h.bestSet([]) === null;
  });
  check('volume is the sum of weight times repetitions, exact for decimals, zero for nothing', () => {
    return h.volumeOf([{w: 20, r: 15}, {w: 20, r: 15}, {w: 10, r: 8}]) === 680 && h.volumeOf([{w: 62.5, r: 8}]) === 500 && h.volumeOf([{w: 7.7, r: 3}]) === 23.1 && h.volumeOf([]) === 0;
  });
  check('the record count of a workout counts each flagged set once and agrees with the flags', () => {
    const ws = [{id: 'a', startedAt: 1, endedAt: 2, exercises: [{exId: 'x', name: 'x', sets: [{w: 50, r: 5}, {w: 55, r: 5}]}]},
      {id: 'b', startedAt: 3, endedAt: 4, exercises: [{exId: 'x', name: 'x', sets: [{w: 60, r: 6}, {w: 50, r: 5}, {w: 60, r: 6}]}, {exId: 'y', name: 'y', sets: [{w: 10, r: 10}]}]}];
    const rec = h.computeRecords(ws);
    return h.recordCount(ws[0], rec.flags) === 0 && h.recordCount(ws[1], rec.flags) === 1 && Object.keys(rec.flags).filter(k => k.indexOf('b:') === 0).length === 1;
  });
  check('the rules block knows nothing about the progress store, the schedule, tasks, settings or the network', () => {
    const b = block(source).split('\n').map(l => l.replace(/\/\/[^\r\n]*/, '')).join('\n');   // comments may name what the code must not touch
    return !/\bchecks\b|\bmodules\b|fall26-planner-v1|useStore|loadLocal|saveLocal|\bappts\b|\btasks\b|fetch\(|XMLHttp|sendBeacon|WebSocket|navigator\.|Notification/.test(b);
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
    ['a tie counts as a record', s => s.replace('const weight = s.w > st.maxW, reps = s.r > st.maxR;', 'const weight = s.w >= st.maxW, reps = s.r >= st.maxR;')],
    ['the first workout of an exercise is flagged', s => s.replace('const first = !st.seen,', 'const first = false,')],
    ['previous sets come back in the wrong order', s => s.replace('return sets.map(s => ({w: s.w, r: s.r}));', 'return sets.reverse().map(s => ({w: s.w, r: s.r}));')],
    ['finishing keeps sets that are not done', s => s.replace('const v = s.done ? validateSet(s) : {ok: false};', 'const v = validateSet(s);')],
    ['a duplicate name is allowed', s => s.replace('const isNameTaken = (name, list, exceptId) => list.some(', 'const isNameTaken = (name, list, exceptId) => false && list.some(')],
    ['elapsed time can go negative', s => s.replace('Math.max(0, now - startedAt) || 0', '(now - startedAt)')],
    ['an exercise with history can be deleted', s => s.replace("if (workouts.some(w => w.exercises.some(e => e.exId === exId))) return {ok: false, reason: 'history'};", '')],
    ['the rest length is not clamped', s => s.replace('Math.min(600, Math.max(10, Math.round(p.restSeconds)))', 'Math.round(p.restSeconds)')],
    ['weight 1000 is accepted', s => s.replace('if (!(w >= 0 && w <= 999.9))', 'if (!(w >= 0))')],
    ['the rest row loses the set it sits under', s => s.replace('root.current.rest.ei = r.ei; root.current.rest.si = r.si;', '')],
    ['a tie for best set goes to fewer repetitions', s => s.replace('(s.w === b.w && s.r > b.r)', '(s.w === b.w && s.r < b.r)')],
    ['volume adds weight and repetitions instead of multiplying', s => s.replace('n + s.w * s.r', 'n + s.w + s.r')],
    ['a record set that is both weight and reps is counted twice', s => s.replace('if (f && (f.weight || f.reps)) n++;', 'if (f) { if (f.weight) n++; if (f.reps) n++; }')],
    ['a newer data version is read', s => s.replace('if (typeof v.v === \'number\' && v.v > 1) return {root, tooNew: true};', '')]
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
