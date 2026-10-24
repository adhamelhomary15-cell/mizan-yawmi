// Dev-only checks of the sync server (feature 025): the Worker's own handler on Node's built-in SQLite, with emails
// caught in memory. No network and no package.
//   node server/test.js              run the checks
//   node server/test.js --self-test  break the server on purpose and check that the checks notice
import {localD1} from './d1-local.js';
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const APP_URL = 'https://app.test/mizan-yawmi/';
let results = [], worker, source;
const check = async (name, fn) => { let ok = false; try { ok = !!(await fn()); } catch (e) { ok = false; console.log('      ' + e.message); } results.push([name, ok]); };
const rnd = n => Buffer.from(crypto.getRandomValues(new Uint8Array(n))).toString('base64url');
let clock;
Date.now = () => clock;

function server(){
  const emails = [];
  const env = {DB: localD1(), PEPPER: 'test-pepper-' + rnd(8), APP_URL, sendEmail: async m => { emails.push(m); }};
  const call = async (method, path, body, token) => {
    const headers = {'Content-Type': 'application/json'};
    if (token) headers.Authorization = 'Bearer ' + token;
    const r = await worker.fetch(new Request('https://sync.test' + path, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)}), env);
    return {status: r.status, body: r.status === 204 ? null : await r.json(), headers: r.headers};
  };
  const linkToken = kind => { const m = emails.map(e => e.text.match(new RegExp('#sync-' + kind + '=([A-Za-z0-9_-]+)'))).filter(Boolean).pop(); return m && m[1]; };
  // A confirmed account and a signed-in device; keys are random stand-ins (the device derives them in 025b).
  const account = async email => {
    const keys = {email, salt: rnd(16), signinKey: rnd(32), keyByPassword: rnd(60), keyByRecovery: rnd(60)};
    await call('POST', '/signup', keys);
    await call('POST', '/confirm', {token: linkToken('confirm')});
    const s = await call('POST', '/signin', {email, signinKey: keys.signinKey});
    return Object.assign(keys, {token: s.body.token});
  };
  const rows = () => {
    const out = [];
    for (const t of ['accounts', 'signins', 'stores', 'email_tokens', 'failures']) out.push(...env.DB.sqlite.prepare('SELECT * FROM ' + t).all().map(r => [t, r]));
    return out;
  };
  return {env, emails, call, linkToken, account, rows};
}

