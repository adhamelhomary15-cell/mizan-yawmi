#!/usr/bin/env node
/*
 * Dev-only check for the postpone rules (not shipped with the app).
 *
 *   node tools/check-postpone.js              run the checks against src/planner.html
 *   node tools/check-postpone.js --self-test  break the rules on purpose and check that this script notices
 *
 * It runs the app's own code: the block between "start of postpone rules" and "end of postpone rules". Placements
 * are also computed by an independent minute-grid oracle, and the two must agree on generated weeks. All data is
 * generated and generic; output is check names only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const fs = require('fs');
const path = require('path');

const html = require('./lib/source.js').readSource();
const START_MARK = '// start of postpone rules', END_MARK = '// end of postpone rules';
function block(source) {
  const a = source.indexOf(START_MARK), b = source.indexOf(END_MARK);
  if (a < 0 || b < a) throw new Error('postpone rules block not found in src/planner.html');
  return source.slice(a, b);
}
const load = source => new Function(block(source) + '\nreturn {freeStretches, proposePlaces, checkManualPlace, daysToAsk};')();

const START = 420, END = 1500;
const isFree = c => c === 'personal';
const isTracked = c => ['study', 'course', 'quran', 'work', 'uni', 'gym'].includes(c);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const B = (s, e, cat, title) => ({s, e, cat, title: title || cat});
const X = (s, e, title) => ({s, e, cat: 'study', title: title || 'extra', extra: 'x'});
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const dayNo = iso => Date.parse(iso + 'T00:00:00Z') / 86400000;

// The oracle for daysToAsk: every day from 7 back to yesterday, kept when it is after the one answered.
function oracleDays(today, askedUpTo) {
  if (askedUpTo === null) return [addDays(today, -1)];
  return [7, 6, 5, 4, 3, 2, 1].map(k => addDays(today, -k)).filter(d => dayNo(d) > dayNo(askedUpTo));
}

// The oracle: a minute grid per day, marked free by free blocks and taken by extras and earlier placements.
function oraclePlaces(items, days) {
  const grids = {};
  const grid = d => {
    if (grids[d.iso]) return grids[d.iso];
    const g = new Array(1500).fill(false);
    d.blocks.forEach(b => { if (!b.extra && isFree(b.cat)) for (let m = b.s; m < b.e; m++) if (m >= (d.from || 0)) g[m] = true; });
    d.extras.forEach(x => { for (let m = x.s; m < x.e; m++) g[m] = false; });
    return (grids[d.iso] = g);
  };
  return items.map(it => {
    for (const d of days) {
      const g = grid(d);
      let run = 0;
      for (let m = 0; m < 1500; m++) {
        run = g[m] ? run + 1 : 0;
        // the earliest place is the first run of free minutes that reaches the length, started at its own beginning
        if (run === it.len) {
          // place at the beginning of this free run
          let s = m - it.len + 1; while (s > 0 && g[s - 1]) s--;
          for (let q = s; q < s + it.len; q++) g[q] = false;
          return {iso: d.iso, s, e: s + it.len};
        }
      }
    }
    return null;
  });
}

function genWeek(rnd) {
  const days = [];
  for (let k = 0; k < 7; k++) {
    const blocks = []; let t = START;
    while (t < END) {
      const len = Math.min(END - t, 15 * (1 + rnd(10)));
      blocks.push(B(t, t + len, ['study', 'work', 'rest', 'personal', 'personal', 'course'][rnd(6)]));
      t += len;
    }
    const extras = [];
    for (let n = rnd(3); n > 0; n--) { const s = START + 15 * rnd(70); extras.push(X(s, Math.min(END, s + 15 * (1 + rnd(6))))); }
    days.push({iso: '2027-01-0' + (k + 1), blocks, extras, from: k === 0 ? START + 15 * rnd(40) : 0});
  }
  return days;
}

function runChecks(h, source) {
  const results = [];
  const check = (name, fn) => { let ok = false; try { ok = !!fn(); } catch (e) { ok = false; } results.push([name, ok]); };

  check('free stretches: free blocks merge, extras are cut out, and the start is clipped', () => {
    const blocks = [B(420, 600, 'study'), B(600, 660, 'personal'), B(660, 720, 'personal'), B(720, 800, 'work'), B(800, 1500, 'personal')];
    return eq(h.freeStretches(blocks, [], isFree, 0), [[600, 720], [800, 1500]])
      && eq(h.freeStretches(blocks, [X(630, 650), X(1400, 1500)], isFree, 0), [[600, 630], [650, 720], [800, 1400]])
      && eq(h.freeStretches(blocks, [], isFree, 700), [[700, 720], [800, 1500]])
      && eq(h.freeStretches(blocks.concat([X(600, 1500)]), [], isFree, 0), [[600, 720], [800, 1500]]);
  });
  check('a single item goes to the start of the earliest stretch that holds it, on the first day that has one', () => {
    const d1 = {iso: 'a', blocks: [B(420, 1440, 'study'), B(1440, 1500, 'personal')], extras: [], from: 0};
    const d2 = {iso: 'b', blocks: [B(420, 900, 'study'), B(900, 960, 'personal'), B(960, 1300, 'work'), B(1300, 1500, 'personal')], extras: [], from: 0};
    return eq(h.proposePlaces([{len: 60}], [d1, d2], isFree), [{iso: 'a', s: 1440, e: 1500}])
      && eq(h.proposePlaces([{len: 90}], [d1, d2], isFree), [{iso: 'b', s: 1300, e: 1390}]);
  });
  check('several items never overlap each other and fill in order', () => {
    const d = {iso: 'a', blocks: [B(420, 1200, 'study'), B(1200, 1500, 'personal')], extras: [], from: 0};
    const r = h.proposePlaces([{len: 60}, {len: 120}, {len: 60}, {len: 120}], [d], isFree);
    return eq(r, [{iso: 'a', s: 1200, e: 1260}, {iso: 'a', s: 1260, e: 1380}, {iso: 'a', s: 1380, e: 1440}, null]);
  });
  check('nothing fits: null, and existing extras are never overlapped', () => {
    const d = {iso: 'a', blocks: [B(420, 1400, 'study'), B(1400, 1500, 'personal')], extras: [X(1420, 1440)], from: 0};
    const r = h.proposePlaces([{len: 30}, {len: 61}], [d], isFree);
    return eq(r, [{iso: 'a', s: 1440, e: 1470}, null]);
  });
  check('a manual place: refused when it clashes, runs late or is before the day; accepted otherwise', () => {
    const blocks = [B(420, 600, 'study', 'Study A'), B(600, 1500, 'personal')], extras = [X(900, 960, 'Extra B')];
    const clash = h.checkManualPlace(blocks, extras, 570, 60, START, END, isTracked), clashX = h.checkManualPlace(blocks, extras, 930, 60, START, END, isTracked);
    return clash.code === 'clash' && clash.title === 'Study A' && clashX.code === 'clash' && clashX.title === 'Extra B'
      && h.checkManualPlace(blocks, extras, 1450, 60, START, END, isTracked).code === 'late'
      && h.checkManualPlace(blocks, extras, 300, 60, START, END, isTracked).code === 'none'
      && h.checkManualPlace(blocks, extras, NaN, 60, START, END, isTracked).code === 'none'
      && eq(h.checkManualPlace(blocks, extras, 600, 60, START, END, isTracked), {ok: true, e: 660});
  });
  check('placements equal an independent minute-grid oracle on 300 generated weeks', () => {
    let seed = 909; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let k = 0; k < 300; k++) {
      const days = genWeek(rnd), items = Array.from({length: 1 + rnd(5)}, () => ({len: 15 * (1 + rnd(12))}));
      const mine = h.proposePlaces(items, days, isFree), want = oraclePlaces(items, days);
      if (!eq(mine, want)) return false;
      // every placement lies in free time, overlaps no extra and no other placement
      for (let i = 0; i < mine.length; i++) {
        const p = mine[i]; if (!p) continue;
        const d = days.find(x => x.iso === p.iso);
        if (p.e - p.s !== items[i].len) return false;
        if (d.extras.some(x => p.s < x.e && p.e > x.s)) return false;
        if (mine.some((q, j) => q && j !== i && q.iso === p.iso && p.s < q.e && p.e > q.s)) return false;
      }
    }
    return true;
  });
  check('days to ask: the first run, one day, three days, the 7-day limit, already answered, and a bad date', () => {
    const t = '2027-03-10';
    return eq(h.daysToAsk(t, null, addDays), ['2027-03-09'])
      && eq(h.daysToAsk(t, '2027-03-08', addDays), ['2027-03-09'])
      && eq(h.daysToAsk(t, '2027-03-06', addDays), ['2027-03-07', '2027-03-08', '2027-03-09'])
      && eq(h.daysToAsk(t, '2027-01-01', addDays), ['2027-03-03', '2027-03-04', '2027-03-05', '2027-03-06', '2027-03-07', '2027-03-08', '2027-03-09'])
      && eq(h.daysToAsk(t, '2027-03-09', addDays), []) && eq(h.daysToAsk(t, '2027-03-12', addDays), [])
      && eq(h.daysToAsk(t, 'soon', addDays), []) && eq(h.daysToAsk('2027-03-01', '2027-02-26', addDays), ['2027-02-27', '2027-02-28']);
  });
  check('days to ask equal an independent oracle on 400 generated dates and gaps', () => {
    let seed = 515; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let k = 0; k < 400; k++) {
      const today = addDays('2026-01-01', rnd(1500)), asked = rnd(10) === 0 ? null : addDays(today, -rnd(20) + 2);
      if (!eq(h.daysToAsk(today, asked, addDays), oracleDays(today, asked))) return false;
    }
    return true;
  });
  check('the rules block never mentions checks, done marks, storage or the network', () => {
    const b = block(source).split('\n').map(l => l.replace(/\/\/[^\r\n]*/, '')).join('\n');
    return !/\bchecks\b|\.done\b|=\s*true\b|localStorage|fetch\(|XMLHttp|sendBeacon|WebSocket|navigator\./.test(b);
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
    ['extras are not cut out of free time', s => s.replace('return extras.reduce((list, x) =>', 'return [].reduce((list, x) =>')],
    ['earlier placements are not taken', s => s.replace('(taken[d.iso] = taken[d.iso] || []).push(p);', '')],
    ['the latest stretch is used instead of the earliest', s => s.replace('const hit = st.find(r => r[1] - r[0] >= it.len);', 'const hit = st.filter(r => r[1] - r[0] >= it.len).pop();')],
    ['a clash is not checked', s => s.replace("return clash ? {ok: false, code: 'clash', title: clash.title} : {ok: true, e};", 'return {ok: true, e};')],
    ['running past the day end is allowed', s => s.replace("if (e > END) return {ok: false, code: 'late'};", '')],
    ['the start is not clipped to from', s => s.replace('Math.max(b.s, from || 0)', 'b.s')],
    ['days to ask have no 7-day limit', s => s.replace('let d = askedUpTo < first ? first : addDays(askedUpTo, 1)', 'let d = addDays(askedUpTo, 1)')],
    ['days to ask include today', s => s.replace("const last = addDays(today, -1), first", "const last = today, first")],
    ['the first run asks about more than yesterday', s => s.replace('if (askedUpTo === null || askedUpTo === undefined) return [last];', 'if (askedUpTo === null || askedUpTo === undefined) return [first, last];')]
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
