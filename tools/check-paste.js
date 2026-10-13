#!/usr/bin/env node
/*
 * Dev-only check for pasting tasks from an AI (not shipped with the app).
 *
 *   node tools/check-paste.js              run the checks against src/planner.html
 *   node tools/check-paste.js --self-test  break the rules on purpose and check that this script notices
 *
 * It runs the app's own code: the "edit rules" block (task validation) and the "task paste" block
 * (parseTaskLines, buildAiPrompt, undoBatch) of src/planner.html, so the app and this tool cannot disagree.
 * All samples are made up and generic. It prints check names and counts only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'planner.html'), 'utf8');
const BLOCKS = [['// start of edit rules', '// end of edit rules'], ['// start of task paste', '// end of task paste']];

function pasteBlock(source) {
  const [a, b] = BLOCKS[1].map(m => source.indexOf(m));
  if (a < 0 || b < a) throw new Error('task paste block not found in src/planner.html');
  return source.slice(a, b);
}
function load(source) {
  const code = BLOCKS.map(([s, e]) => {
    const a = source.indexOf(s), b = source.indexOf(e);
    if (a < 0 || b < a) throw new Error('block "' + s + '" not found in src/planner.html');
    return source.slice(a, b);
  }).join('\n');
  return new Function(code + '\nreturn {parseTaskLines, buildAiPrompt, undoBatch, PASTE_MAX_LINES};')();
}

const TAGS = {uni: 'محاضرات', course: 'Course', work: 'Work', personal: 'Personal'};
const clone = x => JSON.parse(JSON.stringify(x));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const deepFreeze = o => { Object.values(o).forEach(v => { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); };

function runChecks(h) {
  const results = [];
  const check = (name, fn) => { let ok = false; try { ok = !!fn(); } catch (e) { ok = false; } results.push([name, ok]); };
  const parse = (text, existing) => h.parseTaskLines(text, TAGS, existing || []);
  const one = line => parse(line);

  check('a line with three fields becomes a proposed task with its type and date', () => {
    const r = one('uni | Read chapter one | 2026-10-20');
    return r.items.length === 1 && r.rejected.length === 0 && eq(r.items[0], {n: 1, text: 'Read chapter one', tag: 'uni', due: '2026-10-20', dupe: false, include: true});
  });
  check('the third field may be left out, or left empty', () => {
    const a = one('work | Review the draft').items[0], b = one('personal | Plan the weekend |').items[0];
    return a && b && a.due === '' && b.due === '' && a.tag === 'work' && b.tag === 'personal';
  });
  check('the type may be a label, in any case, with extra spaces', () => {
    return ['Work | x', 'WORK | x', '  work  |  x ', 'محاضرات | x'].every((l, i) => one(l).items[0] && one(l).items[0].tag === (i === 3 ? 'uni' : 'work'));
  });
  check('spaces around fields are trimmed and the text is kept as written', () => {
    const r = one('  uni  |  Keep   inner spaces  |  2026-10-20  ').items[0];
    return r.text === 'Keep   inner spaces' && r.due === '2026-10-20';
  });
  check('code fences, blank lines, bullets and numbers are skipped without a message', () => {
    const text = ['```text', '', '1. uni | One | 2026-10-20', '- work | Two', '* personal | Three', '• course | Four', '2) uni | Five', '٣. uni | Six', '```'].join('\n');
    const r = parse(text);
    return r.items.length === 6 && r.rejected.length === 0 && r.skipped === 3 && eq(r.items.map(i => i.text), ['One', 'Two', 'Three', 'Four', 'Five', 'Six'])
      && eq(r.items.map(i => i.tag), ['uni', 'work', 'personal', 'course', 'uni', 'uni']);
  });
  check('a fence without a language word, and Windows line endings, are handled', () => {
    const r = parse('```\r\nuni | One\r\n```\r\n');
    return r.items.length === 1 && r.rejected.length === 0 && r.skipped === 3;
  });
  check('every rejection reason is reported with the original line number', () => {
    const text = ['Here are your tasks:', '```', 'uni | | 2026-10-20', 'uni | a | b | c', 'uni | ' + 'x'.repeat(141) + ' |', 'uni | Bad month | 2026-13-40', 'uni | Impossible day | 2026-02-30', 'uni | Word date | tomorrow'].join('\n');
    const r = parse(text);
    const got = r.rejected.map(x => x.n + ':' + x.reason);
    return eq(got, ['1:no-separator', '3:empty-text', '4:too-many-separators', '5:too-long', '6:bad-date', '7:bad-date', '8:bad-date']) && r.items.length === 0 && r.rejected[3].length === 141;
  });
  check('an unknown or empty type is proposed without a type, not rejected, and is not included', () => {
    return ['nope | Do something | 2026-10-21', '| Missing type |', ' | Only text'].every(l => { const r = one(l); return r.items.length === 1 && r.rejected.length === 0 && r.items[0].tag === '' && r.items[0].include === false; });
  });
  check('text of 140 characters is accepted unchanged; 141 is rejected and never cut', () => {
    const ok = one('uni | ' + 'y'.repeat(140)), bad = one('uni | ' + 'y'.repeat(141));
    return ok.items.length === 1 && ok.items[0].text.length === 140 && bad.items.length === 0 && bad.rejected[0].reason === 'too-long';
  });
  check('only the first 50 candidate lines are read and the rest are counted; fences do not use slots', () => {
    const lines = Array.from({length: 60}, (_, i) => 'uni | Task ' + i);
    const a = parse(lines.join('\n')), b = parse(['```', ...lines.slice(0, 50), '```'].join('\n'));
    return a.items.length === 50 && a.leftOut === 10 && b.items.length === 50 && b.leftOut === 0 && h.PASTE_MAX_LINES === 50;
  });
  check('duplicates of an existing task or an earlier line are marked and not included; the first copy is not', () => {
    const r = parse('uni | Read   chapter\nuni | read chapter\nwork | Fresh\nwork | fresh', ['Read chapter ']);
    return eq(r.items.map(i => i.dupe), [true, true, false, true]) && eq(r.items.map(i => i.include), [false, false, true, false]);
  });
  check('every candidate line is either proposed, rejected, or counted as left out (300 random pastes)', () => {
    let seed = 12345; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    const pool = ['uni | A task | 2026-10-20', 'work | B task', 'nope | C task', '| D |', 'Hello there', '```', '', '   ', 'uni | | 2026-10-20', 'a | b | c | d', 'uni | E | 2026-99-99', '- personal | F |', '3. course | G | 2026-11-01', 'uni | ' + 'z'.repeat(150)];
    for (let k = 0; k < 300; k++) {
      const lines = Array.from({length: rnd(80)}, () => pool[rnd(pool.length)]);
      const candidates = lines.filter(l => l.trim() && !/^```[\w-]*$/.test(l.trim())).length;
      const r = parse(lines.join('\n'));
      const ns = r.items.map(i => i.n).concat(r.rejected.map(x => x.n));
      if (r.items.length + r.rejected.length + r.leftOut !== candidates) return false;
      if (new Set(ns).size !== ns.length || ns.some(n => n < 1 || n > Math.max(lines.length, 1))) return false;
    }
    return true;
  });
  check('proposed tasks carry exactly the expected fields and nothing like a done state', () => {
    const r = parse('uni | A | 2026-10-20\nwork | B');
    return r.items.every(i => eq(Object.keys(i).sort(), ['due', 'dupe', 'include', 'n', 'tag', 'text'])) && !JSON.stringify(r).includes('done');
  });
  check('the instruction text names the format, every type with its label, today and two examples', () => {
    const p = h.buildAiPrompt(TAGS, '2026-12-28');
    return p.includes('النوع | نص المهمة | آخر ميعاد') && Object.keys(TAGS).every(k => p.includes(k + ' (' + TAGS[k] + ')')) && p.includes('2026-12-28')
      && p.includes('uni | حل شيت التمارين الأول | 2027-01-04') && p.includes('course | مراجعة المسودة |') && !/undefined|\[object|NaN/.test(p);
  });
  check('the instruction text works with a single type and with no personal data', () => {
    const p = h.buildAiPrompt({work: 'Work'}, '2026-10-13');
    return p.includes('work | حل شيت التمارين الأول | 2026-10-20') && p.includes('work | مراجعة المسودة |') && !/undefined/.test(p);
  });
  check('an example line from the instruction text parses back into proposed tasks', () => {
    const p = h.buildAiPrompt(TAGS, '2026-10-13');
    const lines = p.split('\n').filter(l => /^(uni|course) \|/.test(l));
    const r = parse(lines.join('\n'));
    return lines.length === 2 && r.items.length === 2 && r.rejected.length === 0 && r.items[0].due === '2026-10-20';
  });
  const mk = (id, extra) => Object.assign({id, text: 'T' + id, tag: 'uni', due: '', done: false, created: '2026-10-13'}, extra || {});
  check('undo removes untouched batch tasks and nothing else', () => {
    const list = [mk('a'), mk('b'), mk('c'), mk('z')], batch = [{id: 'a', text: 'Ta', tag: 'uni', due: ''}, {id: 'b', text: 'Tb', tag: 'uni', due: ''}];
    return eq(h.undoBatch(list, batch).map(t => t.id), ['c', 'z']);
  });
  check('undo keeps a batch task the user has ticked or edited since', () => {
    const list = [mk('a', {done: true}), mk('b', {text: 'changed'}), mk('c', {due: '2026-11-01'}), mk('d', {tag: 'work'}), mk('e')];
    const batch = ['a', 'b', 'c', 'd', 'e'].map(id => ({id, text: 'T' + id, tag: 'uni', due: ''}));
    return eq(h.undoBatch(list, batch).map(t => t.id), ['a', 'b', 'c', 'd']);
  });
  check('undo leaves ticks on other tasks, tolerates deleted batch tasks, and does not change its input', () => {
    const list = deepFreeze([mk('x', {done: true}), mk('a')]), batch = deepFreeze([{id: 'a', text: 'Ta', tag: 'uni', due: ''}, {id: 'gone', text: 'Tgone', tag: 'uni', due: ''}]);
    const out = h.undoBatch(list, batch);
    return eq(out, [mk('x', {done: true})]) && list.length === 2;
  });
  check('the paste block never mentions done state, storage, or the network', () => {
    const block = pasteBlock(html);
    return !/\bchecks\b|\bmodules\b|\.done\s*=[^=]|localStorage|fetch\(|XMLHttp|sendBeacon|clipboard/.test(block);
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
    ['the line limit is raised to 51', s => s.replace('const PASTE_MAX_LINES = 50;', 'const PASTE_MAX_LINES = 51;')],
    ['over-long text is no longer rejected', s => s.replace("if (body.length > 140) { rejected.push({n, raw, reason: 'too-long', length: body.length}); return; }", '')],
    ['an unknown type is guessed', s => s.replace("|| ids.find(k => norm(tags[k]) === want) || '';", '|| ids.find(k => norm(tags[k]) === want) || ids[0];')],
    ['code fences are not skipped', s => s.replace('/^```[\\w-]*$/.test(line)', 'false')],
    ['duplicates are not marked', s => s.replace('dupe = seen.has(key);', 'dupe = false;')],
    ['a line without a separator is dropped silently', s => s.replace("rejected.push({n, raw, reason: 'no-separator'}); return;", 'return;')],
    ['a line with no type is included by default', s => s.replace("include: !dupe && tag !== ''", 'include: !dupe')],
    ['undo removes a ticked task too', s => s.replace('t.done === false && ', '')],
    ['a bad date is accepted', s => s.replace("rejected.push({n, raw, reason: 'bad-date'}); return; }", '}')],
    ['numbered lines are not recognised', s => s.replace('|[0-9٠-٩]+[.)])', ')')]
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