async function runAll(w, src){
  results = []; worker = w; source = src; clock = Date.parse('2026-10-24T10:00:00Z');
  await check('an unknown email always gets the same salt, which differs by email and from a real account\'s', async () => {
    const s = server(), a = await s.account('owner@example.test');
    const u1 = await s.call('POST', '/prelogin', {email: 'nobody@example.test'}), u2 = await s.call('POST', '/prelogin', {email: 'NOBODY@example.test '});
    const u3 = await s.call('POST', '/prelogin', {email: 'other@example.test'}), k = await s.call('POST', '/prelogin', {email: 'owner@example.test'});
    return u1.body.salt === u2.body.salt && u1.body.salt !== u3.body.salt && k.body.salt === a.salt && u1.body.salt.length === a.salt.length;
  });

  await check('signing up sends a confirm link; no sign-in before it, and the link works once', async () => {
    const s = server(), keys = {email: 'new@example.test', salt: rnd(16), signinKey: rnd(32), keyByPassword: rnd(60), keyByRecovery: rnd(60)};
    const up = await s.call('POST', '/signup', keys);
    const early = await s.call('POST', '/signin', {email: keys.email, signinKey: keys.signinKey});
    const token = s.linkToken('confirm');
    const c1 = await s.call('POST', '/confirm', {token}), c2 = await s.call('POST', '/confirm', {token});
    const late = await s.call('POST', '/signin', {email: keys.email, signinKey: keys.signinKey});
    return up.status === 200 && s.emails[0].to === keys.email && s.emails[0].text.startsWith('أكّد') && s.emails[0].text.includes(APP_URL + '#sync-confirm=')
      && early.status === 401 && c1.status === 200 && c2.status === 400 && late.status === 200 && late.body.keyByPassword === keys.keyByPassword;
  });

  await check('signing up with a known email answers the same, changes nothing, and only sends a note', async () => {
    const s = server(), a = await s.account('owner@example.test'), before = JSON.stringify(s.rows().filter(r => r[0] === 'accounts'));
    const r = await s.call('POST', '/signup', {email: a.email, salt: rnd(16), signinKey: rnd(32), keyByPassword: rnd(60), keyByRecovery: rnd(60)});
    const after = JSON.stringify(s.rows().filter(r => r[0] === 'accounts'));
    return r.status === 200 && JSON.stringify(r.body) === JSON.stringify({ok: true}) && before === after && s.emails.at(-1).subject === 'عندك حساب بالفعل' && !s.emails.at(-1).text.includes('#sync-');
  });

  await check('five wrong sign-ins make the right one wait 15 minutes; a right one clears the count', async () => {
    const s = server(), a = await s.account('owner@example.test');
    for (let i = 0; i < 5; i++) if ((await s.call('POST', '/signin', {email: a.email, signinKey: rnd(32)})).status !== 401) return false;
    const blocked = await s.call('POST', '/signin', {email: a.email, signinKey: a.signinKey});
    clock += 15 * 60 * 1000 + 1;
    const after = await s.call('POST', '/signin', {email: a.email, signinKey: a.signinKey});
    return blocked.status === 429 && after.status === 200 && !s.rows().some(r => r[0] === 'failures');
  });

  await check('a store takes only the next version; otherwise the current copy comes back', async () => {
    const s = server(), a = await s.account('owner@example.test'), put = (v, c) => s.call('PUT', '/store/progress', {version: v, iv: rnd(12), ciphertext: c}, a.token);
    const empty = await s.call('GET', '/store/progress', undefined, a.token);
    const p1 = await put(1, 'AAAA'), again = await put(1, 'BBBB'), skip = await put(3, 'CCCC'), p2 = await put(2, 'DDDD');
    const got = await s.call('GET', '/store/progress', undefined, a.token), v = await s.call('GET', '/versions', undefined, a.token);
    return empty.body.version === 0 && p1.status === 200 && again.status === 409 && again.body.ciphertext === 'AAAA' && skip.status === 409
      && p2.status === 200 && got.body.version === 2 && got.body.ciphertext === 'DDDD' && JSON.stringify(v.body) === JSON.stringify({progress: 2, workouts: 0, settings: 0});
  });

  await check('unknown stores, bad fields and a store over 2 MB are refused', async () => {
    const s = server(), a = await s.account('owner@example.test');
    const bad = await s.call('GET', '/store/secrets', undefined, a.token), field = await s.call('PUT', '/store/progress', {version: 1, iv: 'no spaces!', ciphertext: 'AA'}, a.token);
    const big = await s.call('PUT', '/store/progress', {version: 1, iv: rnd(12), ciphertext: 'A'.repeat(2 * 1024 * 1024 + 1)}, a.token);
    return bad.status === 404 && field.status === 400 && (big.status === 400 || big.status === 413) && !s.rows().some(r => r[0] === 'stores');
  });

  await check('a token reads its own account only, and a made-up or missing one reads nothing', async () => {
    const s = server(), a = await s.account('a@example.test'), b = await s.account('b@example.test');
    await s.call('PUT', '/store/settings', {version: 1, iv: rnd(12), ciphertext: 'AAAA'}, a.token);
    const asB = await s.call('GET', '/store/settings', undefined, b.token), fake = await s.call('GET', '/store/settings', undefined, rnd(32)), none = await s.call('GET', '/versions');
    return asB.body.version === 0 && fake.status === 401 && none.status === 401;
  });

  await check('a new password needs the old one, signs every other device out, and the old one stops working', async () => {
    const s = server(), a = await s.account('owner@example.test');
    const other = (await s.call('POST', '/signin', {email: a.email, signinKey: a.signinKey})).body.token;
    const next = {salt: rnd(16), newSigninKey: rnd(32), keyByPassword: rnd(60)};
    const wrong = await s.call('POST', '/password', Object.assign({signinKey: rnd(32)}, next), a.token);
    const ok = await s.call('POST', '/password', Object.assign({signinKey: a.signinKey}, next), a.token);
    const here = await s.call('GET', '/versions', undefined, a.token), there = await s.call('GET', '/versions', undefined, other);
    const oldKey = await s.call('POST', '/signin', {email: a.email, signinKey: a.signinKey}), newKey = await s.call('POST', '/signin', {email: a.email, signinKey: next.newSigninKey});
    return wrong.status === 401 && ok.status === 200 && here.status === 200 && there.status === 401 && oldKey.status === 401
      && newKey.status === 200 && newKey.body.keyByPassword === next.keyByPassword;
  });

  await check('a reset with the recovery code keeps the copy; the link gives the wrapped key and works once', async () => {
    const s = server(), a = await s.account('owner@example.test');
    await s.call('PUT', '/store/progress', {version: 1, iv: rnd(12), ciphertext: 'KEPT'}, a.token);
    await s.call('POST', '/reset/start', {email: a.email});
    const token = s.linkToken('reset'), key = await s.call('POST', '/reset/key', {token});
    const next = {token, mode: 'keep', salt: rnd(16), signinKey: rnd(32), keyByPassword: rnd(60), keyByRecovery: a.keyByRecovery};
    const done = await s.call('POST', '/reset/finish', next), twice = await s.call('POST', '/reset/finish', next);
    const old = await s.call('GET', '/versions', undefined, a.token), got = await s.call('GET', '/store/progress', undefined, done.body.token);
    return key.body.keyByRecovery === a.keyByRecovery && done.status === 200 && twice.status === 400 && old.status === 401 && got.body.ciphertext === 'KEPT';
  });

  await check('a reset without the code deletes the copy and starts new keys; an unknown email gets no email', async () => {
    const s = server(), a = await s.account('owner@example.test');
    await s.call('PUT', '/store/progress', {version: 1, iv: rnd(12), ciphertext: 'GONE'}, a.token);
    const sent = s.emails.length, unknown = await s.call('POST', '/reset/start', {email: 'nobody@example.test'});
    await s.call('POST', '/reset/start', {email: a.email});
    const done = await s.call('POST', '/reset/finish', {token: s.linkToken('reset'), mode: 'wipe', salt: rnd(16), signinKey: rnd(32), keyByPassword: rnd(60), keyByRecovery: rnd(60)});
    const got = await s.call('GET', '/store/progress', undefined, done.body.token);
    return unknown.status === 200 && s.emails.length === sent + 1 && done.status === 200 && got.body.version === 0;
  });

  await check('an expired link is refused', async () => {
    const s = server(), a = await s.account('owner@example.test');
    await s.call('POST', '/reset/start', {email: a.email});
    clock += 60 * 60 * 1000 + 1;
    return (await s.call('POST', '/reset/key', {token: s.linkToken('reset')})).status === 400;
  });

  await check('deleting the account leaves no row of it in any table, and the other account untouched', async () => {
    const s = server(), a = await s.account('a@example.test'), b = await s.account('b@example.test');
    for (const x of [a, b]) await s.call('PUT', '/store/workouts', {version: 1, iv: rnd(12), ciphertext: 'AAAA'}, x.token);
    await s.call('POST', '/signin', {email: a.email, signinKey: rnd(32)});
    await s.call('POST', '/reset/start', {email: a.email});
    const del = await s.call('DELETE', '/account', undefined, a.token);
    const left = s.rows(), aId = left.find(r => r[0] === 'accounts' && r[1].email === b.email)[1].id;
    return del.status === 200 && left.every(([t, r]) => (t === 'accounts' ? r.id : r.account_id) === aId) && left.some(r => r[0] === 'stores')
      && (await s.call('GET', '/versions', undefined, a.token)).status === 401;
  });

  await check('a real encrypted payload leaves no plain word anywhere in the database (SC-004)', async () => {
    const s = server(), a = await s.account('owner@example.test');
    const words = ['مذاكرة الفيزيا', 'Secret course name', 'اجتماع مع المشرف', '2026-10-24'];
    const key = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt']), iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify({format: 'mizan-sync', store: 'progress', data: {tasks: words.map((w, i) => ({id: 't' + i, text: w}))}}));
    const ct = Buffer.from(await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, plain)).toString('base64url');
    await s.call('PUT', '/store/progress', {version: 1, iv: Buffer.from(iv).toString('base64url'), ciphertext: ct}, a.token);
    const dump = JSON.stringify(s.rows());
    return s.rows().some(r => r[0] === 'stores') && words.every(w => !dump.includes(w) && !dump.includes(Buffer.from(w).toString('base64url')));
  });

  await check('the app\'s origin, and only it, may call the server', async () => {
    const s = server(), r = await s.call('OPTIONS', '/versions');
    return r.status === 204 && r.headers.get('Access-Control-Allow-Origin') === 'https://app.test' && /Authorization/.test(r.headers.get('Access-Control-Allow-Headers'));
  });

  await check('the server never logs a request body or an account', () => {
    const logs = source.match(/console\.\w+\([^)]*\)/g) || [];
    return logs.length === 1 && logs[0] === "console.error('server error on ' + route)";
  });
  return results;
}

