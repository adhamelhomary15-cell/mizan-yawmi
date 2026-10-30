#!/usr/bin/env node
/*
 * Dev-only security check (feature 012; not shipped with the app).
 *
 *   node tools/check-security.js              check the workflows and the built index.html (run tools/build.py first)
 *   node tools/check-security.js --self-test  break things on purpose and check that this script notices
 *
 * Checks that:
 *   - every GitHub Action in .github/workflows is pinned to a full commit SHA, so CI runs exactly the reviewed code;
 *   - the built page has one strict Content-Security-Policy: only its own inline scripts and styles (by hash),
 *     and requests only to its own site. The hashes are computed here again, independently of tools/build.py.
 * Output is check names and file:line findings only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WF = path.join(ROOT, '.github', 'workflows');

function loadAll() {
  const workflows = {};
  fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f)).forEach(f => { workflows[f] = fs.readFileSync(path.join(WF, f), 'utf8'); });
  return {workflows, app: fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')};
}

// Every <script> and <style>, cut the way the browser cuts them: from the opening tag to the first closing tag.
function inlineBlocks(html) {
  const blocks = [], open = /<(script|style)\b[^>]*>/gi;
  let m;
  while ((m = open.exec(html))) {
    const tag = m[1].toLowerCase(), end = html.toLowerCase().indexOf('</' + tag, open.lastIndex);
    blocks.push({tag, openTag: m[0], text: html.slice(open.lastIndex, end), at: m.index});
    open.lastIndex = end;
  }
  return blocks;
}
const sha = text => "'sha256-" + crypto.createHash('sha256').update(text, 'utf8').digest('base64') + "'";
// The exact policy, apart from the hash lists.
// connect-src: the app's own site, and the sync server's address from server/address.txt when there is one (feature 025).
const ADDRESS = path.join(__dirname, '..', 'server', 'address.txt');
const SYNC_URL = fs.existsSync(ADDRESS) ? fs.readFileSync(ADDRESS, 'utf8').trim() : '';
const FIXED = {'default-src': "'none'", 'img-src': "'self' data:", 'font-src': 'data:', 'connect-src': "'self'" + (SYNC_URL ? ' ' + SYNC_URL : ''),
  'worker-src': "'self'", 'manifest-src': "'self'", 'base-uri': "'none'", 'form-action': "'none'", 'object-src': "'none'"};

function runChecks({workflows, app}) {
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
  const metas = [...app.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/gi)];
  const policy = {};
  if (metas.length === 1) metas[0][1].split(';').map(d => d.trim()).filter(Boolean).forEach(d => {
    const [name, ...vals] = d.split(/\s+/); policy[name] = vals.join(' ');
  });
  check('the built page has exactly one CSP, before every script and style', () => {
    if (metas.length !== 1) return [metas.length + ' CSP meta tags'];
    const first = inlineBlocks(app)[0];
    return first && metas[0].index > first.at ? ['the CSP comes after the first ' + first.tag] : [];
  });
  check('the CSP has exactly the allowed directives, with no unsafe value or other origin', () => {
    const found = [];
    const names = Object.keys(policy), want = Object.keys(FIXED).concat(['script-src', 'style-src']);
    want.forEach(n => { if (!(n in policy)) found.push('missing ' + n); });
    names.forEach(n => { if (!want.includes(n)) found.push('unexpected ' + n); });
    Object.keys(FIXED).forEach(n => { if (n in policy && policy[n] !== FIXED[n]) found.push(n + ' is "' + policy[n] + '"'); });
    ['script-src', 'style-src'].forEach(n => (policy[n] || '').split(' ').filter(Boolean).forEach(v => {
      if (!/^'sha256-[A-Za-z0-9+/]+=*'$/.test(v)) found.push(n + ' allows ' + v);
    }));
    return found;
  });
  ['script', 'style'].forEach(tag => check('every inline ' + tag + ' is hashed in the CSP, and no hash is left over', () => {
    const want = inlineBlocks(app).filter(b => b.tag === tag && !(tag === 'script' && /\btype=/i.test(b.openTag))).map(b => sha(b.text));
    const have = (policy[tag + '-src'] || '').split(' ').filter(Boolean);
    return want.filter(h => !have.includes(h)).map(() => 'an inline ' + tag + ' has no hash')
      .concat(have.filter(h => !want.includes(h)).map(h => 'unused hash ' + h.slice(0, 20) + '…'));
  }));
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
    ['an action referenced by branch', d => { d.workflows[wf] = d.workflows[wf].replace(/(uses:\s*[\w.-]+\/[\w.\/-]+@)[0-9a-f]{40}/, '$1main'); }],
    ['the CSP removed', d => { d.app = d.app.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, ''); }],
    ["'unsafe-inline' added to script-src", d => { d.app = d.app.replace('script-src ', "script-src 'unsafe-inline' "); }],
    ['a script changed after hashing', d => { d.app = d.app.replace("navigator.serviceWorker.register('sw.js'", "navigator.serviceWorker.register('sw2.js'"); }],
    ['another origin allowed in connect-src', d => { d.app = d.app.replace("connect-src 'self'", "connect-src 'self' https://example.com"); }],
    ['a CSP directive dropped', d => { d.app = d.app.replace("; object-src 'none'", ''); }]
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
