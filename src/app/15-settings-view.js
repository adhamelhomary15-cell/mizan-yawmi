  /* ---------------- Settings (import, status, reset) ---------------- */
  const MAX_SETTINGS_BYTES = 1024 * 1024;
  // Same order as tools/check-settings.js: size, empty, JSON, then the format rules.
  function checkSettingsText(text){
    if (text.length > MAX_SETTINGS_BYTES) return {ok:false, errors:[{code:'too-large', path:'file', detail:'file over 1 MB'}], warnings:[], settings:null};
    if (!text.trim()) return {ok:false, errors:[{code:'not-settings', path:'file', detail:'the file is empty'}], warnings:[], settings:null};
    let obj;
    try { obj = JSON.parse(text); } catch(e){ return {ok:false, errors:[{code:'not-settings', path:'file', detail:'not valid JSON'}], warnings:[], settings:null}; }
    return validateSettings(obj);
  }
  // Plain-language messages for the importer; only the first few problems are shown.
  function settingsMessages(res){
    const e = res.errors, has = c => e.some(x => x.code === c);
    if (has('too-large')) return ['الملف كبير أوي (أكتر من 1 ميجا).'];
    if (has('not-settings')) return ['ده مش ملف إعدادات للتطبيق (فاضي، أو مش JSON، أو الصيغة غلط).'];
    if (has('too-new')) return ['الملف ده معمول لنسخة أحدث من التطبيق.'];
    return e.slice(0, 5).map(x => x.path + ': ' + x.detail).concat(e.length > 5 ? ['وفيه ' + (e.length - 5) + ' مشاكل تانية.'] : []);
  }
  function summaryOf(s){
    const days = Object.keys(s.week), blocks = days.reduce((n, k) => { const b = s.week[k].blocks; return n + (Array.isArray(b) ? b.length : Object.keys(b).reduce((m, v) => m + b[v].length, 0)); }, 0);
    const lists = days.reduce((a, k) => { const b = s.week[k].blocks; return a.concat(Array.isArray(b) ? [b] : Object.keys(b).map(v => b[v])); }, []);
    const anchored = lists.reduce((n, l) => n + l.filter(b => b.length === 6).length, 0);
    const absorbing = lists.reduce((n, l) => n + l.filter(b => b.length === 6 && b[5] && b[5].absorb).length, 0);
    return {days: days.length, blocks, anchored, absorbing, course: s.course ? s.course.name : '', language: s.language, place: s.location.label || ''};
  }
  /* backup: saving a file to the owner's own device (the rules are in the "backup rules" block) */
  const BACKUP_META_KEY = 'mizan-backup-meta-v1';
  function readBackupMeta(){
    const m = readJSON(BACKUP_META_KEY);
    return m && typeof m.lastBackupAt === 'string' && !Number.isNaN(Date.parse(m.lastBackupAt)) ? m.lastBackupAt : null;
  }
  // What goes in a backup: the progress as the app holds it, the workout log (as stored, if a newer app wrote it, so
  // it is never lost), and the imported settings only when they exist and are valid; the example is never saved.
  function backupParts(store, wk){
    let settings = null;
    if (!LOADED.isExample) {
      const r = validateSettings(storedData('settings'));
      if (r.ok) settings = r.settings;
    }
    let workouts = wk.data;
    if (wk.tooNew) workouts = storedData('workouts') || workouts;
    return {progress: store, workouts, settings};
  }
  // Asking the browser to keep this site's data. Reading the state never prompts. Chromium and Safari decide a
  // persist() request silently; Firefox shows the user a prompt for it, so there it is asked only from the button.
  // Firefox is told by its user-agent token (InstallTrigger is gone from recent versions).
  const IS_FIREFOX = (() => { try { return /\bFirefox\//.test(navigator.userAgent || ''); } catch(e){ return false; } })();
  async function storageStatus(){
    try {
      if (!navigator.storage || typeof navigator.storage.persisted !== 'function') return 'unsupported';
      return (await navigator.storage.persisted()) ? 'kept' : 'may-clear';
    } catch(e){ return 'unsupported'; }
  }
  async function askPersist(){
    try { if (navigator.storage && typeof navigator.storage.persist === 'function') await navigator.storage.persist(); } catch(e){}
    return storageStatus();
  }
  // Once per start, where the browser decides on its own.
  const STORAGE_READY = storageStatus().then(s => s === 'may-clear' && !IS_FIREFOX ? askPersist() : s);
  const STORAGE_LINES = {
    'kept': 'المتصفح هيحتفظ ببياناتك لحد ما انت تمسحها.',
    'may-clear': 'المتصفح ممكن يمسح البيانات لو المساحة قلت. احفظ نسخة احتياطية.',
    'unsupported': 'المتصفح ده مش بيقول إذا كان هيحتفظ بالبيانات. احفظ نسخة احتياطية.'
  };
  // The extra copy in IndexedDB (feature 013).
  const COPY_LINES = {
    'on': 'فيه نسخة تانية من بياناتك على الجهاز، وصورة منها لكل يوم من آخر 7 أيام.',
    'off': 'المتصفح ده مش بيسمح بنسخة تانية على الجهاز، فاحفظ نسخة احتياطية من وقت للتاني.',
    'failed': 'النسخة التانية على الجهاز مش بتتحفظ دلوقتي. احفظ نسخة احتياطية.'
  };
  function StorageLine(){
    const [st, setSt] = useState(null);
    const [asking, setAsking] = useState(false);
    useEffect(() => { let live = true; STORAGE_READY.then(s => { if (live) setSt(s); }); return () => { live = false; }; }, []);
    const [copy, setCopy] = useState(null);
    useEffect(() => { let live = true; openMirror().then(() => { if (live) setCopy(mirrorState); }); return () => { live = false; }; }, []);
    if (!st) return null;
    const ask = async () => { setAsking(true); const s = await askPersist(); setSt(s); setAsking(false); };
    return html`<div class="storage-line" aria-live="polite">
      <p class="small">${STORAGE_LINES[st]}</p>
      ${copy ? html`<p class="small">${COPY_LINES[copy] || COPY_LINES.on}</p>` : null}
      ${st === 'may-clear' && IS_FIREFOX ? html`<span class="backup-act"><button type="button" class="btn" disabled=${asking} onClick=${ask}>اطلب من المتصفح يحتفظ بالبيانات</button></span>` : null}
    </div>`;
  }

  const RESTORE_SYNC_LATE_KEY = 'mizan-restore-sync-late';
  const BACKUP_REFUSALS = {
    'too-large': 'الملف كبير أوي على إنه نسخة احتياطية.',
    'empty': 'ده مش ملف نسخة احتياطية من ميزان يومي.',
    'not-json': 'ده مش ملف نسخة احتياطية من ميزان يومي.',
    'not-backup': 'ده مش ملف نسخة احتياطية من ميزان يومي.',
    'settings-file': 'ده ملف إعدادات. استورده من «استيراد ملف إعدادات».',
    'too-new': 'النسخة دي معمولة بنسخة أحدث من التطبيق. حدّث التطبيق الأول.',
    'damaged': 'الملف ده بايظ أو اتعدّل، فمش هسترجع منه حاجة.'
  };
  // Restore: read and check the file, show what it holds, and only on «استرجع» replace the device's data with it,
  // all or nothing. The progress goes in exactly as the file has it; no mark is made here.
  // A daily snapshot as backup-file text, so it goes through the same checks, preview and restore as a file.
  function snapshotAsBackup(snap){
    const data = n => { const c = openEnvelope(snap.stores[n], n); return c.ok ? c.data : null; };
    const at = Date.parse((snap.stores.progress || {}).savedAt) || Date.now();
    return makeBackup({progress: data('progress') || EMPTY(), workouts: data('workouts') || EMPTY_WORKOUTS(), settings: data('settings')}, at, snap.day).text;
  }
  function RestorePart({wk, sync, replaceAll, when}){
    const [pending, setPending] = useState(null);   // the result of readBackup when it is ok
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const inputRef = useRef(null), noRef = useRef(null), errRef = useRef(null);
    useEffect(() => { if (err && errRef.current) { try { errRef.current.focus(); } catch(e){} } }, [err]);
    const cancel = () => { setPending(null); if (inputRef.current) { inputRef.current.value = ''; try { inputRef.current.focus(); } catch(e){} } };
    useEffect(() => {
      if (!pending) return;
      if (noRef.current) noRef.current.focus();
      const key = e => { if (e.key === 'Escape' && !busy) cancel(); };
      document.addEventListener('keydown', key);
      return () => document.removeEventListener('keydown', key);
    }, [pending, busy]);
    const refuse = code => { setPending(null); setErr(BACKUP_REFUSALS[code] || BACKUP_REFUSALS['not-backup']); if (inputRef.current) inputRef.current.value = ''; };
    const consider = text => {
      const res = readBackup(text, {normalize, normalizeRoot, validateSettings});
      if (res.ok) setPending(res); else refuse(res.code);
    };
    const [days, setDays] = useState([]);
    useEffect(() => { let live = true; listSnapshots().then(l => { if (live) setDays(l); }); return () => { live = false; }; }, []);
    const fromDay = snap => { setErr(''); consider(snapshotAsBackup(snap)); };
    const onFile = e => {
      const f = e.target.files && e.target.files[0];
      setPending(null); setErr('');
      if (!f) return;
      if (f.size > BACKUP_MAX_BYTES) { refuse('too-large'); return; }
      const r = new FileReader();
      r.onload = () => consider(String(r.result || ''));
      r.onerror = () => refuse('not-backup');
      r.readAsText(f);
    };
    const apply = async () => {
      if (!pending || busy) return;
      if (wk.tooNew) { setPending(null); setErr('بيانات التمارين على الجهاز ده من نسخة أحدث من التطبيق، فمش هقدر أستبدلها.'); return; }
      const p = pending.parts, keys = STORE_NAMES.map(n => STORE_KEYS[n]), raw = {};
      // A backup holds the stores' data; it goes through the same migrations as stored data (checking progress
      // again only sets aside what is broken), and is written as envelopes.
      const progress = migrate('progress', 1, p.progress);
      if (!progress.ok) { setPending(null); setErr('الاسترجاع فشل ومفيش حاجة اتغيّرت.'); return; }
      const now = Date.now(), seal = (n, d) => JSON.stringify(sealStore(n, CURRENT_VERSION[n], d, now));
      try { keys.forEach(k => { raw[k] = localStorage.getItem(k); }); }
      catch(e){ setPending(null); setErr('الاسترجاع فشل ومفيش حاجة اتغيّرت.'); return; }
      setBusy(true);
      try {
        localStorage.setItem(STORE_KEYS.progress, seal('progress', progress.data));
        localStorage.setItem(STORE_KEYS.workouts, seal('workouts', p.workouts));
        if (p.settingsValid === 'valid') localStorage.setItem(STORE_KEYS.settings, seal('settings', p.settings));
      } catch(e){
        // put every key back as it was, so a half-written restore never stays
        keys.forEach(k => { try { if (raw[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, raw[k]); } catch(e2){} });
        setBusy(false); setPending(null); setErr('الاسترجاع فشل ومفيش حاجة اتغيّرت.');
        return;
      }
      // The synced copy loads first on start, so it gets the restored progress before the reload (up to 5 seconds).
      const synced = await Promise.race([replaceAll(progress.data), new Promise(res => setTimeout(() => res(false), 5000))]);
      if (!synced) { try { sessionStorage.setItem(RESTORE_SYNC_LATE_KEY, '1'); } catch(e){} }
      location.reload();
    };
    const pv = pending && pending.preview;
    return html`<div class="restore">
      <label class="field wide" for="backup-file">اختار ملف النسخة الاحتياطية<input id="backup-file" ref=${inputRef} type="file" accept=".json,application/json" disabled=${busy} onChange=${onFile} /></label>
      ${days.length ? html`<div class="snap-days"><p class="small"><b>نسخ الأيام اللي فاتت</b> · نسخة من بداية كل يوم من آخر 7 أيام. اختار يوم تشوف اللي فيه قبل ما ترجّعه.</p>
        <span class="backup-act">${days.map(d => html`<button type="button" class="btn" key=${d.day} disabled=${busy} onClick=${() => fromDay(d)}>${dateLabel(d.day)}</button>`)}</span></div>` : null}
      <div aria-live="polite">
        ${err ? html`<${Notice} role="alert" focusRef=${errRef} text=${err} />` : null}
        ${pv ? html`<div class="notice restore-preview" role="group" aria-label="معاينة النسخة الاحتياطية"><p>
            <b>نسخة من <bdi>${when(pv.createdAt)}</bdi></b>
            <span class="small"><bdi>${pv.tasks}</bdi> مهمة · <bdi>${pv.appts}</bdi> ميعاد · <bdi>${pv.courses}</bdi> كورس · <bdi>${pv.tickDays}</bdi> يوم فيه علامات · <bdi>${pv.workouts}</bdi> تمرينة</span>
            ${pv.openWorkout ? html`<span class="small">فيه تمرينة مفتوحة</span>` : null}
            <span class="small">${pv.settings === 'valid' ? 'فيها إعدادات' : pv.settings === 'none' ? 'مفيهاش إعدادات، إعداداتك الحالية هتفضل' : 'الإعدادات اللي فيها مش صالحة، إعداداتك الحالية هتفضل'}</span>
            <span class="small"><b>الاسترجاع هيستبدل كل بياناتك على الجهاز ده بالنسخة دي.</b>${sync === 'cloud' ? ' وهيتغيّر كمان في النسخة المتزامنة' : ''}</span>
            ${busy ? html`<span class="small" role="status">بسترجع…</span>` : null}
          </p>
          <span class="backup-act"><button type="button" class="btn danger" disabled=${busy} onClick=${apply}>استرجع</button><button type="button" class="btn" ref=${noRef} disabled=${busy} onClick=${cancel}>لأ</button></span>
        </div>` : null}
      </div>
    </div>`;
  }

  const BACKUP_FAILED = 'مقدرتش أحفظ الملف. افتح التطبيق في المتصفح العادي وجرّب تاني';
  function buildBackup(store, wk){
    const now = Date.now(), b = makeBackup(backupParts(store, wk), now, zoneParts(new Date(now)).iso);
    return {b, now, file: new File([b.text], b.name, {type: 'application/json'})};
  }
  // Records the time of the last backup; returns it as ISO text.
  function rememberBackup(now){
    const at = new Date(now).toISOString();
    writeJSON(BACKUP_META_KEY, {lastBackupAt: at});
    return at;
  }
  // Saves a JSON file to the device; throws when the browser cannot.
  function downloadText(name, text){
    const url = URL.createObjectURL(new File([text], name, {type: 'application/json'})), a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  // Saves a backup file of what is on screen. Used by the backup section and by the save-failure notice in App.
  function downloadBackup(store, wk){
    try {
      const {b, now} = buildBackup(store, wk);
      downloadText(b.name, b.text);
      return {ok: true, name: b.name, at: rememberBackup(now)};
    } catch(e){ return {ok: false}; }
  }
  // Saves the schedule in use as a settings file that «استيراد ملف إعدادات» takes back.
  function exportSettings(){
    const name = 'mizan-settings-' + zoneParts(new Date()).iso + '.json';
    try { downloadText(name, JSON.stringify(CFG, null, 2) + '\n'); return {ok: true, name}; } catch(e){ return {ok: false}; }
  }
  function BackupSection({store, wk, sync, replaceAll}){
    const [last, setLast] = useState(readBackupMeta);
    const [msg, setMsg] = useState(null);   // {ok, text}
    const build = () => buildBackup(store, wk);
    const remember = now => setLast(rememberBackup(now));
    const failed = () => setMsg({ok: false, text: BACKUP_FAILED});
    const save = () => {
      const r = downloadBackup(store, wk);
      if (!r.ok) { failed(); return; }
      setLast(r.at);
      setMsg({ok: true, name: r.name});
    };
    // The system share sheet, only where the device can share files, and only on this tap.
    let canShare = false;
    try { canShare = !!(navigator.canShare && navigator.canShare({files: [new File(['{}'], 'x.json', {type: 'application/json'})]})); } catch(e){}
    const share = async () => {
      let built;
      try { built = build(); } catch(e){ failed(); return; }
      try { await navigator.share({files: [built.file]}); remember(built.now); setMsg({ok: true, name: built.b.name}); }
      catch(e){ if (!e || e.name !== 'AbortError') failed(); }
    };
    const when = iso => { const p = zoneParts(new Date(iso)); return dateLabel(p.iso) + ' · ' + fmtStr(p.min); };
    return html`<div class="sec">
      <div class="sec-head"><h2>نسخة احتياطية</h2></div>
      <div class="panel form">
        <${StorageLine} />
        <p class="small">${last ? html`آخر نسخة: <bdi>${when(last)}</bdi>` : 'لسه ما عملتش نسخة احتياطية على الجهاز ده'}</p>
        <span class="backup-act"><button type="button" class="btn primary" onClick=${save}>احفظ نسخة احتياطية</button>${canShare ? html`<button type="button" class="btn" onClick=${share}>ابعتها لمكان تاني</button>` : null}</span>
        <p class="small muted">الملف فيه بياناتك الشخصية. خليه في مكان آمن ومتبعتهوش لحد.</p>
        <div aria-live="polite">${msg ? (msg.ok ? html`<p class="small">اتحفظت النسخة: <bdi dir="ltr">${msg.name}</bdi></p>` : html`<${Notice} role="alert" text=${msg.text} />`) : null}</div>
        <${RestorePart} wk=${wk} sync=${sync} replaceAll=${replaceAll} when=${when} />
      </div>
    </div>`;
  }

  function SettingsView({store, wk, sync, replaceAll}){
    const [pending, setPending] = useState(null);
    const [msgs, setMsgs] = useState([]);
    const [done, setDone] = useState('');
    const [askReset, setAskReset] = useState(false);
    const [exported, setExported] = useState(null);   // {ok, name}
    const msgRef = useRef(null);
    useEffect(() => { if (msgs.length && msgRef.current) { try { msgRef.current.focus(); } catch(e){} } }, [msgs]);
    const onFile = e => {
      const f = e.target.files && e.target.files[0];
      setPending(null); setMsgs([]); setDone('');
      if (!f) return;
      if (f.size > MAX_SETTINGS_BYTES) { setMsgs(['الملف كبير أوي (أكتر من 1 ميجا).']); return; }
      const r = new FileReader();
      r.onload = () => {
        const res = checkSettingsText(String(r.result || ''));
        if (!res.ok) { setMsgs(settingsMessages(res)); return; }
        setPending({settings: res.settings, warnings: res.warnings.length});
      };
      r.onerror = () => setMsgs(['مقدرتش أقرا الملف.']);
      r.readAsText(f);
    };
    const apply = () => {
      if (!saveStore('settings', pending.settings)) { setMsgs(['المتصفح ده مش بيسمح بالحفظ، فالإعدادات مش هتتخزن.']); return; }
      location.reload();
    };
    const reset = async () => {
      await removeStore('settings');
      location.reload();
    };
    // The schedule editor is a screen of Settings; an unsaved draft brings it back (see editorSession).
    const [screen, setScreen] = useState(() => editorSession ? 'editor' : guideRequested ? 'guide' : 'main');
    useEffect(() => { guideRequested = false; }, []);
    const edit = () => { openEditor(); setScreen('editor'); };
    if (screen === 'editor') return html`<${ScheduleEditor} onClose=${() => setScreen('main')} />`;
    if (screen === 'guide') return html`<${Guide} onClose=${() => setScreen('main')} onEditor=${() => setScreen('editor')} />`;
    const sm = pending ? summaryOf(pending.settings) : null;
    return html`<div class="settingsv">
      <div class="top a-head"><div class="top-meta"><h1>الإعدادات</h1><p class="sub">جدولك ومواقيت الصلاة واللغة، بتتخزن على الجهاز ده بس</p></div></div>
      <div class="sec">
        <div class="sec-head"><h2>المستخدم دلوقتي</h2></div>
        <div class="panel">
          <p><b>${LOADED.isExample ? 'جدول مثال عام' : (CFG.name || 'إعداداتي')}</b></p>
          <p class="small muted">${LOADED.isExample ? 'مفيش ملف إعدادات متخزن. استورد ملفك عشان التطبيق يبقى بتاعك.' : 'الإعدادات دي متخزنة على الجهاز ده وبتشتغل من غير نت.'}${LOADED.problem ? ' (الإعدادات المتخزنة مكنتش صالحة فبنعرض المثال.)' : ''}</p>
          <p class="small muted">الموقع: <bdi>${CFG.location.label || '—'}</bdi> · الطريقة: <bdi>${CFG.prayerMethod}</bdi> · اللغة: <bdi>${CFG.language}</bdi></p>
        </div>
      </div>
      <div class="sec">
        <div class="sec-head"><h2>جدولك</h2></div>
        <div class="panel">
          <p class="small muted">عدّل البلوكات والأنواع والمواد من هنا، من غير ملف. مفيش حاجة بتتغيّر غير لما تحفظ.</p>
          <span class="backup-act"><button type="button" class="btn primary" onClick=${edit}>عدّل الجدول</button><button type="button" class="btn" onClick=${() => setScreen('guide')}>اعمل جدولك من الأول</button><button type="button" class="btn" onClick=${() => setExported(exportSettings())}>صدّر جدولي كملف</button></span>
          <div aria-live="polite">${exported ? (exported.ok ? html`<p class="small">اتحفظ الجدول: <bdi dir="ltr">${exported.name}</bdi>. تقدر تستورده على أي جهاز من «استيراد ملف إعدادات».</p>` : html`<${Notice} role="alert" text="المتصفح ده مش بيسمح بحفظ الملف." />`) : null}</div>
        </div>
      </div>
      <div class="sec">
        <div class="sec-head"><h2>استيراد ملف إعدادات</h2></div>
        <div class="panel form">
          <label class="field wide" for="settings-file">اختار ملف الإعدادات (JSON)<input id="settings-file" type="file" accept=".json,application/json" onChange=${onFile} /></label>
          <p class="small muted">الملف بيتقرا على جهازك بس ومبيتبعتش لأي مكان. التقدم والعلامات والمهام مش بتتأثر.</p>
          <div aria-live="polite">
            ${msgs.length ? html`<${Notice} role="alert" focusRef=${msgRef} title="مقدرتش أستورد الملف" text=${msgs.map(m => html`<span class="small"><bdi>${m}</bdi></span>`)} />` : null}
            ${sm ? html`<div class="notice"><p><b>جاهز للاستيراد: ${pending.settings.name || 'من غير اسم'}</b>
              <span class="small">${sm.days} أيام · ${sm.blocks} بلوك${sm.anchored ? ' · ' + sm.anchored + ' بلوك مربوط بالصلاة' : ''}${sm.absorbing ? ' · ' + sm.absorbing + ' بلوك بياخد فرق الصلاة' : ''}${sm.course ? ' · كورس: ' : ''}${sm.course ? html`<bdi>${sm.course}</bdi>` : null} · الموقع: <bdi>${sm.place || '—'}</bdi> · اللغة: <bdi>${sm.language}</bdi>${pending.warnings ? ' · فيه ' + pending.warnings + ' حقول مش معروفة هتتجاهل' : ''}</span>
              <span class="small muted">${LOADED.isExample ? 'هيحل محل المثال.' : 'هيحل محل الإعدادات الحالية (' + (CFG.name || 'من غير اسم') + ').'}</span></p>
              <span><button type="button" class="btn primary" onClick=${apply}>استبدل</button> <button type="button" class="btn ghost" onClick=${() => setPending(null)}>إلغاء</button></span></div>` : null}
          </div>
        </div>
      </div>
      <div class="sec">
        <div class="sec-head"><h2>مصدر رسومات التمارين</h2></div>
        <div class="panel">
          <p class="small">رسومات التمارين الأصلية من <a href="https://github.com/bryllim/workout-guide" target="_blank" rel="noopener noreferrer">Workout Guide</a>، للفنان Bryl Lim، وبعض الأطر مبنية على أعمال Everkinetic. الرسومات مرخصة بموجب <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. الكود والوثائق من Workout Guide مرخصة <a href="https://github.com/bryllim/workout-guide/blob/main/LICENSES.md" target="_blank" rel="noopener noreferrer">MIT</a>.</p>
          <p class="small muted">نسب المصدر: Original exercise artwork by Everkinetic, expanded by Bryl Lim, licensed under CC BY-SA 4.0.</p>
        </div>
      </div>
      <${BackupSection} store=${store} wk=${wk} sync=${sync} replaceAll=${replaceAll} />
      ${LOADED.isExample ? null : html`<div class="sec">
        <div class="sec-head"><h2>رجوع للمثال</h2></div>
        <div class="panel">
          <p class="small muted">بيمسح الإعدادات المتخزنة بس. علاماتك ومهامك وتقدمك بيفضلوا زي ما هم.</p>
          ${askReset ? html`<${Notice} title="تأكيد: ترجع للجدول المثال؟"><span><button type="button" class="btn danger" onClick=${reset}>أيوه، ارجع للمثال</button> <button type="button" class="btn ghost" onClick=${() => setAskReset(false)}>لأ</button></span></${Notice}>`
            : html`<button type="button" class="btn" onClick=${() => setAskReset(true)}>رجّع المثال</button>`}
        </div>
      </div>`}
    </div>`;
  }