const SOURCE = readFileSync(new URL('./worker.js', import.meta.url), 'utf8');
if (process.argv.includes('--self-test')) {
  const mutations = [
    ['any version is taken', s => s.replace('if (body.version !== (cur ? cur.version : 0) + 1) return', 'if (false) return').replace("+ 'WHERE stores.version = ?')", "+ 'WHERE ? IS NOT NULL')")],
    ['a token reads any account', s => s.replace("JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = ?').bind(hash)", "JOIN accounts a ON a.id = s.account_id WHERE s.token_hash != ?').bind(hash)")],
    ['deleting the account leaves its stores', s => s.replace("['stores', 'signins',", "['signins',")],
    ['failures are not slowed', s => s.replace('if (fails.n >= FAIL_LIMIT) return', 'if (false) return')],
    ['an unknown email gets a random salt', s => s.replace("(await hmac(env.PEPPER, 'salt:' + body.email)).slice(0, 16)", 'crypto.getRandomValues(new Uint8Array(16))')],
    ['a new password keeps other devices signed in', s => s.replace(",\n      env.DB.prepare('DELETE FROM signins WHERE account_id = ? AND token_hash != ?').bind(a.id, a.tokenHash)", '')],
    ['a reset link works twice', s => s.replace("env.DB.prepare('DELETE FROM email_tokens WHERE account_id = ? AND kind = ?').bind(t.account_id, 'reset'),", '')],
    ['a known email is told apart at sign-up', s => s.replace("      return [200, {ok: true}];\n    }\n    if (old) await deleteAccount", "      return [409, {error: 'known'}];\n    }\n    if (old) await deleteAccount")],
    ['a body is logged', s => s.replace("console.error('server error on ' + route);", "console.error('server error on ' + route, JSON.stringify(body));")]
  ];
  const dir = mkdtempSync(join(tmpdir(), 'mizan-server-'));
  let missed = 0, n = 0;
  for (const [name, mutate] of mutations) {
    const mutated = mutate(SOURCE);
    if (mutated === SOURCE) { console.log('FAIL  mutation did not apply: ' + name); missed++; continue; }
    const file = join(dir, 'worker' + (n++) + '.js');
    writeFileSync(file, mutated);
    const noticed = (await runAll((await import(pathToFileURL(file))).default, mutated)).some(r => !r[1]);
    console.log((noticed ? 'ok    ' : 'FAIL  ') + 'noticed: ' + name);
    if (!noticed) missed++;
  }
  rmSync(dir, {recursive: true, force: true});
  const clean = (await runAll((await import('./worker.js')).default, SOURCE)).every(r => r[1]);
  console.log((clean ? 'ok    ' : 'FAIL  ') + 'the unmodified server passes');
  if (!clean) missed++;
  console.log('\n' + (missed ? missed + ' self-test case(s) failed' : 'all ' + (mutations.length + 1) + ' self-test cases passed'));
  process.exit(missed ? 1 : 0);
}

await runAll((await import('./worker.js')).default, SOURCE);
results.forEach(([n, ok]) => console.log((ok ? 'ok    ' : 'FAIL  ') + n));
const failed = results.filter(r => !r[1]).length;
console.log('\n' + (results.length - failed) + ' of ' + results.length + ' checks passed');
process.exit(failed ? 1 : 0);
