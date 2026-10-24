// The sync server (feature 025): accounts, sign-ins, and one encrypted copy per store. It never sees plain data: the
// device encrypts before sending, and the password never arrives here, only a sign-in key derived from it (constitution
// 3.0.1, Principle III). It logs no request bodies.
//
// env: DB (D1), PEPPER (secret), APP_URL (the app's address, for email links and CORS), and either RESEND_KEY with
// EMAIL_FROM (the real sender) or sendEmail (a function, for server/dev.js and server/test.js).

const STORES = ['progress', 'workouts', 'settings'];
const MAX_STORE = 2 * 1024 * 1024;           // characters of ciphertext per store
const TOKEN_LIFE = 60 * 60 * 1000;           // email links: 1 hour
const FAIL_WINDOW = 15 * 60 * 1000, FAIL_LIMIT = 5;

const enc = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha256 = async text => b64url(await crypto.subtle.digest('SHA-256', enc.encode(text)));
const randomToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
async function hmac(secret, text){
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}
// Equal-time comparison of two strings of the same kind.
function same(a, b){
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// What a request may carry: base64url values of a bounded length, and a plain email.
const isB64 = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max && /^[A-Za-z0-9_-]+$/.test(v);
const isEmail = v => typeof v === 'string' && v.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const isKey = v => isB64(v, 200);

function cors(env){
  return {'Access-Control-Allow-Origin': new URL(env.APP_URL).origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin'};
}
const reply = (env, status, body) => new Response(JSON.stringify(body), {status, headers: Object.assign({'Content-Type': 'application/json', 'Cache-Control': 'no-store'}, cors(env))});

async function sendEmail(env, to, subject, text){
  if (env.sendEmail) return env.sendEmail({to, subject, text});
  const r = await fetch('https://api.resend.com/emails', {method: 'POST', headers: {Authorization: 'Bearer ' + env.RESEND_KEY, 'Content-Type': 'application/json'},
    body: JSON.stringify({from: env.EMAIL_FROM, to, subject, text})});
  if (!r.ok) throw new Error('email ' + r.status);
}
async function emailLink(env, account, kind){
  const token = randomToken(), now = Date.now();
  await env.DB.prepare('DELETE FROM email_tokens WHERE expires_at < ?').bind(now).run();
  await env.DB.prepare('INSERT INTO email_tokens (token_hash, account_id, kind, expires_at) VALUES (?, ?, ?, ?)').bind(await sha256(token), account.id, kind, now + TOKEN_LIFE).run();
  const link = env.APP_URL + '#sync-' + kind + '=' + token;
  const text = kind === 'confirm'
    ? 'أكّد إيميلك عشان المزامنة تبدأ في ميزان يومي:\n' + link + '\n\nاللينك شغال ساعة واحدة. لو ماعملتش حساب، سيب الرسالة دي.'
    : 'عشان تحط باسورد جديد للمزامنة في ميزان يومي:\n' + link + '\n\nاللينك شغال ساعة واحدة. لو ماطلبتش ده، سيب الرسالة دي، وباسوردك زي ما هو.';
  await sendEmail(env, account.email, kind === 'confirm' ? 'أكّد إيميلك' : 'باسورد جديد', text);
}
// A single-use email token of a kind, still valid; it is spent by the caller.
async function emailToken(env, token, kind){
  if (!isB64(token, 100)) return null;
  const row = await env.DB.prepare('SELECT * FROM email_tokens WHERE token_hash = ? AND kind = ?').bind(await sha256(token), kind).first();
  return row && row.expires_at >= Date.now() ? row : null;
}
async function newSignin(env, accountId){
  const token = randomToken(), now = Date.now();
  await env.DB.prepare('INSERT INTO signins (token_hash, account_id, created_at, last_seen_at) VALUES (?, ?, ?, ?)').bind(await sha256(token), accountId, now, now).run();
  return token;
}
// The account of the request's sign-in, or null. Every data and account route goes through here.
async function signedIn(env, request){
  const m = /^Bearer ([A-Za-z0-9_-]{20,100})$/.exec(request.headers.get('Authorization') || '');
  if (!m) return null;
  const hash = await sha256(m[1]);
  const row = await env.DB.prepare('SELECT a.* FROM signins s JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = ?').bind(hash).first();
  if (!row) return null;
  await env.DB.prepare('UPDATE signins SET last_seen_at = ? WHERE token_hash = ?').bind(Date.now(), hash).run();
  return Object.assign(row, {tokenHash: hash});
}
const verifierOf = (env, signinKey) => sha256(signinKey + '.' + env.PEPPER);
const byEmail = (env, email) => env.DB.prepare('SELECT * FROM accounts WHERE email = ?').bind(email).first();
async function deleteAccount(env, id){
  await env.DB.batch(['stores', 'signins', 'email_tokens', 'failures', 'accounts'].map(t =>
    env.DB.prepare('DELETE FROM ' + t + ' WHERE ' + (t === 'accounts' ? 'id' : 'account_id') + ' = ?').bind(id)));
}

const routes = {
  // The salt to derive keys with. An unknown email gets one that is always the same, so nobody can tell it apart.
  async 'POST /prelogin'(env, body){
    if (!isEmail(body.email)) return [400, {error: 'email'}];
    const a = await byEmail(env, body.email);
    return [200, {salt: a ? a.salt : b64url((await hmac(env.PEPPER, 'salt:' + body.email)).slice(0, 16))}];
  },
  // The same answer for a new email and a known one; a known, confirmed email only gets a note by email.
  async 'POST /signup'(env, body){
    if (!isEmail(body.email) || !isB64(body.salt, 40) || !isKey(body.signinKey) || !isKey(body.keyByPassword) || !isKey(body.keyByRecovery)) return [400, {error: 'fields'}];
    const old = await byEmail(env, body.email);
    if (old && old.confirmed_at) {
      await sendEmail(env, old.email, 'عندك حساب بالفعل', 'حد حاول يعمل حساب مزامنة في ميزان يومي بإيميلك، وإنت عندك حساب بالفعل. لو ده إنت، ادخل بباسوردك أو استخدم «نسيت الباسورد».');
      return [200, {ok: true}];
    }
    if (old) await deleteAccount(env, old.id);
    await env.DB.prepare('INSERT INTO accounts (email, salt, verifier, key_by_password, key_by_recovery, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(body.email, body.salt, await verifierOf(env, body.signinKey), body.keyByPassword, body.keyByRecovery, Date.now()).run();
    await emailLink(env, await byEmail(env, body.email), 'confirm');
    return [200, {ok: true}];
  },
  async 'POST /confirm'(env, body){
    const t = await emailToken(env, body.token, 'confirm');
    if (!t) return [400, {error: 'token'}];
    await env.DB.batch([env.DB.prepare('UPDATE accounts SET confirmed_at = ? WHERE id = ?').bind(Date.now(), t.account_id),
      env.DB.prepare('DELETE FROM email_tokens WHERE token_hash = ?').bind(t.token_hash)]);
    return [200, {ok: true}];
  },
  async 'POST /signin'(env, body){
    if (!isEmail(body.email) || !isKey(body.signinKey)) return [400, {error: 'fields'}];
    const a = await byEmail(env, body.email);
    if (!a || !a.confirmed_at) return [401, {error: 'signin'}];
    const since = Date.now() - FAIL_WINDOW;
    const fails = await env.DB.prepare('SELECT COUNT(*) AS n FROM failures WHERE account_id = ? AND at > ?').bind(a.id, since).first();
    if (fails.n >= FAIL_LIMIT) return [429, {error: 'wait', retryAfter: FAIL_WINDOW / 1000}];
    if (!same(await verifierOf(env, body.signinKey), a.verifier)) {
      await env.DB.prepare('INSERT INTO failures (account_id, at) VALUES (?, ?)').bind(a.id, Date.now()).run();
      return [401, {error: 'signin'}];
    }
    await env.DB.prepare('DELETE FROM failures WHERE account_id = ?').bind(a.id).run();
    return [200, {token: await newSignin(env, a.id), keyByPassword: a.key_by_password}];
  },
  async 'POST /signout'(env, body, a){
    await env.DB.prepare('DELETE FROM signins WHERE token_hash = ?').bind(a.tokenHash).run();
    return [200, {ok: true}];
  },
  async 'GET /versions'(env, body, a){
    const rows = (await env.DB.prepare('SELECT name, version, saved_at FROM stores WHERE account_id = ?').bind(a.id).all()).results;
    const out = {};
    STORES.forEach(n => { const r = rows.find(x => x.name === n); out[n] = r ? r.version : 0; });
    return [200, out];
  },
  async 'GET /store'(env, body, a, name){
    const r = await env.DB.prepare('SELECT version, iv, ciphertext, saved_at FROM stores WHERE account_id = ? AND name = ?').bind(a.id, name).first();
    return [200, r ? {version: r.version, iv: r.iv, ciphertext: r.ciphertext, savedAt: r.saved_at} : {version: 0}];
  },
  // Only the next version is taken; otherwise the current copy comes back, for the device to merge and try again.
  async 'PUT /store'(env, body, a, name){
    if (!Number.isInteger(body.version) || body.version < 1 || !isB64(body.iv, 40) || !isB64(body.ciphertext, MAX_STORE)) return [400, {error: 'fields'}];
    const current = async () => { const [, c] = await routes['GET /store'](env, body, a, name); return [409, c]; };
    const cur = await env.DB.prepare('SELECT version FROM stores WHERE account_id = ? AND name = ?').bind(a.id, name).first();
    if (body.version !== (cur ? cur.version : 0) + 1) return current();
    // the write itself checks the version too, so another device's write in between is never overwritten
    const now = Date.now(), r = await env.DB.prepare('INSERT INTO stores (account_id, name, version, iv, ciphertext, size, saved_at) VALUES (?, ?, ?, ?, ?, ?, ?) '
      + 'ON CONFLICT (account_id, name) DO UPDATE SET version = excluded.version, iv = excluded.iv, ciphertext = excluded.ciphertext, size = excluded.size, saved_at = excluded.saved_at '
      + 'WHERE stores.version = ?').bind(a.id, name, body.version, body.iv, body.ciphertext, body.ciphertext.length, now, body.version - 1).run();
    return r.meta.changes ? [200, {version: body.version, savedAt: now}] : current();
  },
  // A new password: the old sign-in key proves it is the owner; every other device signs in again.
  async 'POST /password'(env, body, a){
    if (!isKey(body.signinKey) || !isB64(body.salt, 40) || !isKey(body.newSigninKey) || !isKey(body.keyByPassword)) return [400, {error: 'fields'}];
    if (!same(await verifierOf(env, body.signinKey), a.verifier)) return [401, {error: 'signin'}];
    await env.DB.batch([env.DB.prepare('UPDATE accounts SET salt = ?, verifier = ?, key_by_password = ? WHERE id = ?').bind(body.salt, await verifierOf(env, body.newSigninKey), body.keyByPassword, a.id),
      env.DB.prepare('DELETE FROM signins WHERE account_id = ? AND token_hash != ?').bind(a.id, a.tokenHash)]);
    return [200, {ok: true}];
  },
  async 'POST /reset/start'(env, body){
    if (!isEmail(body.email)) return [400, {error: 'email'}];
    const a = await byEmail(env, body.email);
    if (a && a.confirmed_at) await emailLink(env, a, 'reset');
    return [200, {ok: true}];
  },
  // The data key wrapped by the recovery code, for the device to open with the code it holds. The link is not spent.
  async 'POST /reset/key'(env, body){
    const t = await emailToken(env, body.token, 'reset');
    if (!t) return [400, {error: 'token'}];
    const a = await env.DB.prepare('SELECT key_by_recovery FROM accounts WHERE id = ?').bind(t.account_id).first();
    return [200, {keyByRecovery: a.key_by_recovery}];
  },
  // keep: the recovery code opened the data key, which comes back wrapped by the new password. wipe: no code, so the
  // copy is deleted and a new data key starts. Either way the link is spent and every device signs in again.
  async 'POST /reset/finish'(env, body){
    const t = await emailToken(env, body.token, 'reset');
    if (!t) return [400, {error: 'token'}];
    if ((body.mode !== 'keep' && body.mode !== 'wipe') || !isB64(body.salt, 40) || !isKey(body.signinKey) || !isKey(body.keyByPassword) || !isKey(body.keyByRecovery)) return [400, {error: 'fields'}];
    const stmts = [env.DB.prepare('UPDATE accounts SET salt = ?, verifier = ?, key_by_password = ?, key_by_recovery = ? WHERE id = ?')
      .bind(body.salt, await verifierOf(env, body.signinKey), body.keyByPassword, body.keyByRecovery, t.account_id),
      env.DB.prepare('DELETE FROM signins WHERE account_id = ?').bind(t.account_id),
      env.DB.prepare('DELETE FROM email_tokens WHERE account_id = ? AND kind = ?').bind(t.account_id, 'reset'),
      env.DB.prepare('DELETE FROM failures WHERE account_id = ?').bind(t.account_id)];
    if (body.mode === 'wipe') stmts.push(env.DB.prepare('DELETE FROM stores WHERE account_id = ?').bind(t.account_id));
    await env.DB.batch(stmts);
    return [200, {token: await newSignin(env, t.account_id)}];
  },
  async 'DELETE /account'(env, body, a){
    await deleteAccount(env, a.id);
    return [200, {ok: true}];
  }
};
const OPEN = ['POST /prelogin', 'POST /signup', 'POST /confirm', 'POST /signin', 'POST /reset/start', 'POST /reset/key', 'POST /reset/finish'];

export default {
  async fetch(request, env){
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors(env)});
    const path = new URL(request.url).pathname, m = /^\/store\/([a-z]+)$/.exec(path);
    const route = request.method + ' ' + (m ? '/store' : path), name = m && m[1];
    if (!routes[route] || (m && !STORES.includes(name))) return reply(env, 404, {error: 'route'});
    let body = {};
    if (request.method === 'POST' || request.method === 'PUT') {
      const text = await request.text();
      if (text.length > MAX_STORE + 1000) return reply(env, 413, {error: 'size'});
      try { body = JSON.parse(text || '{}'); } catch (e) { return reply(env, 400, {error: 'json'}); }
      if (!body || typeof body !== 'object') return reply(env, 400, {error: 'json'});
      if (typeof body.email === 'string') body.email = body.email.trim().toLowerCase();
    }
    let account = null;
    if (!OPEN.includes(route)) {
      account = await signedIn(env, request);
      if (!account) return reply(env, 401, {error: 'signin'});
    }
    try {
      const [status, out] = await routes[route](env, body, account, name);
      return reply(env, status, out);
    } catch (e) {
      // the route only, never the body or the account
      console.error('server error on ' + route);
      return reply(env, 500, {error: 'server'});
    }
  }
};
