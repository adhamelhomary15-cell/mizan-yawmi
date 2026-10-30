#!/usr/bin/env node
/*
 * Dev-only check of the code standards in AGENTS.md (feature 010; not shipped with the app).
 *
 *   node tools/check-code.js              check src/app
 *   node tools/check-code.js --self-test  break the rules on purpose and check that this script notices
 *
 * It checks that:
 *   - src/app/ORDER and the files in src/app agree;
 *   - no part is longer than 600 lines;
 *   - every top-level function, const and let in src/app is used somewhere;
 *   - no top-level name is declared twice (all parts share one scope, where a second function silently wins);
 *   - nothing writes raw HTML into the page (dangerouslySetInnerHTML);
 *   - no string search for Arabic text decides behaviour (indexOf, includes, startsWith, endsWith);
 *   - no value is worked out from the settings (CFG) at the top level outside applySettings in 02-settings-load.js.
 * Output is check names and file:name findings only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const fs = require('fs');
const path = require('path');
const {partNames, PLACEHOLDER} = require('./lib/source.js');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'src', 'app');
const MAX_LINES = 600;

// Everything the checks look at, in memory, so the self-test can change it.
function loadAll() {
  const order = partNames();
  const files = fs.readdirSync(APP).filter(f => f.endsWith('.js')).sort();
  const parts = {};
  files.forEach(f => { parts[f] = fs.readFileSync(path.join(APP, f), 'utf8').replace(/\r\n/g, '\n'); });
  const shell = fs.readFileSync(path.join(ROOT, 'src', 'planner.html'), 'utf8').replace(/\r\n/g, '\n');
  return {order, parts, shell};
}

const lineCount = text => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
const DECL = /^  (?:async )?(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=)/gm;
const uses = (text, name) => (text.match(new RegExp('(?<![\\w$.])' + name.replace(/\$/g, '\\$') + '(?![\\w$])', 'g')) || []).length;

function runChecks({order, parts, shell}) {
  const results = [];
  const check = (name, fn) => {
    let found = [];
    try { found = fn(); } catch (e) { found = [e.message]; }
    results.push([name, found]);
  };
  check('src/app/ORDER lists every part exactly once', () => {
    const listed = new Set(order), found = [];
    order.forEach((n, i) => { if (order.indexOf(n) !== i) found.push(n + ' is listed twice'); if (!(n in parts)) found.push(n + ' is listed but missing'); });
    Object.keys(parts).forEach(f => { if (!listed.has(f)) found.push(f + ' is not listed'); });
    return found;
  });
  check('no part is longer than ' + MAX_LINES + ' lines', () =>
    Object.keys(parts).filter(f => lineCount(parts[f]) > MAX_LINES).map(f => f + ' has ' + lineCount(parts[f]) + ' lines'));
  check('every top-level function, const and let is used', () => {
    const joined = shell.replace(PLACEHOLDER, order.filter(n => n in parts).map(n => parts[n]).join(''));
    const found = [];
    Object.keys(parts).forEach(f => {
      for (const m of parts[f].matchAll(DECL)) { const n = m[1] || m[2]; if (uses(joined, n) < 2) found.push(f + ': ' + n); }
    });
    return found;
  });
  // All parts share one script scope: a second function of the same name silently replaces the first (feature 025
  // found setStatus twice), and a second const or let stops the page from loading.
  check('no top-level name is declared twice', () => {
    const seen = {}, found = [];
    order.filter(n => n in parts).forEach(f => {
      for (const m of parts[f].matchAll(DECL)) { const n = m[1] || m[2]; if (seen[n]) found.push(n + ' in ' + seen[n] + ' and ' + f); else seen[n] = f; }
    });
    return found;
  });
  check('nothing writes raw HTML into the page', () =>
    Object.keys(parts).filter(f => /dangerouslySetInnerHTML/.test(parts[f])).map(f => f));
  // A rule for one person hides as a search for their words (feature 017): behaviour must come from data, not text.
  check('no string search for Arabic text decides behaviour', () => {
    const found = [];
    Object.keys(parts).forEach(f => parts[f].split('\n').forEach((l, i) => {
      if (/\.(indexOf|includes|startsWith|endsWith)\(\s*['"`][؀-ۿ]/.test(l)) found.push(f + ':' + (i + 1));
    }));
    return found;
  });
  // A value worked out from the settings once, outside applySettings, would keep the old settings after a change
  // (feature 020).
  check('values worked out from the settings live in applySettings', () => {
    const found = [];
    Object.keys(parts).filter(f => f !== '02-settings-load.js').forEach(f => parts[f].split('\n').forEach((l, i) => {
      if (/^  (const|let) [\w${}:, ]+=(?!\s*\(?[\w$, {}]*\)?\s*=>).*\bCFG\b/.test(l)) found.push(f + ':' + (i + 1));
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
  const copy = () => ({order: all.order.slice(), parts: Object.assign({}, all.parts), shell: all.shell});
  const first = all.order[0], last = all.order[all.order.length - 1];
  const mutations = [
    ['an unused function', d => { d.parts[last] = d.parts[last].replace('})();', '  function neverCalled(){ return 1; }\n})();'); }],
    ['an unused const', d => { d.parts[first] += '  const NEVER_READ = 42;\n'; }],
    ['a function declared twice', d => { d.parts[last] = d.parts[last].replace('})();', '  function fmtStr(){ return 1; }\n})();'); }],
    ['a part over the line limit', d => { d.parts[first] += '  //\n'.repeat(MAX_LINES); }],
    ['a part missing from ORDER', d => { d.order = d.order.slice(1); }],
    ['a part listed twice', d => { d.order.push(first); }],
    ['raw HTML written into the page', d => { d.parts[first] += "  const raw = h('div', {dangerouslySetInnerHTML: {__html: ''}}); raw;\n"; }],
    ['a search for Arabic text', d => { d.parts[first] += "  const special = t => t.indexOf('مثال') > -1; special;\n"; }],
    ['a value worked out from the settings outside applySettings', d => { d.parts[last] = '  const PLACE_NAME = CFG.location.label;\n  PLACE_NAME;\n' + d.parts[last]; }]
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
  console.log((clean ? 'ok    ' : 'FAIL  ') + 'the unmodified source passes');
  if (!clean) missed++;
  console.log('\n' + (missed ? missed + ' self-test case(s) failed' : 'all ' + (mutations.length + 1) + ' self-test cases passed'));
  process.exit(missed ? 1 : 0);
}

process.exit(report(runChecks(all)) ? 1 : 0);
