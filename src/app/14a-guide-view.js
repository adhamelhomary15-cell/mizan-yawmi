  /* ---------------- first-run guide and the place picker (the rules are in the "schedule rules" block) ---------------- */
  // The cities of the 57 OIC member states, from GeoNames (CC BY 4.0, tools/vendor/cities): tools/build.py inlines
  // tools/vendor/cities/cities.json here, so the list works offline.
  const CITIES = [];
  // Set by «اعمل جدولك» in the example notice: Settings opens on the guide.
  let guideRequested = false;
  const METHOD_NAMES = {Egyptian: 'الهيئة المصرية', UmmAlQura: 'أم القرى', MuslimWorldLeague: 'رابطة العالم الإسلامي', Karachi: 'كراتشي',
    Dubai: 'دبي', Kuwait: 'الكويت', Qatar: 'قطر', Singapore: 'سنغافورة', Turkey: 'تركيا', Tehran: 'طهران',
    NorthAmerica: 'أمريكا الشمالية', MoonsightingCommittee: 'لجنة رؤية الهلال'};
  const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch(e){ return 'UTC'; } };
  // A place from coordinates: the device's time zone, and the method and name of the nearest listed city when it is
  // near enough to be the same country.
  function placeAt(lat, lng){
    const near = nearestCity(CITIES, lat, lng);
    const label = near && near.km < 50 ? 'قريب من ' + near.city.ar : 'موقعي';
    return {location: {lat: Math.round(lat * 1e4) / 1e4, lng: Math.round(lng * 1e4) / 1e4, label}, timezone: deviceZone(), prayerMethod: methodFor(near && near.km < 300 ? near.city.cc : '')};
  }

  function PlacePicker({place, onPlace}){
    const [q, setQ] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
    const [lat, setLat] = useState(''), [lng, setLng] = useState('');
    const needle = q.trim().toLowerCase();
    // exact names first, then names that start with the search, then the rest
    const rank = c => (c.ar === q.trim() || c.en.toLowerCase() === needle ? 0 : c.ar.startsWith(q.trim()) || c.en.toLowerCase().startsWith(needle) ? 1 : 2);
    const found = needle ? CITIES.filter(c => c.ar.includes(q.trim()) || c.en.toLowerCase().includes(needle)).sort((a, b) => rank(a) - rank(b)).slice(0, 8) : [];
    // the device location, asked for only on this tap, and used only here
    const locate = () => {
      if (!navigator.geolocation) { setMsg('الجهاز ده مش بيدي الموقع. اختار مدينتك أو اكتب الإحداثيات.'); return; }
      setBusy(true); setMsg('');
      navigator.geolocation.getCurrentPosition(
        p => { setBusy(false); onPlace(placeAt(p.coords.latitude, p.coords.longitude)); },
        e => { setBusy(false); setMsg(e && e.code === 1 ? 'مفيش إذن بالموقع. اختار مدينتك أو اكتب الإحداثيات.' : 'مقدرتش أعرف الموقع دلوقتي. اختار مدينتك أو اكتب الإحداثيات.'); },
        {enableHighAccuracy: false, timeout: 15000, maximumAge: 600000});
    };
    const manual = () => {
      const a = Number(lat), b = Number(lng);
      if (!lat.trim() || !lng.trim() || !(Math.abs(a) <= 90) || !(Math.abs(b) <= 180)) { setMsg('خط العرض من -90 لـ 90، وخط الطول من -180 لـ 180.'); return; }
      setMsg(''); onPlace(placeAt(a, b));
    };
    const times = place && prayerTimesFor(place, effectiveNow().iso);
    return html`<div class="panel form place-pick">
      ${place ? html`<p><b><bdi>${place.location.label}</bdi></b> <span class="small muted">· <bdi dir="ltr">${place.timezone}</bdi></span></p>
        ${times ? html`<p class="small">${PRAYERS.map(([k, n]) => n + ' ' + fmtStr(times[k])).join(' · ')}</p>` : null}
        <label class="field" for="pl-method">طريقة الحساب<select id="pl-method" value=${place.prayerMethod} onChange=${e => onPlace(Object.assign({}, place, {prayerMethod: e.target.value}))}>${Object.keys(METHOD_NAMES).map(m => html`<option value=${m}>${METHOD_NAMES[m]}</option>`)}</select></label>` : null}
      <label class="field wide" for="pl-search">دوّر على مدينتك<input id="pl-search" value=${q} placeholder="مثلاً: القاهرة" onInput=${e => setQ(e.target.value)} /></label>
      ${found.length ? html`<div class="tlist">${found.map(c => html`<button type="button" class="wk-pick" key=${c.cc + c.en + c.lat} onClick=${() => { onPlace(placeOf(c)); setQ(''); }}><bdi>${c.ar}</bdi> <span class="small muted">(<bdi>${c.en}</bdi>)</span></button>`)}</div>`
        : needle ? html`<p class="small muted">مفيش مدينة بالاسم ده في القايمة. استخدم موقعك أو اكتب الإحداثيات.</p>` : null}
      <span class="backup-act"><button type="button" class="btn" disabled=${busy} onClick=${locate}>${busy ? 'بدوّر على موقعك…' : 'استخدم موقعي'}</button></span>
      <details><summary class="small">اكتب الإحداثيات بإيدك</summary><div class="form-row">
        <label class="field narrow" for="pl-lat">خط العرض<input id="pl-lat" inputmode="decimal" dir="ltr" value=${lat} onInput=${e => setLat(e.target.value)} /></label>
        <label class="field narrow" for="pl-lng">خط الطول<input id="pl-lng" inputmode="decimal" dir="ltr" value=${lng} onInput=${e => setLng(e.target.value)} /></label>
        <button type="button" class="btn" onClick=${manual}>استخدمها</button></div></details>
      ${msg ? html`<p class="form-err" role="alert">${msg}</p>` : null}
    </div>`;
  }

  // The start and end of the user's day (feature 018), in the guide and in the editor.
  function DayFields({start, end, onSet}){
    const ok = !!dayBounds({start, end});
    return html`<div class="form-row">
        <label class="field narrow" for="day-start">يومك بيبدأ الساعة<input id="day-start" type="time" dir="ltr" value=${start} onInput=${e => onSet(e.target.value, end)} /></label>
        <label class="field narrow" for="day-end">وبيخلص الساعة<input id="day-end" type="time" dir="ltr" value=${end} onInput=${e => onSet(start, e.target.value)} /></label>
      </div>
      <p class=${ok ? 'small muted' : 'form-err'} role=${ok ? null : 'alert'}>من 3 الصبح لـ 12 الضهر، ولحد 5 الصبح اليوم اللي بعده، ومش أطول من 24 ساعة.</p>`;
  }

  const TEMPLATE_CHOICES = [['student', 'طالب', 'محاضرات الصبح ومذاكرة بعد الضهر'], ['student-work', 'طالب وبيشتغل', 'محاضرات الصبح وشغل بعد الضهر ومذاكرة بالليل'], ['empty', 'فاضي', 'هبدأ من الصفر']];
  // Three steps, then the editor with the new week; nothing is stored before «احفظ الجدول» there.
  function Guide({onClose, onEditor}){
    const [step, setStep] = useState('place');
    const [place, setPlaceState] = useState(null);
    const [template, setTemplate] = useState('student');
    const [subjects, setSubjects] = useState(['', '', '']);
    const [day, setDay] = useState({start: '07:00', end: '01:00'});
    const finish = () => { openEditor(setDayBounds(newSettings(place, template, subjects.map(s => s.trim()), DEFAULT_CATS), day.start, day.end)); onEditor(); };
    return html`<div class="settingsv guide">
      <div class="top a-head"><div class="top-meta"><h1>اعمل جدولك</h1><p class="sub">${step === 'place' ? '1 من 3: إنت فين؟' : step === 'week' ? '2 من 3: أسبوعك شكله إيه؟' : '3 من 3: موادك'}</p></div>
        <button type="button" class="btn" onClick=${onClose}>رجوع</button></div>
      ${step === 'place' ? html`<div class="sec"><p class="small muted">عشان مواعيد الصلاة. الموقع بيتحسب على جهازك بس ومبيتبعتش لأي مكان.</p>
          <${PlacePicker} place=${place} onPlace=${setPlaceState} />
          <span class="backup-act"><button type="button" class="btn primary" disabled=${!place} onClick=${() => setStep('week')}>التالي</button></span></div>`
      : step === 'week' ? html`<div class="sec"><div class="panel tlist" role="radiogroup" aria-label="شكل الأسبوع">
          ${TEMPLATE_CHOICES.map(([id, name, line]) => html`<label class="check-line" key=${id}><input type="radio" name="tpl" checked=${template === id} onChange=${() => setTemplate(id)} /> <b>${name}</b> <span class="small muted">${line}</span></label>`)}</div>
          <div class="panel form"><${DayFields} start=${day.start} end=${day.end} onSet=${(start, end) => setDay({start, end})} /></div>
          <p class="small muted">هتقدر تعدّل كل يوم بعد كده.</p>
          <span class="backup-act"><button type="button" class="btn primary" disabled=${!dayBounds(day)} onClick=${() => setStep('subjects')}>التالي</button><button type="button" class="btn ghost" onClick=${() => setStep('place')}>اللي قبله</button></span></div>`
      : html`<div class="sec"><div class="panel form">
          <p class="small muted">اختياري. أسامي قصيرة زي «رياضة 1» أو «فيزيا»، وتقدر تزوّد بعدين.</p>
          ${subjects.map((s, i) => html`<label class="field wide" key=${i} for=${'gs-' + i}>مادة ${i + 1}<input id=${'gs-' + i} value=${s} maxlength="60" onInput=${e => { const v = e.target.value; setSubjects(list => list.map((x, k) => k === i ? v : x)); }} /></label>`)}
          <button type="button" class="btn ghost" onClick=${() => setSubjects(list => list.concat(''))}>مادة كمان</button></div>
          <span class="backup-act"><button type="button" class="btn primary" onClick=${finish}>كمّل وعدّل الأيام</button><button type="button" class="btn ghost" onClick=${() => setStep('week')}>اللي قبله</button></span></div>`}
    </div>`;
  }
