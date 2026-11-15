  /* ---------------- install hint (feature 034) ---------------- */
  // How to add the app to the home screen. On an iPhone it is what keeps the data: Safari may clear a site that has
  // not been opened for a while, but not an app on the home screen. The device is read once; installHintFor decides.
  const INSTALL_DEVICE = (() => {
    try {
      const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
      return {ua: navigator.userAgent || '', touch: navigator.maxTouchPoints || 0, standalone};
    } catch(e){ return {ua: '', touch: 0, standalone: true}; }
  })();
  // Its own key, like the look: outside the progress, the settings and the backup.
  const INSTALL_HINT_KEY = 'mizan-install-hint';
  const installHintDone = () => { try { return localStorage.getItem(INSTALL_HINT_KEY) === 'done'; } catch(e){ return false; } };

  const ShareIcon = () => html`<svg class="share-ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.8v8.4M5.2 4.4L8 1.6l2.8 2.8"/><path d="M5 6.6H3.6v7.6h8.8V6.6H11"/></svg>`;
  const INSTALL_REASON = {
    ios: 'على الآيفون، Safari ممكن يمسح بياناتك لو مافتحتش التطبيق فترة. من الشاشة الرئيسية بتفضل محفوظة.',
    android: 'هتلاقيه بسرعة، ويفتح من غير نت زي أي تطبيق.'
  };

  function InstallSteps({hint}){
    const browser = hint.os === 'ios' ? 'Safari' : 'المتصفح (Chrome مثلًا)';
    if (hint.inApp) return html`<ol class="install-steps"><li>افتح اللينك في ${browser} الأول، من قايمة التطبيق اللي انت فيه، وبعدها ضيفه من هناك.</li></ol>`;
    if (hint.os === 'android') return html`<ol class="install-steps">
      <li>افتح قايمة المتصفح، النقط التلاتة <span aria-hidden="true">⋮</span> فوق.</li>
      <li>اختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» <bdi dir="ltr">(Install app / Add to Home screen)</bdi>.</li>
    </ol>`;
    return html`<ol class="install-steps">
      <li>دوس على زرار المشاركة <${ShareIcon} /> في Safari.</li>
      <li>اختار «إضافة إلى الشاشة الرئيسية» <bdi dir="ltr">(Add to Home Screen)</bdi>.</li>
    </ol>`;
  }

  // The notice above the day. «تمام» hides it for good on this device; with storage refused, until the page closes.
  // offer: the browser offers installing itself, so the shell's «ثبّت» button shows instead of the Android steps.
  function InstallHint({offer}){
    const hint = installHintFor(Object.assign({offer}, INSTALL_DEVICE));
    const [done, setDone] = useState(installHintDone);
    if (!hint || done) return null;
    const dismiss = () => { try { localStorage.setItem(INSTALL_HINT_KEY, 'done'); } catch(e){} setDone(true); };
    return html`<div class="notice install-hint" role="status">
      <div class="hint-body"><b>ضيف ميزان يومي للشاشة الرئيسية</b><span class="small muted">${INSTALL_REASON[hint.os]}</span><${InstallSteps} hint=${hint} /></div>
      <button type="button" class="btn primary" onClick=${dismiss}>تمام</button>
    </div>`;
  }

  // The same steps in Settings, while the app runs in a browser, whether or not the notice was dismissed.
  function InstallLine(){
    const hint = installHintFor(Object.assign({offer: false}, INSTALL_DEVICE));
    return hint ? html`<div class="install-line"><p class="small">ضيف التطبيق للشاشة الرئيسية عشان بياناتك تفضل محفوظة:</p><${InstallSteps} hint=${hint} /></div>` : null;
  }
