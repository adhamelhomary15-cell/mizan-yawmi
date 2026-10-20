  /* ---------------- progress store: on the device through the storage path, plus the synced copy where there is one ---------------- */
  const LOCAL_OK = (() => { try { localStorage.setItem('__probe', '1'); localStorage.removeItem('__probe'); return true; } catch(e){ return false; } })();
  const EMPTY = () => ({v:1, checks:{}, modules:{}, tasks:[], appts:[], courses:[], mainCourse:SETTINGS_COURSE_ID, extras:{}, phaseSeen:null, askedUpTo:null, setAside:[]});
  const isISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const isHM = s => typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);
  function normalize(d){
    const e = EMPTY();
    if (!d || typeof d !== 'object') return e;
    const courses = Array.isArray(d.courses) ? d.courses.filter(c => c && typeof c.id === 'string' && typeof c.name === 'string' && isISO(c.from) && isISO(c.to) && Array.isArray(c.modules) && c.modules.length) : [];
    courses.forEach(c => { if (!c.done || typeof c.done !== 'object') c.done = {}; });
    const main = typeof d.mainCourse === 'string' && (d.mainCourse === SETTINGS_COURSE_ID || courses.some(c => c.id === d.mainCourse)) ? d.mainCourse : SETTINGS_COURSE_ID;
    const extras = {};
    if (d.extras && typeof d.extras === 'object') Object.keys(d.extras).forEach(k => {
      if (!isISO(k) || !Array.isArray(d.extras[k])) return;
      const list = d.extras[k].filter(x => x && typeof x.id === 'string' && isHM(x.s) && isHM(x.e) && CATS[x.cat] && typeof x.title === 'string');
      if (list.length) extras[k] = list;
    });
    return {v:1, checks: d.checks && typeof d.checks === 'object' ? d.checks : {}, modules: d.modules && typeof d.modules === 'object' ? d.modules : {}, tasks: Array.isArray(d.tasks) ? d.tasks : [], appts: Array.isArray(d.appts) ? d.appts : [], courses, mainCourse: main, extras, phaseSeen: d.phaseSeen === 'A' || d.phaseSeen === 'B' ? d.phaseSeen : null, askedUpTo: isISO(d.askedUpTo) ? d.askedUpTo : null, setAside: Array.isArray(d.setAside) ? d.setAside : []};
  }
  const saveLocal = s => saveStore('progress', s);
  const hasData = s => Object.keys(s.checks).length || Object.keys(s.modules).length || s.tasks.length || s.appts.length || s.courses.length || Object.keys(s.extras).length;
  const uid36 = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

  function useStore(){
    const first = useRef(null);
    if (!first.current) first.current = loadStore('progress');
    const opened = first.current;
    const [store, setStore] = useState(() => opened.state === 'ok' ? normalize(opened.data) : EMPTY());
    const [sync, setSync] = useState('local');
    // true after a write to this device failed, until the next one succeeds (the notice in App reads it)
    const [saveFailed, setSaveFailed] = useState(!LOCAL_OK);
    const noteSave = ok => setSaveFailed(f => f === !ok ? f : !ok);
    // What the app has to say about the stored data: null, 'damaged', 'too-new', 'failed' or 'recovered', and how many
    // entries a migration set aside. Data from a newer app, or that could not be brought forward, is never written over.
    const [health, setHealth] = useState({problem: opened.state === 'too-new' || opened.state === 'failed' ? opened.state : null, setAside: opened.setAside || 0});
    const locked = useRef(opened.state === 'too-new' || opened.state === 'failed');
    const latest = useRef(store), ref = useRef(null), timer = useRef(null), chain = useRef(Promise.resolve());
    const take = data => { const next = normalize(data); latest.current = next; setStore(next); };
    useEffect(() => {
      reconcile('progress', opened.state === 'empty' || opened.state === 'damaged', d => !!hasData(normalize(d))).then(r => {
        if (r && r.tooNew) { locked.current = true; setHealth(h => ({...h, problem: 'too-new'})); }
        else if (r && r.recovered) { take(r.recovered); setHealth(h => ({...h, problem: 'recovered'})); }
        // a damaged copy is only news once the mirror could not bring the data back
        else if (opened.state === 'damaged') setHealth(h => ({...h, problem: 'damaged'}));
      });
      return onOtherTab('progress', take);
    }, []);
    const dismissHealth = () => setHealth({problem: null, setAside: 0});

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
      if (locked.current) return;
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

    return [store, update, sync, replaceAll, saveFailed, {...health, dismiss: dismissHealth}];
  }

