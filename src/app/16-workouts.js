  /* ---------------- Workouts (own storage key and hook; knows nothing of the progress store) ---------------- */
  function loadWorkouts(){ try { return normalizeRoot(readRaw(WORKOUTS_KEY)); } catch(e){ return {root: EMPTY_WORKOUTS(), tooNew: false}; } }
  function useWorkouts(){
    const first = useRef(null);
    if (!first.current) first.current = loadWorkouts();
    const [data, setData] = useState(first.current.root);
    const [saveFailed, setSaveFailed] = useState(false);
    const latest = useRef(data);
    const tooNew = first.current.tooNew;
    // Data written by a newer app is never overwritten.
    const update = fn => {
      if (tooNew) return;
      const next = normalizeRoot(fn(JSON.parse(JSON.stringify(latest.current)))).root;
      latest.current = next; setData(next);
      setSaveFailed(!writeJSON(WORKOUTS_KEY, next));
    };
    return {data, update, tooNew, saveFailed};
  }
  const Dots = () => html`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>`;
  const BLANK_SET = () => ({w: '', r: '', done: false});

  // Alerts are feature-detected and need no permission. The audio context is made on the tap that marks a set done.
  let AUDIO = null;
  function primeAudio(){ try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; if (!AUDIO) AUDIO = new C(); if (AUDIO.state === 'suspended') AUDIO.resume(); } catch(e){} }
  function beep(){ try { if (!AUDIO) return; const o = AUDIO.createOscillator(), g = AUDIO.createGain(); o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(AUDIO.destination); o.start(); o.stop(AUDIO.currentTime + 0.25); } catch(e){} }
  function alertRestOver(sound){ try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch(e){} if (sound) beep(); }
  // One-second tick for the small parts that show a clock; refreshed when the page becomes visible again.
  function useNow(){
    const [n, setN] = useState(Date.now());
    useEffect(() => {
      const t = setInterval(() => setN(Date.now()), 1000), v = () => setN(Date.now());
      document.addEventListener('visibilitychange', v);
      return () => { clearInterval(t); document.removeEventListener('visibilitychange', v); };
    }, []);
    return n;
  }
  // Keeps the screen on while a workout is open, where the browser allows it; any failure is ignored.
  function WakeLock(){
    useEffect(() => {
      let lock = null, dead = false;
      const get = async () => {
        try {
          if (!navigator.wakeLock || document.visibilityState !== 'visible' || lock) return;
          const l = await navigator.wakeLock.request('screen');
          if (dead) { l.release().catch(() => {}); return; }
          lock = l; l.addEventListener('release', () => { if (lock === l) lock = null; });
        } catch(e){}
      };
      const vis = () => { if (document.visibilityState === 'visible') get(); };
      get(); document.addEventListener('visibilitychange', vis);
      return () => { dead = true; document.removeEventListener('visibilitychange', vis); try { if (lock) lock.release().catch(() => {}); } catch(e){} lock = null; };
    }, []);
    return null;
  }
  // The workout timer and the remaining rest, and the one-time alert when a rest ends.
  function WorkoutClock({cur, onOver}){
    useNow();
    const now = Date.now(), left = restLeft(cur.rest, now);
    useEffect(() => { if (cur.rest && !cur.rest.alerted && left <= 0) onOver(document.visibilityState === 'visible' && -left <= 10000); });
    return html`<p class="wk-meta"><bdi dir="ltr" class="num">${formatClock(elapsedMs(cur.startedAt, now))}</bdi>${left === null ? null : html` · راحة <bdi dir="ltr" class="num">${restLabel(left)}</bdi>`}</p>`;
  }
  function RestRow({rest, onAdd, onSkip}){
    useNow();
    const left = restLeft(rest, Date.now()), over = left <= 0;
    return html`<div class=${'wk-rest' + (over ? ' over' : '')} role="group" aria-label="مؤقّت الراحة">
      <span>${over ? 'خلصت الراحة ' : 'راحة '}<bdi dir="ltr" class="num">${restLabel(left)}</bdi></span>
      <span class="wk-rest-act"><button type="button" class="btn" onClick=${onAdd}>+15 ث</button><button type="button" class="btn ghost" onClick=${onSkip}>تخطّي</button></span>
    </div>`;
  }
  const Stopwatch = () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M9.5 3.5h5"/></svg>`;

  // A confirmation that stays in view at the bottom; focus starts on the safe choice and goes back to the
  // control that opened it when it closes.
  function Sheet({label, onClose, children}){
    const ref = useRef(null);
    useEffect(() => {
      const opener = document.activeElement;
      const b = ref.current && ref.current.querySelector('[data-first]'); if (b) b.focus();
      const key = e => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', key);
      return () => {
        document.removeEventListener('keydown', key);
        // after the closing render, if focus was lost with the sheet
        setTimeout(() => { try { if (opener && opener.isConnected && (!document.activeElement || document.activeElement === document.body)) opener.focus(); } catch(e){} }, 0);
      };
    }, []);
    return html`<div class="wk-sheet" role="dialog" aria-label=${label} ref=${ref}>${children}</div>`;
  }

  function ExercisePicker({all, onPick, onCreate, onBack}){
    const [q, setQ] = useState('');
    const [err, setErr] = useState('');
    const nq = normName(q);
    const shown = nq ? all.filter(x => normName(x.name).indexOf(nq) >= 0) : all;
    return html`<div class="wkv">
      <div class="wk-head">
        <button type="button" class="btn" onClick=${onBack}>رجوع</button>
        <h1 class="wk-title">ضيف تمرين</h1>
      </div>
      <label class="field"><span>دوّر أو اكتب اسم تمرين جديد</span>
        <input id="wk-search" type="text" value=${q} autocomplete="off" onInput=${e => { setQ(e.target.value); setErr(''); }} />
      </label>
      ${q.trim() ? html`<div><button type="button" class="btn primary" onClick=${() => setErr(onCreate(q) || '')}><${Plus} />ضيف تمرين جديد: <bdi>${q.trim()}</bdi></button>${err ? html`<p class="form-err" role="alert">${err}</p>` : null}</div>` : null}
      <div class="panel wk-picklist">
        ${shown.length ? shown.map(x => html`<button type="button" class="wk-pick" key=${x.id} onClick=${() => onPick(x.id)}><${ExerciseIllustration} exId=${x.id} name=${x.name} /><bdi>${x.name}</bdi></button>`) : html`<p class="empty">مفيش تمرين بالاسم ده. تقدر تضيفه من الزرار اللي فوق.</p>`}
      </div>
    </div>`;
  }

