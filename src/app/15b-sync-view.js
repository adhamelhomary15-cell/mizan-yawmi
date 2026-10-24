  /* ---------------- «المزامنة» in Settings (feature 025; the engine is 06b, the crypto 01d) ---------------- */
  // An email link opens the app at #sync-confirm=<token> or #sync-reset=<token>; read once, then the address is cleaned.
  // The first «المزامنة» to show takes it (takeSyncLink), so a later visit to Settings never uses it again.
  let syncLink = (() => {
    const m = /^#sync-(confirm|reset)=([A-Za-z0-9_-]+)$/.exec(location.hash || '');
    if (m) history.replaceState(null, '', location.pathname + location.search);
    return m ? {kind: m[1], token: m[2]} : null;
  })();
  const takeSyncLink = () => { const l = syncLink; syncLink = null; return l; };
  const PASSWORD_MIN = 10;
  const SYNC_ERRORS = {
    short: 'الباسورد لازم يبقى ' + PASSWORD_MIN + ' حروف على الأقل.', differ: 'الباسورد والتأكيد مش زي بعض.',
    email: 'اكتب إيميل صحيح.', signin: 'الإيميل أو الباسورد مش صح، أو الإيميل لسه ماتأكدش.', wait: 'محاولات غلط كتير. استنى ربع ساعة.',
    code: 'كود الاسترجاع مش صح.', token: 'اللينك ده خلص أو اتستخدم قبل كده. اطلب لينك جديد.', net: 'مقدرتش أوصل للسيرفر. جرّب تاني بعد شوية.',
    saved: 'لازم تأكد إنك حفظت كود الاسترجاع.'
  };
  const errorOf = e => (e && e.status === 401 ? 'signin' : e && e.status === 429 ? 'wait' : e && e.status === 400 && e.body && e.body.error === 'token' ? 'token' : e && e.message === 'code' ? 'code' : 'net');
  const checkPassword = (p, again) => (p.length < PASSWORD_MIN ? 'short' : p !== again ? 'differ' : null);

  // The flows. Each one asks the server only for what Principle III allows, and keeps the password on this device.
  async function signUp(email, password, code){
    const salt = newSalt(), keys = await deriveKeys(password, salt), data = await newDataKey();
    await api('POST', '/signup', {email, salt, signinKey: keys.signinKey, keyByPassword: await wrapKey(data, keys.wrapKey), keyByRecovery: await wrapKey(data, await recoveryKey(code))});
  }
  // Signs in, and returns what the first join must decide: whether the account's schedule and this device's differ.
  async function signIn(email, password){
    const {salt} = await api('POST', '/prelogin', {email}), keys = await deriveKeys(password, salt);
    const s = await api('POST', '/signin', {email, signinKey: keys.signinKey});
    const key = await unwrapKey(s.keyByPassword, keys.wrapKey, false);
    sync.token = s.token;
    const remote = await api('GET', '/store/settings'), mine = storedData('settings');
    const theirs = remote.version ? (await open(key, remote)).data : null;
    return {email, token: s.token, key, keyByPassword: s.keyByPassword, choose: !!(theirs && mine && JSON.stringify(theirs) !== JSON.stringify(mine))};
  }
  async function changePassword(oldPassword, newPassword){
    const email = sync.record.email, {salt} = await api('POST', '/prelogin', {email}), old = await deriveKeys(oldPassword, salt);
    const data = await unwrapKey(sync.record.keyByPassword, old.wrapKey, true).catch(() => { throw Object.assign(new Error('signin'), {status: 401}); });
    const nextSalt = newSalt(), next = await deriveKeys(newPassword, nextSalt), keyByPassword = await wrapKey(data, next.wrapKey);
    await api('POST', '/password', {signinKey: old.signinKey, salt: nextSalt, newSigninKey: next.signinKey, keyByPassword});
    sync.record.keyByPassword = keyByPassword; saveRecord();
  }
  // With the recovery code the account keeps its copy; without it, a new data key and code start, and this device's
  // data fills the copy again. Either way every device signs in again.
  async function finishReset(token, email, password, code){
    const salt = newSalt(), keys = await deriveKeys(password, salt);
    let data, keyByRecovery, nextCode = null;
    if (code) {
      ({keyByRecovery} = await api('POST', '/reset/key', {token}));
      data = await unwrapKey(keyByRecovery, await recoveryKey(code), true).catch(() => { throw new Error('code'); });
    } else {
      data = await newDataKey(); nextCode = newRecoveryCode();
      keyByRecovery = await wrapKey(data, await recoveryKey(nextCode));
    }
    const keyByPassword = await wrapKey(data, keys.wrapKey);
    const s = await api('POST', '/reset/finish', {token, mode: code ? 'keep' : 'wipe', salt, signinKey: keys.signinKey, keyByPassword, keyByRecovery});
    await beginSync(email, s.token, await unwrapKey(keyByPassword, keys.wrapKey, false), keyByPassword, false);
    return nextCode;
  }

  // One small form: its fields, what it does, and its message.
  function useForm(){
    const [f, setF] = useState({}), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
    const set = (name, v) => setF(p => Object.assign({}, p, {[name]: v}));
    const field = (name, label, type, extra) => html`<label class="field wide" for=${'sy-' + name}>${label}<input id=${'sy-' + name} type=${type || 'text'} dir="ltr" value=${f[name] || ''} autocomplete=${(extra || {}).auto || 'off'} onInput=${e => set(name, e.target.value)} /></label>`;
    const run = async (fn) => { setBusy(true); setErr(''); try { await fn(f); } catch (e) { setErr(SYNC_ERRORS[e.code || errorOf(e)]); } setBusy(false); };
    return {f, set, field, run, err, busy, setErr};
  }
  const fail = code => { throw Object.assign(new Error(code), {code}); };
  const isMail = v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((v || '').trim());

  function SyncSection({store, wk}){
    const view = useSyncView();
    const [link] = useState(takeSyncLink);
    const [screen, setScreen] = useState(link ? link.kind : 'main');
    const [note, setNote] = useState(''), [code, setCode] = useState(newRecoveryCode), [join, setJoin] = useState(null);
    const [aside, setAside] = useState(null), [askOff, setAskOff] = useState(false);
    const form = useForm();
    useEffect(() => { kvGet('before-sync').then(v => setAside(v || null)); }, [view.lastSync]);
    useEffect(() => {
      if (!link || link.kind !== 'confirm') return;
      api('POST', '/confirm', {token: link.token}).then(() => setNote('اتأكد إيميلك. ادخل بإيميلك وباسوردك.'), () => setNote(SYNC_ERRORS.token)).then(() => setScreen('signin'));
    }, []);
    const go = s => { setScreen(s); setNote(''); form.setErr(''); };
    const start = async j => { await beginSync(j.email, j.token, j.key, j.keyByPassword, j.keep); setJoin(null); go('main'); };

    let body;
    if (view.status === 'unavailable') body = html`<p class="small muted">المزامنة لسه مش متاحة في النسخة دي من التطبيق.</p>`;
    else if (screen === 'signup') body = html`<div class="form">
        ${form.field('email', 'الإيميل', 'email', {auto: 'email'})}${form.field('pass', 'الباسورد (' + PASSWORD_MIN + ' حروف على الأقل)', 'password', {auto: 'new-password'})}${form.field('again', 'الباسورد تاني', 'password', {auto: 'new-password'})}
        <p class="small"><b>كود الاسترجاع:</b> <bdi dir="ltr" class="num">${code}</bdi></p>
        <p class="small muted">اكتبه أو احفظه في مكان أمين. لو نسيت الباسورد، هو الطريقة الوحيدة اللي ترجّع بيها النسخة المتزامنة. مش هيظهر تاني.</p>
        <label class="check-line"><input type="checkbox" checked=${!!form.f.saved} onChange=${e => form.set('saved', e.target.checked)} /> حفظت الكود</label>
        <span class="backup-act"><button type="button" class="btn primary" disabled=${form.busy} onClick=${() => form.run(async f => {
          if (!isMail(f.email)) fail('email'); const bad = checkPassword(f.pass || '', f.again || ''); if (bad) fail(bad); if (!f.saved) fail('saved');
          await signUp(f.email.trim().toLowerCase(), f.pass, code); setCode(newRecoveryCode()); go('main'); setNote('بعتنالك إيميل. افتح اللينك اللي فيه على الجهاز ده عشان تأكد الحساب.'); })}>اعمل الحساب</button>
          <button type="button" class="btn ghost" onClick=${() => go('main')}>لأ</button></span></div>`;
    else if (screen === 'signin' || (screen === 'main' && view.status === 'signin')) body = html`<div class="form">
        ${form.field('email', 'الإيميل', 'email', {auto: 'email'})}${form.field('pass', 'الباسورد', 'password', {auto: 'current-password'})}
        <span class="backup-act"><button type="button" class="btn primary" disabled=${form.busy} onClick=${() => form.run(async f => {
          if (!isMail(f.email)) fail('email');
          const j = await signIn(f.email.trim().toLowerCase(), f.pass || '');
          if (j.choose) setJoin(j); else await start(Object.assign(j, {keep: false})); })}>ادخل</button>
          <button type="button" class="btn ghost" onClick=${() => go('forgot')}>نسيت الباسورد</button></span></div>`;
    else if (screen === 'forgot') body = html`<div class="form">${form.field('email', 'الإيميل', 'email', {auto: 'email'})}
        <span class="backup-act"><button type="button" class="btn primary" disabled=${form.busy} onClick=${() => form.run(async f => {
          if (!isMail(f.email)) fail('email'); await api('POST', '/reset/start', {email: f.email.trim().toLowerCase()});
          go('main'); setNote('لو فيه حساب بالإيميل ده، هيوصلك لينك تحط بيه باسورد جديد.'); })}>ابعتلي لينك</button><button type="button" class="btn ghost" onClick=${() => go('main')}>لأ</button></span></div>`;
    else if (screen === 'reset') body = html`<div class="form">
        ${form.field('email', 'الإيميل', 'email', {auto: 'email'})}${form.field('pass', 'باسورد جديد', 'password', {auto: 'new-password'})}${form.field('again', 'الباسورد الجديد تاني', 'password', {auto: 'new-password'})}
        ${form.field('code', 'كود الاسترجاع (لو معاك)')}
        ${form.f.code ? null : html`<p class="small"><b>من غير الكود، النسخة اللي على السيرفر هتتمسح</b>، وبيانات الجهاز ده هي اللي هتتبعت من الأول. بيانات أي جهاز مش هتتمسح.</p>`}
        <span class="backup-act"><button type="button" class="btn primary" disabled=${form.busy} onClick=${() => form.run(async f => {
          if (!isMail(f.email)) fail('email'); const bad = checkPassword(f.pass || '', f.again || ''); if (bad) fail(bad);
          if (f.code && !isRecoveryCode(f.code)) fail('code');
          const nextCode = await finishReset(link.token, f.email.trim().toLowerCase(), f.pass, f.code || '');
          go('main'); setNote(nextCode ? 'كود الاسترجاع الجديد: ' + nextCode + ' اكتبه في مكان أمين، مش هيظهر تاني.' : 'اتغيّر الباسورد، والنسخة المتزامنة زي ما هي.'); })}>غيّر الباسورد</button></span></div>`;
    else if (screen === 'password') body = html`<div class="form">
        ${form.field('old', 'الباسورد الحالي', 'password', {auto: 'current-password'})}${form.field('pass', 'باسورد جديد', 'password', {auto: 'new-password'})}${form.field('again', 'الباسورد الجديد تاني', 'password', {auto: 'new-password'})}
        <span class="backup-act"><button type="button" class="btn primary" disabled=${form.busy} onClick=${() => form.run(async f => {
          const bad = checkPassword(f.pass || '', f.again || ''); if (bad) fail(bad);
          await changePassword(f.old || '', f.pass); go('main'); setNote('اتغيّر الباسورد. الأجهزة التانية هتطلب الجديد.'); })}>غيّر</button><button type="button" class="btn ghost" onClick=${() => go('main')}>لأ</button></span></div>`;
    else if (!view.email) body = html`<p class="small muted">نسخة متشفّرة من بياناتك على سيرفر، عشان ماتضيعش لو الموبايل ضاع، وتبقى على أكتر من جهاز. بتتشفّر على جهازك، والسيرفر بيشوف إيميلك وحجم النسخة ومواعيدها بس. اختيارية.</p>
        <span class="backup-act"><button type="button" class="btn primary" onClick=${() => go('signup')}>اعمل حساب</button><button type="button" class="btn" onClick=${() => go('signin')}>ادخل</button></span>`;
    else body = html`<p><b><bdi dir="ltr">${view.email}</bdi></b></p><p class="small">${syncLine(view)}</p>
        ${aside ? html`<p class="small muted">قبل آخر مرة المزامنة غيّرت حاجة على الجهاز ده، اتحفظت نسخة منه. <button type="button" class="btn ghost" onClick=${() => { const b = makeBackup(aside.stores, aside.at, zoneParts(new Date(aside.at)).iso); downloadText(b.name, b.text); }}>احفظها كملف</button></p>` : null}
        <span class="backup-act"><button type="button" class="btn" onClick=${() => go('password')}>غيّر الباسورد</button>
          <button type="button" class="btn" onClick=${async () => { await api('POST', '/signout').catch(() => {}); await endSync(); setNote('خرجت من الجهاز ده. بياناته زي ما هي.'); }}>اخرج من الجهاز ده</button></span>
        ${askOff ? html`<${Notice} role="alert" title="تقفل المزامنة وتمسح نسختها؟" line="الحساب والنسخة اللي على السيرفر هيتمسحوا، وكل الأجهزة هتخرج. بيانات كل جهاز هتفضل عليه.">
            <span class="backup-act"><button type="button" class="btn danger" onClick=${() => form.run(async () => { await api('DELETE', '/account'); await endSync(); setAskOff(false); setNote('اتقفلت المزامنة واتمسحت نسختها.'); })}>أيوه، امسحها</button><button type="button" class="btn ghost" onClick=${() => setAskOff(false)}>لأ</button></span></${Notice}>`
          : html`<button type="button" class="btn ghost" onClick=${() => setAskOff(true)}>اقفل المزامنة وامسح نسختها</button>`}`;

    return html`<div class="sec">
      <div class="sec-head"><h2>المزامنة</h2></div>
      <div class="panel form">
        ${join ? html`<${Notice} title="الجدول على الحساب غير الجدول على الجهاز ده" line="هنحفظ نسخة احتياطية من الجهاز ده الأول، وبعدين تختار أنهي جدول يفضل. العلامات والمهام والتمارين من الاتنين بتفضل.">
            <span class="backup-act"><button type="button" class="btn primary" onClick=${() => form.run(async () => { downloadBackup(store, wk); await start(Object.assign(join, {keep: false})); })}>جدول الحساب</button>
              <button type="button" class="btn" onClick=${() => form.run(async () => { downloadBackup(store, wk); await start(Object.assign(join, {keep: true})); })}>جدول الجهاز ده</button></span></${Notice}>` : body}
        ${form.err ? html`<p class="form-err" role="alert">${form.err}</p>` : null}
        <div aria-live="polite">${note ? html`<p class="small">${note}</p>` : null}</div>
      </div>
    </div>`;
  }
