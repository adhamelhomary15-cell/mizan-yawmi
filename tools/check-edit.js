#!/usr/bin/env node
/*
 * Dev-only check for the task and appointment edit rules (not shipped with the app).
 *
 *   node tools/check-edit.js              run the checks against src/planner.html
 *   node tools/check-edit.js --self-test  break the rules on purpose and check that this script notices
 *
 * It runs the app's own helpers (the block between "start of edit rules" and "end of edit rules" in
 * src/planner.html), so the app and this tool cannot disagree. It prints check names and counts only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'planner.html'), 'utf8');
const START = '// start of edit rules', END = '// end of edit rules';

function load(source) {
  const a = source.indexOf(START), b = source.indexOf(END);
  if (a < 0 || b < 0 || b < a) throw new Error('edit rules block not found in src/planner.html');
  const code = source.slice(a, b);
  return new Function(code + '\nreturn {validateTaskFields, validateApptFields, applyEdit, restoreFields, TASK_EDIT_KEYS, APPT_EDIT_KEYS};')();
}

const TAGS = {uni: 'A', course: 'B', work: 'C', personal: 'D'};
const DAYS = [6, 0, 1, 2, 3, 4, 5];
const clone = x => JSON.parse(JSON.stringify(x));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function runChecks(h) {
  const results = [];
  const check = (name, fn) => { let ok = false; try { ok = !!fn(); } catch (e) { ok = false; } results.push([name, ok]); };

  const tasks = () => [
    {id: 't1', text: 'one', tag: 'uni', due: '2030-01-05', done: true, created: '2029-12-01'},
    {id: 't2', text: 'two', tag: 'work', due: '', done: false, created: '2029-12-02'},
    {id: 't3', text: 'three', tag: 'course', due: '2030-02-01', done: false, created: '2029-12-03'}
  ];
  const appts = () => [
    {id: 'a1', label: 'meet', day: 1, time: '10:00'},
    {id: 'a2', label: 'call', day: 3, time: '18:30'}
  ];

  // Task edit: only text, tag, due change (FR-004, FR-005, SC-002)
  check('task edit keeps done, created and id, for done and open tasks', () => {
    return ['t1', 't2'].every(id => {
      const before = tasks();
      const after = h.applyEdit(clone(before), id, {text: 'new', tag: 'personal', due: '2031-01-01'}, h.TASK_EDIT_KEYS);
      const b = before.find(t => t.id === id), a = after.find(t => t.id === id);
      return a.done === b.done && a.created === b.created && a.id === b.id && a.text === 'new' && a.tag === 'personal' && a.due === '2031-01-01';
    });
  });
  check('task edit leaves every other record unchanged', () => {
    const before = tasks();
    const after = h.applyEdit(clone(before), 't2', {text: 'new'}, h.TASK_EDIT_KEYS);
    return eq(after.filter(t => t.id !== 't2'), before.filter(t => t.id !== 't2')) && after.length === before.length;
  });
  check('a patch with done, created, id or checks changes nothing but the allowed keys', () => {
    const before = tasks();
    const after = h.applyEdit(clone(before), 't1', {done: false, created: 'x', id: 'zzz', checks: {a: 1}, text: 'ok'}, h.TASK_EDIT_KEYS);
    const a = after.find(t => t.id === 't1');
    return a.done === true && a.created === '2029-12-01' && a.id === 't1' && !('checks' in a) && a.text === 'ok';
  });
  check('an unknown id changes nothing', () => eq(h.applyEdit(tasks(), 'nope', {text: 'x'}, h.TASK_EDIT_KEYS), tasks()));
  check('applyEdit does not mutate its input', () => {
    const input = tasks(), copy = clone(input);
    h.applyEdit(input, 't1', {text: 'x'}, h.TASK_EDIT_KEYS);
    return eq(input, copy);
  });

  // Task validation (FR-003, FR-007, SC-003)
  check('empty and whitespace-only text is rejected with a message, never a value', () => {
    return ['', '   ', '\n\t ', null, undefined].every(t => {
      const r = h.validateTaskFields({text: t, tag: 'uni', due: ''}, TAGS);
      return !r.ok && r.error && !('value' in r);
    });
  });
  check('text is trimmed and cut to 140 characters', () => {
    const r = h.validateTaskFields({text: '  ' + 'x'.repeat(200) + '  ', tag: 'uni', due: ''}, TAGS);
    return r.ok && r.value.text.length === 140 && r.value.text === 'x'.repeat(140);
  });
  check('a type that is not in the list is rejected', () => {
    return ['gone', '', null, undefined, '__proto__', 'toString'].every(t => !h.validateTaskFields({text: 'a', tag: t, due: ''}, TAGS).ok);
  });
  check('the due date is optional and must be a real date when given', () => {
    const ok = d => h.validateTaskFields({text: 'a', tag: 'uni', due: d}, TAGS).ok;
    return ok('') && ok(undefined) && ok('2030-02-28') && !ok('2030-13-01') && !ok('tomorrow') && !ok('2030-1-1')
      && !ok('2026-02-30') && !ok('2026-02-29') && ok('2028-02-29') && !ok('2026-04-31') && ok('2026-12-31');
  });
  check('a valid task passes with trimmed values', () => {
    const r = h.validateTaskFields({text: ' hi ', tag: 'work', due: '2030-05-05'}, TAGS);
    return r.ok && eq(r.value, {text: 'hi', tag: 'work', due: '2030-05-05'});
  });

  // Appointment edit and validation (FR-013, FR-014)
  check('appointment edit keeps id and changes only label, day, time', () => {
    const before = appts();
    const after = h.applyEdit(clone(before), 'a1', {label: 'x', day: 5, time: '09:15', id: 'zzz', extra: 1}, h.APPT_EDIT_KEYS);
    const a = after.find(r => r.id === 'a1');
    return a.label === 'x' && a.day === 5 && a.time === '09:15' && !('extra' in a) && eq(after.find(r => r.id === 'a2'), before.find(r => r.id === 'a2'));
  });
  check('appointment name is required after trim and cut to 60', () => {
    const bad = h.validateApptFields({label: '   ', day: 1, time: '10:00'}, DAYS);
    const cut = h.validateApptFields({label: 'y'.repeat(90), day: 1, time: '10:00'}, DAYS);
    return !bad.ok && !('value' in bad) && cut.ok && cut.value.label.length === 60;
  });
  check('appointment needs a real time and a day from the week', () => {
    const v = (day, time) => h.validateApptFields({label: 'a', day, time}, DAYS).ok;
    return !v(1, '') && !v(1, '25:00') && !v(1, '9:5') && !v(9, '10:00') && !v('', '10:00') && !v(undefined, '10:00') && v('3', '23:59') && v(0, '00:00');
  });
  check('appointment day is stored as a number', () => h.validateApptFields({label: 'a', day: '4', time: '10:00'}, DAYS).value.day === 4);

  // Undo (FR-009, SC-005, Principle II)
  check('undo restores the edited record exactly', () => {
    const original = tasks();
    const t1 = original.find(t => t.id === 't1');
    const before = {text: t1.text, tag: t1.tag, due: t1.due};
    const edited = h.applyEdit(clone(original), 't1', {text: 'changed', tag: 'work', due: ''}, h.TASK_EDIT_KEYS);
    return eq(h.restoreFields(edited, 't1', before, h.TASK_EDIT_KEYS), original);
  });
  check('undo does not touch ticks made after the edit', () => {
    const original = tasks();
    const before = {text: 'one', tag: 'uni', due: '2030-01-05'};
    let list = h.applyEdit(clone(original), 't1', {text: 'changed'}, h.TASK_EDIT_KEYS);
    list = list.map(t => t.id === 't2' ? Object.assign({}, t, {done: true}) : t);   // a tick after the edit
    list = list.map(t => t.id === 't1' ? Object.assign({}, t, {done: false}) : t);   // and an un-tick
    const back = h.restoreFields(list, 't1', before, h.TASK_EDIT_KEYS);
    return back.find(t => t.id === 't2').done === true && back.find(t => t.id === 't1').done === false && back.find(t => t.id === 't1').text === 'one';
  });
  check('undo after the record was deleted is a no-op', () => {
    const list = tasks().filter(t => t.id !== 't1');
    return eq(h.restoreFields(list, 't1', {text: 'one', tag: 'uni', due: ''}, h.TASK_EDIT_KEYS), list);
  });
  check('editing the same record twice keeps one record', () => {
    let list = h.applyEdit(tasks(), 't2', {text: 'a'}, h.TASK_EDIT_KEYS);
    list = h.applyEdit(list, 't2', {text: 'b'}, h.TASK_EDIT_KEYS);
    return list.length === 3 && list.filter(t => t.id === 't2').length === 1 && list.find(t => t.id === 't2').text === 'b';
  });

  // Whole-block guarantee: the edit rules never name done-state storage (Principle II)
  check('the edit rules block never writes done, checks or modules', () => {
    const a = html.indexOf(START), b = html.indexOf(END);
    const block = html.slice(a, b);
    return !/\.done\s*=[^=]/.test(block) && !/\bchecks\b/.test(block) && !/\bmodules\b/.test(block);
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
    ['applyEdit also lets done through', s => s.replace("allowedKeys.forEach(k =>", "allowedKeys.concat(['done']).forEach(k =>")],
    ['applyEdit ignores the id', s => s.replace("if (!r || r.id !== id) return r;", "if (!r) return r;")],
    ['empty text is accepted', s => s.replace("if (!text) return {ok:false, error:'اكتب نص المهمة.'};", "")],
    ['text is not cut', s => s.replace(".trim().slice(0, 140)", ".trim()")],
    ['unknown type is accepted', s => s.replace("if (typeof tag !== 'string' || !Object.prototype.hasOwnProperty.call(tags, tag)) return {ok:false, error:'اختار النوع.'};", "")],
    ['restoreFields is a no-op', s => s.replace("return applyEdit(list, id, before, allowedKeys);", "return list;")]
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
