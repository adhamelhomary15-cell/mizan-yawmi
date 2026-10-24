#!/usr/bin/env node
/*
 * Dev-only check for the sync crypto (feature 025; not shipped with the app).
 *
 *   node tools/check-crypto.js              run the checks against the joined app source
 *   node tools/check-crypto.js --self-test  break the code on purpose and check that this script notices
 *
 * It runs the app's own code, the block between "start of sync crypto" and "end of sync crypto", in Node's Web Crypto:
 * known answers for PBKDF2 and HKDF, the app's encryption opened by Node's separate cipher (and the other way), and the
 * rules of Principle III: the password never sent, two keys that differ, a new IV every time, a tampered copy refused.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const nodeCrypto = require('crypto');
const html = require('./lib/source.js').readSource();

function block(source) {
  const a = source.indexOf('// start of sync crypto'), b = source.indexOf('// end of sync crypto');
  if (a < 0 || b < a) throw new Error('sync crypto block not found');
  return source.slice(a, b);
}
const load = source => new Function(block(source) + '\nreturn {pbkdf2Bits, hkdfBits, deriveKeys, newSalt, newDataKey, wrapKey, unwrapKey, seal, open, newRecoveryCode, isRecoveryCode, recoveryKey, toB64u, fromB64u};')();
const hex = b => Buffer.from(b).toString('hex');
const throws = async fn => { try { await fn(); return false; } catch (e) { return true; } };

async function runChecks(h){
  const results = [];
  const check = async (name, fn) => { let ok = false; try { ok = !!(await fn()); } catch (e) { ok = false; } results.push([name, ok]); };
  const ROUNDS = 1000;   // the app uses 600,000; the rules are the same

  await check('PBKDF2-SHA-256 gives the known answers (password, salt, 1 and 2 rounds)', async () =>
    hex(await h.pbkdf2Bits('password', new TextEncoder().encode('salt'), 1)) === '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b'
    && hex(await h.pbkdf2Bits('password', new TextEncoder().encode('salt'), 2)) === 'ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43');

  await check('HKDF-SHA-256 gives the known answer (RFC 5869, test case 3)', async () =>
    hex(await h.hkdfBits(new Uint8Array(22).fill(0x0b), new Uint8Array(0), '', 336))
      === '8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8');

  await check('the sign-in key comes again from the same password, differs for another, and is not the wrapping key', async () => {
    const salt = h.newSalt(), a = await h.deriveKeys('correct horse 1', salt, ROUNDS), b = await h.deriveKeys('correct horse 1', salt, ROUNDS);
    const c = await h.deriveKeys('correct horse 2', salt, ROUNDS);
    const root = await h.pbkdf2Bits('correct horse 1', h.fromB64u(salt), ROUNDS), wrapBits = await h.hkdfBits(root, new Uint8Array(32), 'mizan sync wrap', 256);
    return a.signinKey === b.signinKey && a.signinKey !== c.signinKey && h.toB64u(wrapBits) !== a.signinKey
      && !a.signinKey.includes('correct') && !a.wrapKey.extractable;
  });

  await check('the data key, wrapped by the password, opens with it and not with another', async () => {
    const salt = h.newSalt(), k = await h.deriveKeys('pass one 123', salt, ROUNDS), wrong = await h.deriveKeys('pass two 123', salt, ROUNDS);
    const data = await h.newDataKey(), wrapped = await h.wrapKey(data, k.wrapKey);
    const back = await h.unwrapKey(wrapped, k.wrapKey, false), sealed = await h.seal(data, {hello: 'عالم'});
    return (await h.open(back, sealed)).hello === 'عالم' && !back.extractable && await throws(() => h.unwrapKey(wrapped, wrong.wrapKey, false));
  });

  await check('every seal has a new IV, a changed bit is refused, and Node\'s own cipher opens it', async () => {
    const data = await h.newDataKey(), payload = {tasks: [{id: 't1', text: 'مذاكرة الفيزيا'}]};
    const one = await h.seal(data, payload), two = await h.seal(data, payload);
    const ct = h.fromB64u(one.ciphertext); ct[3] ^= 1;
    const raw = Buffer.from(await crypto.subtle.exportKey('raw', data)), bytes = Buffer.from(h.fromB64u(one.ciphertext));
    const d = nodeCrypto.createDecipheriv('aes-256-gcm', raw, Buffer.from(h.fromB64u(one.iv)));
    d.setAuthTag(bytes.subarray(bytes.length - 16));
    const plain = Buffer.concat([d.update(bytes.subarray(0, bytes.length - 16)), d.final()]).toString('utf8');
    return one.iv !== two.iv && one.ciphertext !== two.ciphertext && JSON.parse(plain).tasks[0].text === 'مذاكرة الفيزيا'
      && await throws(() => h.open(data, {iv: one.iv, ciphertext: h.toB64u(ct)}));
  });

  await check('a payload sealed by Node\'s own cipher opens in the app', async () => {
    const raw = nodeCrypto.randomBytes(32), iv = nodeCrypto.randomBytes(12), c = nodeCrypto.createCipheriv('aes-256-gcm', raw, iv);
    const body = Buffer.concat([c.update(JSON.stringify({v: 1, name: 'من Node'}), 'utf8'), c.final(), c.getAuthTag()]);
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    return (await h.open(key, {iv: h.toB64u(iv), ciphertext: h.toB64u(body)})).name === 'من Node';
  });

  await check('the recovery code: 8 groups of 4, typed any way, and still opens the data key after a new password', async () => {
    const code = h.newRecoveryCode(), typed = code.toLowerCase().replace(/-/g, ' ');
    const data = await h.newDataKey(), byCode = await h.wrapKey(data, await h.recoveryKey(code));
    const back = await h.unwrapKey(byCode, await h.recoveryKey(typed), false);
    const sealed = await h.seal(data, {ok: true});
    return /^([A-Z2-9]{4}-){7}[A-Z2-9]{4}$/.test(code) && h.isRecoveryCode(typed) && !h.isRecoveryCode(code.slice(1))
      && (await h.open(back, sealed)).ok === true && h.newRecoveryCode() !== code;
  });

  await check('the sync crypto block never mentions storage, the page or the network', () => {
    const b = block(html).split('\n').map(l => l.replace(/\/\/[^\r\n]*/, '')).join('\n');
    return !/localStorage|indexedDB|document\.|window\.|fetch\(|navigator\./.test(b);
  });
  return results;
}

