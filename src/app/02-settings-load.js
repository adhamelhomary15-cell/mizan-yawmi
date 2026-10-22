  /* ---------------- settings: load (stored file, else the embedded example) ---------------- */
  // What a page load reads: the stored settings when they are valid, else the example (marked as a problem when stored
  // settings could not be used). The shell reads again after a save, an import or a reset (feature 020).
  function readSettings(){
    let example = null;
    try { example = validateSettings(JSON.parse(document.getElementById('example-settings').textContent)).settings; } catch(e){}
    if (!example) example = {format:'mizan-settings', version:1, language:'ar', prayerMethod:'Egyptian', timezone:'Africa/Cairo', location:{lat:30.0444, lng:31.2357, label:'Sample city'}, categories:{rest:{label:'راحة', track:false}}, week:{0:{blocks:[['08:00','rest','مثال']]}}};
    const got = loadStore('settings');
    if (got.state === 'empty') return {settings: example, example, isExample: true, problem: false, got};
    const res = got.state === 'ok' ? validateSettings(got.data) : null;
    // fromExample: the example stored with the history after «رجّع المثال»; keptAside: kept weeks the checks set
    // aside, which stay in the stored copy (feature 021)
    if (res && res.ok) return {settings: res.settings, example, isExample: !!res.settings.fromExample, problem: false, got,
      keptAside: res.warnings.filter(w => w.code === 'history-entry').length};
    return {settings: example, example, isExample: true, problem: true, got};
  }

  /* ---------------- fixed names (weekdays) ---------------- */
  const DAY_NAMES = {6:'السبت',0:'الحد',1:'الاتنين',2:'التلات',3:'الأربع',4:'الخميس',5:'الجمعة'};
  const DAY_SHORT = {6:'سبت',0:'حد',1:'اتنين',2:'تلات',3:'أربع',4:'خميس',5:'جمعة'};
  const WEEK_ORDER = [6,0,1,2,3,4,5];

  /* ---------------- data derived from settings ---------------- */
  // Missing categories fall back to these generic labels so every category id always has a label.
  const DEFAULT_CATS = {
    uni:{label:'محاضرات', long:'حضور المحاضرات', track:true},
    study:{label:'مذاكرة', long:'مذاكرة', track:true},
    course:{label:'كورس', long:'الكورس', track:true},
    work:{label:'شغل', long:'الشغل', track:true},
    gym:{label:'رياضة', long:'الرياضة', track:true},
    quran:{label:'ورد', long:'الورد اليومي', track:true},
    personal:{label:'وقتك', long:'وقتك الخاص', track:false},
    move:{label:'مواصلات', long:'مواصلات', track:false},
    rest:{label:'راحة', long:'راحة', track:false}
  };
  // Everything worked out from the settings. applySettings fills them all, when the page loads and after every change
  // (feature 020), so no screen keeps a value from the settings before.
  let LOADED;
  let CFG;
  let CATS;
  let NEW_KINDS;
  let KIND_IDS;
  let SUBJ;
  let dayCache;
  let COURSE;
  let PLAN;
  let TASK_TAGS;
  let RULES;
  let BAL_A;
  let BAL_B;
  let START;
  let END;
  let SPAN;
  let zoneFmt;
  let FAMILY;
  let AXIS_HOURS;
  let ptCache;
  function applySettings(loaded){
    LOADED = loaded;
    CFG = loaded.settings;
    CATS = {};
    Object.keys(DEFAULT_CATS).forEach(k => { CATS[k] = Object.assign({}, DEFAULT_CATS[k], (CFG.categories || {})[k]); });
    // Kinds the user added (feature 016), after the built-in ones, by number; a missing long name is the name.
    NEW_KINDS = Object.keys(CFG.categories || {}).filter(k => /^k\d+$/.test(k)).sort((a, b) => a.slice(1) - b.slice(1));
    NEW_KINDS.forEach(k => { CATS[k] = Object.assign({long: CFG.categories[k].label}, CFG.categories[k]); });
    KIND_IDS = Object.keys(DEFAULT_CATS).concat(NEW_KINDS);
    // A kind a kept week still uses but the settings no longer have (feature 021): its past blocks show under this
    // name, never tracked. It is not in KIND_IDS, so the editor and the Week rows do not list it.
    (CFG.history || []).forEach(h => Object.values(h.days).forEach(d => {
      if (d) (Array.isArray(d.blocks) ? [d.blocks] : Object.values(d.blocks)).forEach(list => list.forEach(b => {
        if (!CATS[b[1]]) CATS[b[1]] = {label: 'نوع اتمسح', long: 'نوع اتمسح', track: false};
      }));
    }));
    SUBJ = CFG.subjects || {};
    COURSE = CFG.course ? {name: CFG.course.name, sub: CFG.course.sub || ''} : null;
    PLAN = CFG.course ? CFG.course.plan : [];
    TASK_TAGS = Object.assign({uni:CATS.uni.label, course:CATS.course.label, work:CATS.work.label, personal:CATS.personal.label}, CFG.taskTags || {});
    RULES = CFG.rules || [];
    // Names of the two sides of the balance card, built from the category labels.
    BAL_A = CATS.uni.label + ' و' + CATS.course.label;
    BAL_B = CATS.work.label + ' و' + CATS.personal.label;
    // The user's day (feature 018): from the settings, or 07:00 to 01:00.
    ({start: START, end: END} = dayBounds(CFG.day));
    SPAN = END - START;
    // Date and minute of a moment in the time zone from the settings.
    zoneFmt = new Intl.DateTimeFormat('en-CA',{timeZone:CFG.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    // The balance side of each kind: the built-in ones as always, plus each added kind's own side.
    FAMILY = NEW_KINDS.reduce((f, k) => { if (CATS[k].side) f[k] = CATS[k].side; return f; }, {uni:'a', study:'a', course:'a', work:'b', gym:'b', quran:'b'});
    // The Week strip's hour labels: every 5 hours from the first full hour of the day (feature 018).
    AXIS_HOURS = Array.from({length: 6}, (_, i) => Math.ceil(START / 60) * 60 + i * 300).filter(m => m < END);
    // The saved schedule's prayer times, and the day in use on each date (feature 021), once per date, for these
    // settings only.
    ptCache = {};
    dayCache = {};
  }
  applySettings(readSettings());
  // When the local copy was missing or damaged and the mirror brings the settings back, write them back and open the
  // page again with them, once, saying so.
  const RECOVERED_KEY = 'mizan-recovered';
  reconcile('settings', LOADED.got.state === 'empty' || LOADED.got.state === 'damaged').then(r => {
    if (!r || !r.recovered) return;
    try { sessionStorage.setItem(RECOVERED_KEY, '1'); } catch(e){}
    location.reload();
  });

