  /* ---------------- progress store: on the device through the storage path; the synced copy is in 06b (feature 025) ---------------- */
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
    // true after a write to this device failed, until the next one succeeds (the notice in App reads it)
    const [saveFailed, setSaveFailed] = useState(!LOCAL_OK);
    const noteSave = ok => setSaveFailed(f => f === !ok ? f : !ok);
    // What the app has to say about the stored data: null, 'damaged', 'too-new', 'failed' or 'recovered', and how many
    // entries a migration set aside. Data from a newer app, or that could not be brought forward, is never written over.
    const [health, setHealth] = useState({problem: opened.state === 'too-new' || opened.state === 'failed' ? opened.state : null, setAside: opened.setAside || 0});
    const locked = useRef(opened.state === 'too-new' || opened.state === 'failed');
    const latest = useRef(store);
    const take = data => { const next = normalize(data); latest.current = next; setStore(next); };
    useEffect(() => {
      reconcile('progress', opened.state === 'empty' || opened.state === 'damaged', d => !!hasData(normalize(d))).then(r => {
        if (r && r.tooNew) { locked.current = true; setHealth(h => ({...h, problem: 'too-new'})); }
        else if (r && r.recovered) { take(r.recovered); setHealth(h => ({...h, problem: 'recovered'})); }
        // a damaged copy is only news once the mirror could not bring the data back
        else if (opened.state === 'damaged') setHealth(h => ({...h, problem: 'damaged'}));
      });
      const offTab = onOtherTab('progress', take), offSync = onSyncedIn('progress', take);
      return () => { offTab(); offSync(); };
    }, []);
    const dismissHealth = () => setHealth({problem: null, setAside: 0});

    function update(fn){
      if (locked.current) return;
      const next = normalize(fn(JSON.parse(JSON.stringify(latest.current))));
      latest.current = next; setStore(next); noteSave(saveLocal(next));
    }
    // A restore: the whole progress at once. The sync part sees it as any other save and sends it (feature 025).
    function replaceAll(nextRaw){
      const next = normalize(nextRaw);
      latest.current = next; setStore(next); noteSave(saveLocal(next));
      return Promise.resolve(true);
    }

    return [store, update, replaceAll, saveFailed, {...health, dismiss: dismissHealth}];
  }

