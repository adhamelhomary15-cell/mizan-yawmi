  /* ---------------- storage: db (per-person) with local fallback ---------------- */
  const LOCAL_KEY = 'fall26-planner-v1';
  const LOCAL_OK = (() => { try { localStorage.setItem('__probe', '1'); localStorage.removeItem('__probe'); return true; } catch(e){ return false; } })();
  const EMPTY = () => ({v:1, checks:{}, modules:{}, tasks:[], appts:[], courses:[], mainCourse:BUILTIN_ID, extras:{}, phaseSeen:null});
  const isISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const isHM = s => typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);
  function normalize(d){
    const e = EMPTY();
    if (!d || typeof d !== 'object') return e;
    const courses = Array.isArray(d.courses) ? d.courses.filter(c => c && typeof c.id === 'string' && typeof c.name === 'string' && isISO(c.from) && isISO(c.to) && Array.isArray(c.modules) && c.modules.length) : [];
    courses.forEach(c => { if (!c.done || typeof c.done !== 'object') c.done = {}; });
    const main = typeof d.mainCourse === 'string' && (d.mainCourse === BUILTIN_ID || courses.some(c => c.id === d.mainCourse)) ? d.mainCourse : BUILTIN_ID;
    const extras = {};
    if (d.extras && typeof d.extras === 'object') Object.keys(d.extras).forEach(k => {
      if (!isISO(k) || !Array.isArray(d.extras[k])) return;
      const list = d.extras[k].filter(x => x && typeof x.id === 'string' && isHM(x.s) && isHM(x.e) && CATS[x.cat] && typeof x.title === 'string');
      if (list.length) extras[k] = list;
    });
    return {v:1, checks: d.checks && typeof d.checks === 'object' ? d.checks : {}, modules: d.modules && typeof d.modules === 'object' ? d.modules : {}, tasks: Array.isArray(d.tasks) ? d.tasks : [], appts: Array.isArray(d.appts) ? d.appts : [], courses, mainCourse: main, extras, phaseSeen: d.phaseSeen === 'A' || d.phaseSeen === 'B' ? d.phaseSeen : null};
  }
  function loadLocal(){ try { const r = localStorage.getItem(LOCAL_KEY); return r ? normalize(JSON.parse(r)) : null; } catch(e){ return null; } }
  // true when the write went through, false when the browser refused it (storage full, private mode, blocked)
  function saveLocal(s){ try { localStorage.setItem(LOCAL_KEY, JSON.stringify(s)); return true; } catch(e){ return false; } }
  const hasData = s => Object.keys(s.checks).length || Object.keys(s.modules).length || s.tasks.length || s.appts.length || s.courses.length || Object.keys(s.extras).length;
  const uid36 = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

  function useStore(){
    const [store, setStore] = useState(() => loadLocal() || EMPTY());
    const [sync, setSync] = useState('local');
    // true after a write to this device failed, until the next one succeeds (the notice in App reads it)
    const [saveFailed, setSaveFailed] = useState(!LOCAL_OK);
    const noteSave = ok => setSaveFailed(f => f === !ok ? f : !ok);
    const latest = useRef(store), ref = useRef(null), timer = useRef(null), chain = useRef(Promise.resolve());

    function flush(){
      timer.current = null;
      const r = ref.current; if (!r) return;
      const body = JSON.parse(JSON.stringify(latest.current));
      chain.current = chain.current.then(() => r.set(body)).catch(err => {
        if (err && err.code === 'unavailable'){
          setTimeout(() => { if (!timer.current) timer.current = setTimeout(flush, 0); }, 1200 + Math.random()*800);
        } else { ref.current = null; setSync('local'); }
      });
    }
    function queue(delay){
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay == null ? 600 : delay);
    }
    function update(fn){
      const next = normalize(fn(JSON.parse(JSON.stringify(latest.current))));
      latest.current = next; setStore(next); noteSave(saveLocal(next));
      if (ref.current) queue();
    }
    // A restore: the whole progress at once, and, when a synced copy is active, written there now rather than
    // after the usual delay. Resolves true when that write finished (or there is no synced copy), false if it failed.
    function replaceAll(nextRaw){
      const next = normalize(nextRaw);
      latest.current = next; setStore(next); noteSave(saveLocal(next));
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      const r = ref.current;
      if (!r) return Promise.resolve(true);
      const body = JSON.parse(JSON.stringify(next));
      const p = chain.current.then(() => r.set(body));
      chain.current = p.catch(() => {});
      return p.then(() => true, () => false);
    }

    useEffect(() => {
      let unsub = null, dead = false;
      (async () => {
        try {
          if (!window.claude || typeof claude.use !== 'function') return;
          const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
          const id = user ? await user.id() : null;
          if (!db || !id || dead) return;
          const docRef = db.doc('data/users/' + id + '/tracker');
          let first = true;
          unsub = docRef.onSnapshot(snap => {
            if (snap.metadata && snap.metadata.hasPendingWrites) return;
            ref.current = docRef;
            setSync('cloud');
            if (timer.current) return;
            if (first){
              first = false;
              if (!snap.exists){ if (hasData(latest.current)) queue(0); return; }
            }
            if (!snap.exists) return;
            const next = normalize(snap.data());
            if (JSON.stringify(next) !== JSON.stringify(latest.current)){
              latest.current = next; setStore(next); noteSave(saveLocal(next));
            }
          }, () => { ref.current = null; setSync('local'); });
        } catch(e){ setSync('local'); }
      })();
      return () => { dead = true; if (unsub) unsub(); };
    }, []);

    return [store, update, sync, replaceAll, saveFailed];
  }