(async () => {
  if (process.argv.includes('--self-test')) {
    const mutations = [
      ['one IV for every seal', s => s.replace('const iv = randomBytes(12), ct = await', 'const iv = new Uint8Array(12), ct = await')],
      ['the sign-in key is the wrapping key', s => s.replace("'mizan sync sign-in'", "'mizan sync wrap'")],
      ['the rounds are ignored', s => s.replace('salt, iterations: rounds}', 'salt, iterations: 1}')],
      ['the recovery key takes the account salt', s => s.replace('async function recoveryKey(code){', 'async function recoveryKey(code, salt = newSalt()){').replace("cleanRecoveryCode(code)), new Uint8Array(32), 'mizan sync recovery'", "cleanRecoveryCode(code)), fromB64u(salt), 'mizan sync recovery'")],
      ['an unwrapped key can be read out', s => s.replace("'AES-GCM', !!extractable, ['encrypt', 'decrypt']", "'AES-GCM', true, ['encrypt', 'decrypt']")]
    ];
    let missed = 0;
    for (const [name, mutate] of mutations) {
      const mutated = mutate(html);
      if (mutated === html) { console.log('FAIL  mutation did not apply: ' + name); missed++; continue; }
      let results;
      try { results = await runChecks(load(mutated)); } catch (e) { results = [['load', false]]; }
      const noticed = results.some(r => !r[1]);
      console.log((noticed ? 'ok    ' : 'FAIL  ') + 'noticed: ' + name);
      if (!noticed) missed++;
    }
    const clean = (await runChecks(load(html))).every(r => r[1]);
    console.log((clean ? 'ok    ' : 'FAIL  ') + 'the unmodified source passes');
    if (!clean) missed++;
    console.log('\n' + (missed ? missed + ' self-test case(s) failed' : 'all ' + (mutations.length + 1) + ' self-test cases passed'));
    process.exit(missed ? 1 : 0);
  }
  let results;
  try { results = await runChecks(load(html)); } catch (e) { console.error(e.message); process.exit(2); }
  results.forEach(([n, ok]) => console.log((ok ? 'ok    ' : 'FAIL  ') + n));
  const failed = results.filter(r => !r[1]).length;
  console.log('\n' + (results.length - failed) + ' of ' + results.length + ' checks passed');
  process.exit(failed ? 1 : 0);
})();
