  /* ---------------- shell ---------------- */
  const TABS = [
    ['today','اليوم',html`<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.8"/>`],
    ['week','الأسبوع',html`<path d="M4 6.5h16M4 12h10M4 17.5h13"/>`],
    ['course','الكورس',html`<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>`],
    ['tasks','المهام',html`<path d="M10 6.5h10M10 12h10M10 17.5h10"/><path d="M3.8 6.5l1.4 1.4L7.8 5.3M3.8 12l1.4 1.4 2.6-2.6M3.8 17.5l1.4 1.4 2.6-2.6"/>`],
    ['workout','تمارين',html`<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>`],
    ['settings','الإعدادات',html`<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>`]
  ];
  // The tab icons: SVG children from TABS, drawn with the same stroke for all.
  const Icon = ({paths}) => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

  function App(){
    const [store, update, sync, replaceAll, saveFailed] = useStore();
    const wk = useWorkouts();
    // The save-failure notice: its own backup result, cleared once saving works again.
    const [saveMsg, setSaveMsg] = useState(null);
    useEffect(() => { if (!saveFailed) setSaveMsg(null); }, [saveFailed]);
    const saveNow = () => { const r = downloadBackup(store, wk); setSaveMsg(r.ok ? {ok: true, name: r.name} : {ok: false}); };
    const [now, setNow] = useState(effectiveNow);
    const [iso, setIso] = useState(() => effectiveNow().iso);
    const [tab, setTab] = useState(() => { const hsh = (location.hash || '').slice(1); return ['today','week','course','tasks','workout','settings'].includes(hsh) ? hsh : 'today'; });
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);
    // Shown once after a restore whose write to the synced copy did not finish in time.
    const [syncLate, setSyncLate] = useState(() => { try { const v = sessionStorage.getItem(RESTORE_SYNC_LATE_KEY); sessionStorage.removeItem(RESTORE_SYNC_LATE_KEY); return !!v; } catch(e){ return false; } });
    // One-time notice after the day version (A late / B early) switches. phaseSeen is the last version the owner saw:
    // first run records it silently, a later difference shows the notice, "تمام" records the new one.
    const phaseNow = phaseFor(now.iso);
    useEffect(() => { if (store.phaseSeen === null) update(s => { s.phaseSeen = phaseNow; return s; }); }, [store.phaseSeen]);
    const ackPhase = () => update(s => { s.phaseSeen = phaseNow; return s; });
    const phaseNotice = !!CFG.versions && store.phaseSeen !== null && store.phaseSeen !== phaseNow;
    useEffect(() => { const t = setInterval(() => setNow(effectiveNow()), 30000); return () => clearInterval(t); }, []);
    // Installable copy (hosted with its manifest): offer "add to home screen" when the browser allows it.
    const [installEvt, setInstallEvt] = useState(null);
    useEffect(() => {
      const onPrompt = e => { e.preventDefault(); setInstallEvt(e); };
      const onDone = () => setInstallEvt(null);
      window.addEventListener('beforeinstallprompt', onPrompt);
      window.addEventListener('appinstalled', onDone);
      return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onDone); };
    }, []);
    const install = async () => { if (!installEvt) return; try { await installEvt.prompt(); } catch(e){} setInstallEvt(null); };
    const goTab = t => { setTab(t); try { window.scrollTo(0, 0); } catch(e){} };
    const goDay = d => { setIso(d); goTab('today'); };
    // A message with an undo button for 7 seconds. The caller has already made the change.
    const showToast = (text, undo) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({text, undo});
      toastTimer.current = setTimeout(() => setToast(null), 7000);
    };
    // Deletions apply at once; undo puts the whole store back as it was.
    const act = (text, fn) => {
      const snap = JSON.stringify(store);
      update(fn);
      showToast(text, () => update(() => JSON.parse(snap)));
    };
    const remove = act;
    // Edits undo only the edited record (undoFn), never the whole store, so a tick made in the meantime stays.
    const actEdit = (text, fn, undoFn) => {
      update(fn);
      showToast(text, () => update(undoFn));
    };
    MAIN_NAME = mainCourse(store).name;

    let view;
    if (tab === 'today') view = html`<${TodayView} iso=${iso} setIso=${setIso} now=${now} store=${store} update=${update} goTab=${goTab} remove=${remove} act=${act} />`;
    else if (tab === 'week') view = html`<${WeekView} iso=${iso} setIso=${setIso} now=${now} store=${store} goDay=${goDay} />`;
    else if (tab === 'course') view = html`<${CourseView} now=${now} store=${store} update=${update} remove=${remove} />`;
    else if (tab === 'workout') view = html`<${WorkoutView} wk=${wk} showToast=${showToast} />`;
    else if (tab === 'settings') view = html`<${SettingsView} store=${store} wk=${wk} sync=${sync} replaceAll=${replaceAll} />`;
    else view = html`<${TasksView} now=${now} store=${store} update=${update} goDay=${goDay} remove=${remove} actEdit=${actEdit} />`;

    return html`<div class="shell">
      <nav class="nav" aria-label="أقسام">
        <p class="brand">ميزان يومي<small>${CATS.uni.label} · ${CATS.course.label} · ${CATS.work.label} · ${CATS.gym.label} · ${CATS.quran.label}</small></p>
        <div class="nav-in">
          ${TABS.map(([k, label, paths]) => html`<button type="button" aria-current=${tab === k ? 'page' : null} onClick=${() => goTab(k)}><${Icon} paths=${paths} /><span>${label}</span>${k === 'settings' && LOADED.isExample ? html`<i class="dot" aria-hidden="true"></i>` : null}</button>`)}
        </div>
      </nav>
      <main class="wrap">
        ${installEvt ? html`<div class="install"><p><b>ثبّت ميزان يومي</b><span class="small muted">أيقونة على الشاشة الرئيسية، ويشتغل من غير نت</span></p><button type="button" class="btn primary" onClick=${install}>ثبّت</button></div>` : null}
        ${LOADED.isExample ? html`<div class="notice"><p><b>${LOADED.problem ? 'الإعدادات المحفوظة مش صالحة، فبنعرض المثال' : 'ده جدول مثال عام'}</b><span class="small muted">${LOADED.problem ? 'استورد ملف الإعدادات تاني من الإعدادات' : 'لما يبقى عندك ملف إعداداتك هتستورده من الإعدادات'}</span></p></div>` : null}
        <div aria-live="polite">${phaseNotice ? html`<div class="notice"><p>${(PRAYERS.find(x => x[0] === CFG.versions.prayer) || [0, 'الصلاة'])[1] + ' بقى ' + (phaseNow === 'A' ? 'بعد ' : 'قبل ') + fmt(CFG.versions.thresholdMinutes).t + '، فمواعيد ' + CATS.work.label + ' و' + CATS.gym.label + ' اتغيرت.'}</p><button type="button" class="btn primary" onClick=${ackPhase}>تمام</button></div>` : null}</div>
        ${syncLate ? html`<div class="notice" role="status"><p>النسخة المتزامنة ممكن لسه تبيّن البيانات القديمة.</p><button type="button" class="btn primary" onClick=${() => setSyncLate(false)}>تمام</button></div>` : null}
        ${saveFailed ? html`<div class="notice" role="alert"><p><b>آخر تغيير ماتحفظش على الجهاز</b><span class="small muted">${LOCAL_OK
          ? 'مساحة التخزين ممكن تكون مليانة أو المتصفح مانع الحفظ. احفظ نسخة احتياطية دلوقتي عشان ماتضيعش حاجة.'
          : 'المتصفح ده مش بيسمح بالحفظ، فالتقدم هيضيع لما تقفل التطبيق.'}</span>${saveMsg ? html`<span class="small">${saveMsg.ok ? html`اتحفظت النسخة: <bdi dir="ltr">${saveMsg.name}</bdi>` : BACKUP_FAILED}</span>` : null}</p><button type="button" class="btn primary" onClick=${saveNow}>احفظ نسخة احتياطية</button></div>` : null}
        ${view}
        <p class=${'sync' + (sync === 'cloud' ? ' cloud' : '')}><i></i>${sync === 'cloud' ? 'التقدم محفوظ على حسابك وبيظهر على أي جهاز' : LOCAL_OK ? 'التقدم محفوظ على الجهاز ده بس' : 'المتصفح ده مش بيسمح بالحفظ، فالعلامات هتتمسح لما تقفل الصفحة'}</p>
      </main>
      <div aria-live="polite">${toast ? html`<div class="toast" role="status"><p>${toast.text}</p><button type="button" class="btn" onClick=${() => { toast.undo(); setToast(null); }}>رجّعها</button></div>` : null}</div>
    </div>`;
  }


  root.innerHTML = '';
  root.setAttribute('lang', CFG.language);
  root.setAttribute('dir', CFG.language === 'ar' ? 'rtl' : 'ltr');
  render(html`<${App} />`, root);
})();
