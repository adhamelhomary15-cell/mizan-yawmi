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
    const [store, update, sync, replaceAll, saveFailed, health] = useStore();
    const wk = useWorkouts();
    // Settings brought back from the mirror reopen the page once (see the settings load); say so after it.
    const [settingsBack, setSettingsBack] = useState(() => { try { const v = sessionStorage.getItem(RECOVERED_KEY); sessionStorage.removeItem(RECOVERED_KEY); return !!v; } catch(e){ return false; } });
    const recovered = health.problem === 'recovered' || wk.recovered || settingsBack;
    const dismissRecovered = () => { health.dismiss(); wk.dismissRecovered(); setSettingsBack(false); };
    // When the local copy is damaged and the mirror could not help, point to the newest daily snapshot.
    const [lastDay, setLastDay] = useState(null);
    useEffect(() => { if (health.problem === 'damaged') listSnapshots().then(l => setLastDay(l.length ? l[0].day : null)); }, [health.problem]);
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
    // A new version took over in the background (see sw.js): offer to open it now; the next open shows it anyway.
    // Coming back to the app (feature 026): a phone resumes an installed app without reloading it, so the browser
    // would not look for a new version; ask it to, at most once a minute. The page's load counts as the first look.
    const [newVersion, setNewVersion] = useState(false);
    useEffect(() => {
      const sw = navigator.serviceWorker;
      if (!sw || !sw.controller) return;   // the first install is not an update
      const onChange = () => setNewVersion(true);
      let lastLook = Date.now();
      const onReturn = () => {
        if (document.visibilityState !== 'visible' || Date.now() - lastLook < 60000) return;
        lastLook = Date.now();
        sw.getRegistration().then(r => r && r.update()).catch(() => {});   // offline: nothing to do
      };
      sw.addEventListener('controllerchange', onChange);
      document.addEventListener('visibilitychange', onReturn);
      return () => { sw.removeEventListener('controllerchange', onChange); document.removeEventListener('visibilitychange', onReturn); };
    }, []);
    const goTab = t => { setTab(t); try { window.scrollTo(0, 0); } catch(e){} };
    const goDay = d => { setIso(d); goTab('today'); };
    // «اعمل جدولك» opens Settings on the guide; a new key opens it fresh even when Settings is already showing.
    const [settingsOpened, setSettingsOpened] = useState(0);
    const startGuide = () => { guideRequested = true; setSettingsOpened(n => n + 1); goTab('settings'); };
    // A message for 7 seconds, with an undo button when there is something to undo. The caller has already made the change.
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
    // After the settings are stored (the editor's save, an import, a reset): read them back as a page load would, apply
    // them, and start every screen fresh with them, with no reload (feature 020). The date follows a new day or zone.
    const [settingsEpoch, setSettingsEpoch] = useState(0);
    const settingsChanged = (text, tabAfter) => {
      applySettings(readSettings());
      editorSession = null;
      const n = effectiveNow();
      setNow(n); setIso(n.iso); setSettingsEpoch(e => e + 1);
      if (tabAfter) goTab(tabAfter);
      showToast(text);
    };

    let view;
    if (tab === 'today') view = html`<${TodayView} key=${settingsEpoch} iso=${iso} setIso=${setIso} now=${now} store=${store} update=${update} goTab=${goTab} remove=${remove} act=${act} actEdit=${actEdit} />`;
    else if (tab === 'week') view = html`<${WeekView} key=${settingsEpoch} iso=${iso} setIso=${setIso} now=${now} store=${store} goDay=${goDay} />`;
    else if (tab === 'course') view = html`<${CourseView} key=${settingsEpoch} now=${now} store=${store} update=${update} remove=${remove} />`;
    else if (tab === 'workout') view = html`<${WorkoutView} key=${settingsEpoch} wk=${wk} showToast=${showToast} />`;
    else if (tab === 'settings') view = html`<${SettingsView} key=${settingsOpened + '-' + settingsEpoch} store=${store} wk=${wk} sync=${sync} replaceAll=${replaceAll} settingsChanged=${settingsChanged} />`;
    else view = html`<${TasksView} key=${settingsEpoch} now=${now} store=${store} update=${update} goDay=${goDay} remove=${remove} actEdit=${actEdit} />`;

    return html`<${MainCourseName.Provider} value=${mainCourseName(store)}><div class="shell">
      <nav class="nav" aria-label="أقسام">
        <p class="brand">ميزان يومي<small>${CATS.uni.label} · ${CATS.course.label} · ${CATS.work.label} · ${CATS.gym.label} · ${CATS.quran.label}</small></p>
        <div class="nav-in">
          ${TABS.map(([k, label, paths]) => html`<button type="button" aria-current=${tab === k ? 'page' : null} onClick=${() => goTab(k)}><${Icon} paths=${paths} /><span>${label}</span>${k === 'settings' && LOADED.isExample ? html`<i class="dot" aria-hidden="true"></i>` : null}</button>`)}
        </div>
      </nav>
      <main class="wrap">
        ${installEvt ? html`<div class="install"><p><b>ثبّت ميزان يومي</b><span class="small muted">أيقونة على الشاشة الرئيسية، ويشتغل من غير نت</span></p><button type="button" class="btn primary" onClick=${install}>ثبّت</button></div>` : null}
        ${newVersion ? html`<${Notice} role="status" title="فيه نسخة جديدة من التطبيق" line="هتفتح لوحدها المرة الجاية، أو افتحها دلوقتي."><button type="button" class="btn primary" onClick=${() => location.reload()}>افتحها</button></${Notice}>` : null}
        ${LOADED.isExample ? html`<${Notice} title=${LOADED.problem ? 'الإعدادات المحفوظة مش صالحة، فبنعرض المثال' : 'ده جدول مثال عام'} line=${LOADED.problem ? 'استورد ملف الإعدادات تاني من الإعدادات، أو اعمل جدولك من هنا.' : 'اعمل جدولك من هنا في دقايق، أو استورد ملف إعدادات من الإعدادات.'}><button type="button" class="btn primary" onClick=${startGuide}>اعمل جدولك</button></${Notice}>` : null}
        <div aria-live="polite">${phaseNotice ? html`<${Notice} text=${(PRAYERS.find(x => x[0] === CFG.versions.prayer) || [0, 'الصلاة'])[1] + ' بقى ' + (phaseNow === 'A' ? 'بعد ' : 'قبل ') + fmt(CFG.versions.thresholdMinutes).t + '، فمواعيد ' + CATS.work.label + ' و' + CATS.gym.label + ' اتغيرت.'}><button type="button" class="btn primary" onClick=${ackPhase}>تمام</button></${Notice}>` : null}</div>
        ${syncLate ? html`<${Notice} role="status" text="النسخة المتزامنة ممكن لسه تبيّن البيانات القديمة."><button type="button" class="btn primary" onClick=${() => setSyncLate(false)}>تمام</button></${Notice}>` : null}
        ${recovered ? html`<${Notice} role="status" text="رجّعنا بياناتك من النسخة المحفوظة على الجهاز."><button type="button" class="btn primary" onClick=${dismissRecovered}>تمام</button></${Notice}>` : null}
        ${health.problem === 'damaged' ? html`<${Notice} role="alert" title="نسخة بياناتك على الجهاز بايظة" line=${'حطيناها على جنب ومامسحناهاش. ' + (lastDay ? 'تقدر ترجّع نسخة يوم ' + dateLabel(lastDay) + ' أو نسخة احتياطية من الإعدادات.' : 'لو عندك نسخة احتياطية، رجّعها من الإعدادات.')}><button type="button" class="btn" onClick=${health.dismiss}>تمام</button></${Notice}>` : null}
        ${health.problem === 'too-new' ? html`<${Notice} role="alert" title="بياناتك اتحفظت بنسخة أحدث من التطبيق" line="مش هنعدّل عليها هنا عشان ما نبوّظهاش. حدّث التطبيق." />` : null}
        ${health.problem === 'failed' ? html`<${Notice} role="alert" title="النسخة دي مش قادرة تفتح بياناتك" line="بياناتك محفوظة زي ما هي. احفظ نسخة احتياطية وحدّث التطبيق."><button type="button" class="btn primary" onClick=${saveNow}>احفظ نسخة احتياطية</button></${Notice}>` : null}
        ${health.setAside ? html`<${Notice} role="status" title=${'فيه ' + health.setAside + ' حاجة في بياناتك شكلها بايظ'} line="اتحطت على جنب ومامسحناهاش، وهي موجودة في النسخة الاحتياطية."><button type="button" class="btn" onClick=${health.dismiss}>تمام</button></${Notice}>` : null}
        ${saveFailed ? html`<${Notice} role="alert" title="آخر تغيير ماتحفظش على الجهاز" line=${LOCAL_OK
          ? 'مساحة التخزين ممكن تكون مليانة أو المتصفح مانع الحفظ. احفظ نسخة احتياطية دلوقتي عشان ماتضيعش حاجة.'
          : 'المتصفح ده مش بيسمح بالحفظ، فالتقدم هيضيع لما تقفل التطبيق.'}
          text=${saveMsg ? html`<span class="small">${saveMsg.ok ? html`اتحفظت النسخة: <bdi dir="ltr">${saveMsg.name}</bdi>` : BACKUP_FAILED}</span>` : null}><button type="button" class="btn primary" onClick=${saveNow}>احفظ نسخة احتياطية</button></${Notice}>` : null}
        ${view}
        <p class=${'sync' + (sync === 'cloud' ? ' cloud' : '')}><i></i>${sync === 'cloud' ? 'التقدم محفوظ على حسابك وبيظهر على أي جهاز' : LOCAL_OK ? 'التقدم محفوظ على الجهاز ده بس' : 'المتصفح ده مش بيسمح بالحفظ، فالعلامات هتتمسح لما تقفل الصفحة'}</p>
      </main>
      <div aria-live="polite">${toast ? html`<div class="toast" role="status"><p>${toast.text}</p>${toast.undo ? html`<button type="button" class="btn" onClick=${() => { toast.undo(); setToast(null); }}>رجّعها</button>` : null}</div>` : null}</div>
    </div></${MainCourseName.Provider}>`;
  }


  root.innerHTML = '';
  root.setAttribute('lang', CFG.language);
  root.setAttribute('dir', CFG.language === 'ar' ? 'rtl' : 'ltr');
  render(html`<${App} />`, root);
})();
