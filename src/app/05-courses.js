  /* ---------------- courses ---------------- */
  const SETTINGS_COURSE_ID = 'aa';
  const settingsCourse = () => ({id: SETTINGS_COURSE_ID, name: COURSE.name, sub: COURSE.sub, fromSettings: true, from: PLAN.length ? PLAN[0].from : '2000-01-01', to: PLAN.length ? PLAN[PLAN.length - 1].to : '2000-01-01'});
  const allCourses = store => [settingsCourse()].concat(store.courses);
  const courseById = (store, id) => allCourses(store).find(c => c.id === id) || settingsCourse();
  const mainCourse = store => courseById(store, store.mainCourse);
  function daysBetween(a, b){
    const [y1,m1,d1] = a.split('-').map(Number), [y2,m2,d2] = b.split('-').map(Number);
    return Math.round((Date.UTC(y2,m2-1,d2) - Date.UTC(y1,m1-1,d1)) / 86400000);
  }
  // Weeks of a course, each with its items as [number, title, extra, key].
  function planOf(c){
    if (c.fromSettings) return PLAN.map(w => ({from:w.from, to:w.to, label:w.label, note:w.note, items:w.items.map(it => [it[0], it[1], it[2] || null, it[0]])}));
    const mods = c.modules, M = mods.length;
    const n = Math.max(1, Math.ceil((daysBetween(c.from, c.to) + 1) / 7));
    const weeks = [];
    for (let k = 0; k < n; k++){
      const from = addDays(c.from, 7*k);
      let to = addDays(from, 6); if (to > c.to) to = c.to;
      const items = [];
      mods.forEach((m, i) => { if (Math.floor(i * n / M) === k) items.push([String(i + 1).padStart(2, '0'), m.title, null, m.id]); });
      if (items.length) weeks.push({from, to, label: dateLabel(from) + ' – ' + dateLabel(to), items});
    }
    return weeks;
  }
  const doneMap = (store, c) => c.fromSettings ? store.modules : (c.done || {});
  function toggleModule(update, c, key){
    update(s => {
      if (c.fromSettings){ if (s.modules[key]) delete s.modules[key]; else s.modules[key] = true; return s; }
      const x = s.courses.find(y => y.id === c.id); if (!x) return s;
      x.done = x.done || {};
      if (x.done[key]) delete x.done[key]; else x.done[key] = true;
      return s;
    });
  }
  let MAIN_NAME = COURSE.name;

