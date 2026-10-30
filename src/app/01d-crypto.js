  // start of sync crypto
  /* ---------------- sync crypto (feature 025; the browser's Web Crypto only, tools/check-crypto.js runs this block) ---------------- */
  // The password never leaves the device (constitution 3.0.1, Principle III). From it come two keys that cannot be
  // told from each other: a wrapping key that stays here and opens the data key, and a sign-in key that is sent. The
  // data key is random and encrypts every store; the server keeps it only wrapped, by the password and by the
  // recovery code. No storage, page or network.
  const PBKDF2_ROUNDS = 600000;
  const RECOVERY_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I/L: easy to copy by hand
  const utf8 = new TextEncoder();
  const toB64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const fromB64u = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const randomBytes = n => crypto.getRandomValues(new Uint8Array(n));

  async function pbkdf2Bits(password, salt, rounds){
    const base = await crypto.subtle.importKey('raw', utf8.encode(password), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds}, base, 256));
  }
  async function hkdfBits(ikm, salt, info, bits){
    const base = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({name: 'HKDF', hash: 'SHA-256', salt, info: utf8.encode(info)}, base, bits));
  }
  const aesKey = (raw, uses) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, uses);
  // {wrapKey, signinKey} from a password and the account's salt (base64url); rounds is lower only in the dev check.
  async function deriveKeys(password, salt, rounds = PBKDF2_ROUNDS){
    const root = await pbkdf2Bits(password, fromB64u(salt), rounds), none = new Uint8Array(32);
    return {wrapKey: await aesKey(await hkdfBits(root, none, 'mizan sync wrap', 256), ['wrapKey', 'unwrapKey']),
      signinKey: toB64u(await hkdfBits(root, none, 'mizan sync sign-in', 256))};
  }
  const newSalt = () => toB64u(randomBytes(16));
  const newDataKey = () => crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
  // A wrapped key is the IV and the wrapped bytes, as one base64url text.
  async function wrapKey(dataKey, wrapper){
    const iv = randomBytes(12), wrapped = new Uint8Array(await crypto.subtle.wrapKey('raw', dataKey, wrapper, {name: 'AES-GCM', iv}));
    const out = new Uint8Array(12 + wrapped.length); out.set(iv); out.set(wrapped, 12);
    return toB64u(out);
  }
  // extractable only to wrap it again (a new password); kept for daily use, it is not
  async function unwrapKey(text, wrapper, extractable){
    const all = fromB64u(text);
    return crypto.subtle.unwrapKey('raw', all.slice(12), wrapper, {name: 'AES-GCM', iv: all.slice(0, 12)}, 'AES-GCM', !!extractable, ['encrypt', 'decrypt']);
  }
  // One store's payload, encrypted with a new IV every time; open throws if anything in it was changed.
  async function seal(dataKey, payload){
    const iv = randomBytes(12), ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, dataKey, utf8.encode(JSON.stringify(payload)));
    return {iv: toB64u(iv), ciphertext: toB64u(ct)};
  }
  async function open(dataKey, sealed){
    const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: fromB64u(sealed.iv)}, dataKey, fromB64u(sealed.ciphertext));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  // The recovery code: 8 groups of 4 of 31 letters (about 158 bits), shown once; spaces, dashes and case do not matter
  // when typed.
  function newRecoveryCode(){
    const letters = Array.from(randomBytes(32), b => RECOVERY_LETTERS[b % RECOVERY_LETTERS.length]).join('');
    return letters.match(/.{4}/g).join('-');
  }
  const cleanRecoveryCode = code => String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isRecoveryCode = code => cleanRecoveryCode(code).length === 32 && [...cleanRecoveryCode(code)].every(c => RECOVERY_LETTERS.includes(c));
  // The code is long and random, so a key comes from it directly, with no slow derivation and no salt: the account's
  // salt changes with every new password, and the code must keep opening the data key after that.
  async function recoveryKey(code){
    return aesKey(await hkdfBits(utf8.encode(cleanRecoveryCode(code)), new Uint8Array(32), 'mizan sync recovery', 256), ['wrapKey', 'unwrapKey']);
  }
  // end of sync crypto
