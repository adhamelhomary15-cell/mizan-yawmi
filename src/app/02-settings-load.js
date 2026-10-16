  /* ---------------- settings: load (stored file, else the embedded example) ---------------- */
  const SETTINGS_KEY = 'mizan-settings-v1';
  const LOADED = (() => {
    let example = null;
    try { example = validateSettings(JSON.parse(document.getElementById('example-settings').textContent)).settings; } catch(e){}
    if (!example) example = {format:'mizan-settings', version:1, language:'ar', prayerMethod:'Egyptian', timezone:'Africa/Cairo', location:{lat:30.0444, lng:31.2357, label:'Sample city'}, categories:{rest:{label:'راحة', track:false}}, week:{0:{blocks:[['08:00','rest','مثال']]}}};
    let raw = null;
    try { raw = localStorage.getItem(SETTINGS_KEY); } catch(e){}
    if (!raw) return {settings: example, isExample: true, problem: false};
    try {
      const res = validateSettings(JSON.parse(raw));
      if (res.ok) return {settings: res.settings, isExample: false, problem: false};
    } catch(e){}
    return {settings: example, isExample: true, problem: true};
  })();
  const CFG = LOADED.settings;

  /* ---------------- fixed names (weekdays) ---------------- */
  const DAY_NAMES = {6:'السبت',0:'الحد',1:'الاتنين',2:'التلات',3:'الأربع',4:'الخميس',5:'الجمعة'};
  const DAY_SHORT = {6:'سبت',0:'حد',1:'اتنين',2:'تلات',3:'أربع',4:'خميس',5:'جمعة'};
  const WEEK_ORDER = [6,0,1,2,3,4,5];

  // A day's blocks (from the settings) are [start, category, title ("Subject|action" splits), detail, subject].
  // Each block ends where the next starts; the last ends at the end of the day.

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
  const SUBJ = CFG.subjects || {};
  const SCHED = CFG.week || {};
  const COURSE = CFG.course ? {name: CFG.course.name, sub: CFG.course.sub || ''} : {name:'Course', sub:''};
  const PLAN = CFG.course ? CFG.course.plan : [];
  const TASK_TAGS = Object.assign({uni:CATS.uni.label, course:CATS.course.label, work:CATS.work.label, personal:CATS.personal.label}, CFG.taskTags || {});
  const RULES = CFG.rules || [];
  // Names of the two sides of the balance card, built from the category labels.
  const BAL_A = CATS.uni.label + ' و' + CATS.course.label, BAL_B = CATS.work.label + ' و' + CATS.personal.label;

