  /* ---------------- settings: load (stored file, else the embedded example) ---------------- */
  const LOADED = (() => {
    let example = null;
    try { example = validateSettings(JSON.parse(document.getElementById('example-settings').textContent)).settings; } catch(e){}
    if (!example) example = {format:'mizan-settings', version:1, language:'ar', prayerMethod:'Egyptian', timezone:'Africa/Cairo', location:{lat:30.0444, lng:31.2357, label:'Sample city'}, categories:{rest:{label:'راحة', track:false}}, week:{0:{blocks:[['08:00','rest','مثال']]}}};
    const got = loadStore('settings');
    if (got.state === 'empty') return {settings: example, isExample: true, problem: false, got};
    const res = got.state === 'ok' ? validateSettings(got.data) : null;
    if (res && res.ok) return {settings: res.settings, isExample: false, problem: false, got};
    return {settings: example, isExample: true, problem: true, got};
  })();
  const CFG = LOADED.settings;
  // Settings are read once per page. When the local copy was missing or damaged and the mirror brings them back, write
  // them back and open the page again with them, once, saying so.
  const RECOVERED_KEY = 'mizan-recovered';
  reconcile('settings', LOADED.got.state === 'empty' || LOADED.got.state === 'damaged').then(r => {
    if (!r || !r.recovered) return;
    try { sessionStorage.setItem(RECOVERED_KEY, '1'); } catch(e){}
    location.reload();
  });

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
  const CATS = {};
  Object.keys(DEFAULT_CATS).forEach(k => { CATS[k] = Object.assign({}, DEFAULT_CATS[k], (CFG.categories || {})[k]); });
  // Kinds the user added (feature 016), after the built-in ones, by number; a missing long name is the name.
  const NEW_KINDS = Object.keys(CFG.categories || {}).filter(k => /^k\d+$/.test(k)).sort((a, b) => a.slice(1) - b.slice(1));
  NEW_KINDS.forEach(k => { CATS[k] = Object.assign({long: CFG.categories[k].label}, CFG.categories[k]); });
  const KIND_IDS = Object.keys(DEFAULT_CATS).concat(NEW_KINDS);
  const SUBJ = CFG.subjects || {};
  // A day's blocks (from the settings) are [start, category, title ("Subject|action" splits), detail, subject].
  // Each block ends where the next starts; the last ends at the end of the day.
  const SCHED = CFG.week || {};
  const COURSE = CFG.course ? {name: CFG.course.name, sub: CFG.course.sub || ''} : null;
  const PLAN = CFG.course ? CFG.course.plan : [];
  const TASK_TAGS = Object.assign({uni:CATS.uni.label, course:CATS.course.label, work:CATS.work.label, personal:CATS.personal.label}, CFG.taskTags || {});
  const RULES = CFG.rules || [];
  // Names of the two sides of the balance card, built from the category labels.
  const BAL_A = CATS.uni.label + ' و' + CATS.course.label, BAL_B = CATS.work.label + ' و' + CATS.personal.label;

