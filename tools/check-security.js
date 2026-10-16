#!/usr/bin/env node
/*
 * Dev-only security check (feature 012; not shipped with the app).
 *
 *   node tools/check-security.js              check the workflows (and, once built, index.html)
 *   node tools/check-security.js --self-test  break things on purpose and check that this script notices
 *
 * Checks that every GitHub Action in .github/workflows is pinned to a full commit SHA, so CI runs exactly the
 * code that was reviewed. Output is check names and file:line findings only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WF = path.join(ROOT, '.github', 'workflows');

function loadAll() {
  const workflows = {};
  fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f)).forEach(f => { workflows[f] = fs.readFileSync(path.join(WF, f), 'utf8'); });
  return {workflows};
}

function runChecks({workflows}) {
  const results = [];
  const check = (name, fn) => { let found; try { found = fn(); } catch (e) { found = [e.message]; } results.push([name, found]); };
  check('every GitHub Action is pinned to a full commit SHA', () => {
    const found = [];
    Object.keys(workflows).forEach(f => workflows[f].split('\n').forEach((l, i) => {
      const m = l.match(/^\s*-?\s*uses:\s*(\S+)/);
      if (m && !/^[\w.-]+\/[\w.\/-]+@[0-9a-f]{40}$/.test(m[1])) found.push(f + ':' + (i + 1) + ' ' + m[1]);
    }));
    return found;
  });
  return results;
}

function report(results) {
  results.forEach(([n, found]) => {
    console.log((found.length ? 'FAIL  ' : 'ok    ') + n);
    found.forEach(x => console.log('        ' + x));
  });
  const failed = results.filter(r => r[1].length).length;
  console.log('\n' + (results.length - failed) + ' of ' + results.length + ' checks passed');
  return failed;
}

let all;
try { all = loadAll(); } catch (e) { console.error(e.message); process.exit(2); }

if (process.argv.includes('--self-test')) {
  const copy = () => JSON.parse(JSON.stringify(all));
  const wf = Object.keys(all.workflows)[0];
  const mutations = [
    ['an action referenced by tag', d => { d.workflows[wf] = d.workflows[wf].replace(/(uses:\s*[\w.-]+\/[\w.\/-]+@)[0-9a-f]{40}/, '$1v4'); }],
    ['an action referenced by branch', d => { d.workflows[wf] = d.workflows[wf].replace(/(uses:\s*[\w.-]+\/[\w.\/-]+@)[0-9a-f]{40}/, '$1main'); }]
  ];
  let missed = 0;
  mutations.forEach(([name, mutate]) => {
    const d = copy(); const before = JSON.stringify(d); mutate(d);
    if (JSON.stringify(d) === before) { console.log('FAIL  mutation did not apply: ' + name); missed++; return; }
    const noticed = runChecks(d).some(r => r[1].length);
    console.log((noticed ? 'ok    ' : 'FAIL  ') + 'noticed: ' + name);
    if (!noticed) missed++;
  });
  const clean = runChecks(copy()).every(r => !r[1].length);
  console.log((clean ? 'ok    ' : 'FAIL  ') + 'the unmodified files pass');
  if (!clean) missed++;
  console.log('\n' + (missed ? missed + ' self-test case(s) failed' : 'all ' + (mutations.length + 1) + ' self-test cases passed'));
  process.exit(missed ? 1 : 0);
}

process.exit(report(runChecks(all)) ? 1 : 0);
