#!/usr/bin/env node
/*
 * Dev-only check for the «الآن» line rule (feature 023; not shipped with the app).
 *
 *   node tools/check-now.js              run the checks against the joined app source
 *   node tools/check-now.js --self-test  break the rule on purpose and check that this script notices
 *
 * It runs the app's own code: the block between "start of now line" and "end of now line". Every minute of generated
 * days is also placed by an independent minute-grid oracle, and the two must agree. All data is generated and
 * generic; output is check names only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const html = require('./lib/source.js').readSource();
const START_MARK = '// start of now line', END_MARK = '// end of now line';
function block(source) {
  const a = source.indexOf(START_MARK), b = source.indexOf(END_MARK);
  if (a < 0 || b < a) throw new Error('now line block not found in the app source');
  return source.slice(a, b);
}
const load = source => new Function(block(source) + '\nreturn {nowPlace};')();

const START = 420, END = 1500;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const B = (s, e) => ({s, e});

// A day as the timeline shows it: blocks with gaps, back-to-back blocks, one-minute blocks, and now and then a block
// that starts before the previous one ends, sorted by start as dayBlocks sorts them (src/app/07-day-model.js).
function genDay(rnd) {
  const blocks = [];
  let t = START + rnd(3) * 30;
  while (t < END - 1) {
    const len = rnd(8) === 0 ? 1 : 5 * (1 + rnd(36));
    const s = blocks.length && rnd(6) === 0 ? Math.max(START, t - 5 * (1 + rnd(6))) : t;
    const e = Math.min(END, s + len);
    if (e <= s) break;
    blocks.push(B(s, e));
    t = Math.max(t, e) + (rnd(3) === 0 ? 5 * rnd(13) : 0);
  }
  return blocks.sort((p, q) => p.s - q.s);
}

// The oracle: a grid of the minutes of the day. Each minute keeps the last block that covers it; a free minute looks
// ahead to the next minute where a block starts.
function oracle(blocks, min) {
  if (!blocks.length) return null;
  const owner = {};
  blocks.forEach((b, i) => { for (let m = b.s; m < b.e; m++) owner[m] = i; });
  if (owner[min] !== undefined) { const b = blocks[owner[min]]; return {row: owner[min], at: 'in', share: (min - b.s) / (b.e - b.s)}; }
  for (let m = min + 1; m <= END; m++) {
    const i = blocks.findIndex(b => b.s === m);
    if (i >= 0) return {row: i, at: 'top'};
  }
  return {row: blocks.length - 1, at: 'bottom'};
}

function runChecks(h, source) {
  const results = [];
  const check = (name, fn) => { let ok = false; try { ok = !!fn(); } catch (e) { ok = false; } results.push([name, ok]); };
  // The high bits of the generator: its low bits repeat on a short cycle.
  let seed = 2023; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >>> 16) % n; };
  const days = Array.from({length: 400}, () => genDay(rnd));

  check('an empty day has no line', () => h.nowPlace([], 600) === null);
  check('every minute of 400 generated days matches the minute-grid oracle', () =>
    days.every(blocks => { for (let m = START - 60; m <= END + 60; m++) if (!eq(h.nowPlace(blocks, m), oracle(blocks, m))) return false; return true; }));
  check('inside a block, the share is the time passed, from 0 up to but not including 1', () =>
    days.every(blocks => { for (let m = START; m < END; m++) {
      const p = h.nowPlace(blocks, m);
      if (p && p.at === 'in') { const b = blocks[p.row]; if (!(p.share >= 0 && p.share < 1) || p.share !== (m - b.s) / (b.e - b.s)) return false; }
    } return true; }));
  check('with overlapping blocks, the line crosses the last one in progress', () =>
    eq(h.nowPlace([B(600, 720), B(660, 690)], 670), {row: 1, at: 'in', share: 10 / 30})
    && eq(h.nowPlace([B(600, 720), B(660, 690)], 700), {row: 0, at: 'in', share: 100 / 120}));
  check('the end minute of a block is outside it', () => eq(h.nowPlace([B(600, 660), B(660, 720)], 660), {row: 1, at: 'in', share: 0})
    && eq(h.nowPlace([B(600, 660)], 660), {row: 0, at: 'bottom'}));
  check('in free time the line is at the top of the next row; before the first block, at its top', () =>
    eq(h.nowPlace([B(600, 660), B(700, 760)], 680), {row: 1, at: 'top'}) && eq(h.nowPlace([B(600, 660)], 500), {row: 0, at: 'top'}));
  check('the rule never mentions storage, the page or the network', () =>
    !/localStorage|indexedDB|document\.|window\.|fetch\(|CFG\b/.test(block(source)));
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
    ['the first block in progress is chosen instead of the last', s => s.replace('for (let i = blocks.length - 1; i >= 0; i--) {', 'for (let i = 0; i < blocks.length; i++) {')],
    ['a gap is placed at the bottom of the previous row', s => s.replace("return next >= 0 ? {row: next, at: 'top'}", "return next >= 0 ? {row: Math.max(0, next - 1), at: next ? 'bottom' : 'top'}")],
    ['the end minute counts as inside', s => s.replace('if (b.s <= min && min < b.e)', 'if (b.s <= min && min <= b.e)')],
    ['an empty day gets a line', s => s.replace('    if (!blocks.length) return null;\n', '')]
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
