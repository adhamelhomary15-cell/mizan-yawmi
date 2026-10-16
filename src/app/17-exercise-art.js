  const WORKOUT_GUIDE_BUILTIN_SLUGS = {
    's-bench-press': "bench-press",
    's-incline-bench-press': "incline-bench-press",
    's-dumbbell-bench-press': "dumbbell-bench-press",
    's-chest-fly': "dumbbell-fly",
    's-push-up': "push-up",
    's-dips': "dip",
    's-overhead-press': "overhead-press",
    's-dumbbell-shoulder-press': "seated-dumbbell-press",
    's-lateral-raise': "lateral-raise",
    's-triceps-pushdown': "tricep-pushdown",
    's-barbell-row': "barbell-row",
    's-pull-up': "pull-up",
    's-lat-pulldown': "lat-pulldown",
    's-seated-cable-row': "seated-row",
    's-face-pull': "face-pull",
    's-barbell-curl': "bicep-curl",
    's-dumbbell-curl': "bicep-curl",
    's-hammer-curl': "hammer-curl",
    's-squat': "squat",
    's-front-squat': "front-squat",
    's-leg-press': "leg-press",
    's-lunge': "forward-lunge",
    's-romanian-deadlift': "romanian-deadlift",
    's-deadlift': "deadlift",
    's-leg-extension': "leg-extension",
    's-leg-curl': "leg-curl",
    's-hip-thrust': "hip-thrust",
    's-calf-raise': "calf-raise",
    's-plank': "plank",
    's-crunch': "crunch",
  };
  // English exercise names that have a drawing; tools/build.py inlines tools/vendor/workout-guide/names.json here.
  const WORKOUT_GUIDE_NAME_TO_SLUG = {};
  const WORKOUT_GUIDE_ASSETS = {};
  // Exercise drawings from Workout Guide (tools/vendor/workout-guide, CC BY-SA 4.0). tools/build.py inlines the
  // drawings of the built-in exercises into WORKOUT_GUIDE_ASSETS. Any other known drawing is a file on the app's
  // own site, fetched only when the user taps «نزّل الرسمة», and then kept in its own cache (feature 011).
  const GUIDE_CACHE = 'mizan-guides-v1';
  const guideFrames = new Map();
  const guideListeners = new Set();
  function guideSlugForExercise(exId, name){
    const key = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return WORKOUT_GUIDE_BUILTIN_SLUGS[exId] || WORKOUT_GUIDE_NAME_TO_SLUG[key] || null;
  }
  function svgAsDataUri(svg){
    const bytes = new TextEncoder().encode(svg); let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return 'data:image/svg+xml;base64,' + btoa(binary);
  }
  async function decodeGuide(bytes){
    // gzip, unless a server already unpacked it on the way (it then starts with the JSON itself)
    const gz = bytes[0] === 0x1f && bytes[1] === 0x8b;
    const frames = JSON.parse(gz ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
      : new TextDecoder().decode(bytes));
    if (!checkGuideFrames(frames).ok) throw new Error('not a drawing');
    return frames.map(svgAsDataUri);
  }
  // A drawing kept from an earlier download. This only looks in the cache; it never makes a request.
  async function keptGuide(slug){
    const url = guideUrl(slug);
    if (!url || typeof caches === 'undefined') return null;
    const r = await (await caches.open(GUIDE_CACHE)).match(url);
    return r ? decodeGuide(new Uint8Array(await r.arrayBuffer())) : null;
  }
  function loadWorkoutGuideFrames(slug){
    if (!guideFrames.has(slug)) guideFrames.set(slug, (WORKOUT_GUIDE_ASSETS[slug]
      ? decodeGuide(Uint8Array.from(atob(WORKOUT_GUIDE_ASSETS[slug]), c => c.charCodeAt(0)))
      : keptGuide(slug)).catch(() => null));
    return guideFrames.get(slug);
  }
  // The app's only network request: one file from its own site, after the user taps «نزّل الرسمة».
  // Returns {ok: true, kept} or {ok: false, code} with code 'net' (no connection), 'failed' or 'bad'.
  async function downloadGuide(slug){
    const url = guideUrl(slug);
    if (!url) return {ok: false, code: 'bad'};
    let bytes;
    try {
      const r = await fetch(url, {credentials: 'omit', cache: 'no-store'});
      if (!r.ok) return {ok: false, code: 'failed'};
      bytes = new Uint8Array(await r.arrayBuffer());
    } catch (e) { return {ok: false, code: 'net'}; }
    let frames;
    try { frames = await decodeGuide(bytes); } catch (e) { return {ok: false, code: 'bad'}; }
    let kept = false;
    try {
      await (await caches.open(GUIDE_CACHE)).put(url, new Response(bytes, {headers: {'Content-Type': 'application/gzip'}}));
      kept = true;
    } catch (e) { /* no cache here (for example a private window): shown for this visit only */ }
    guideFrames.set(slug, Promise.resolve(frames));
    guideListeners.forEach(f => f());
    return {ok: true, kept};
  }
  // undefined while loading, null when there is no drawing to show, or the three frames as data URIs.
  function useGuideFrames(slug){
    const [state, setState] = useState({slug: null, frames: undefined});
    const [rev, setRev] = useState(0);
    useEffect(() => { const f = () => setRev(n => n + 1); guideListeners.add(f); return () => { guideListeners.delete(f); }; }, []);
    useEffect(() => {
      let active = true;
      if (slug) loadWorkoutGuideFrames(slug).then(frames => { if (active) setState({slug, frames}); });
      return () => { active = false; };
    }, [slug, rev]);
    if (!slug) return null;
    return state.slug === slug ? state.frames : undefined;
  }
  function GenericExerciseFrames({name, large}){
    const arms = ['M40 34L30 44L26 56','M40 34L28 40L24 51','M40 34L31 38L27 47'];
    const legs = ['M45 60L40 75L39 92 M55 60L61 75L62 92','M45 60L42 72L35 83L34 93 M55 60L60 72L67 83L68 93','M45 60L40 75L37 92 M55 60L61 75L64 92'];
    const figure = i => html`<svg class="wg-generic-figure" viewBox="0 0 100 110" aria-hidden="true">
      <circle cx="50" cy="17" r="7" /><path d="M50 25 C40 25 38 31 39 39 L40 59 C45 63 55 63 60 59 L61 39 C62 31 60 25 50 25Z" />
      <path d=${arms[i] + ' M60 34L70 44L74 56'} /><path d=${legs[i]} /><path class="wg-generic-floor" d="M23 95H77" />
    </svg>`;
    return html`<div class=${'wk-illustration wg-frames' + (large ? ' large' : '')} role="img" aria-label=${name + '، رسم عام من ثلاث لقطات'}>
      ${[0,1,2].map(i => html`<figure class="wg-frame" key=${i}>${figure(i)}<figcaption>${['START','MID','FINISH'][i]}</figcaption></figure>`)}
    </div>`;
  }
  function ExerciseIllustration({exId, name, large}){
    const frames = useGuideFrames(guideSlugForExercise(exId, name));
    const cls = 'wk-illustration wg-frames' + (large ? ' large' : '');
    if (frames) return html`<div class=${cls} role="img" aria-label=${name + '، ثلاث لقطات: البداية والوسط والنهاية'}>
      ${large ? frames.map((src, i) => html`<figure class="wg-frame" key=${i}><img src=${src} alt="" /><figcaption>${['START','MID','FINISH'][i]}</figcaption></figure>`)
        : html`<img class="wg-thumb" src=${frames[0]} alt="" />`}
    </div>`;
    if (frames === undefined) return html`<div class=${cls} role="img" aria-label=${name + '، جاري تحميل الرسم'} aria-busy="true"></div>`;
    return html`<${GenericExerciseFrames} name=${name} large=${large} />`;
  }
  const GUIDE_ERRORS = {
    net: 'مفيش نت دلوقتي. جرّب تاني لما يبقى فيه نت.',
    failed: 'ماقدرتش أنزّل الرسمة دلوقتي. جرّب تاني بعدين.',
    bad: 'الرسمة اللي اتنزلت مش سليمة، ماتحفظتش.'
  };
  // The drawing on an exercise's page, with «نزّل الرسمة» when a known drawing is not on this device yet.
  function ExerciseArt({exId, name}){
    const slug = guideSlugForExercise(exId, name), frames = useGuideFrames(slug);
    const [dl, setDl] = useState(null);
    useEffect(() => { setDl(null); }, [slug]);
    const download = async () => {
      if (dl === 'busy') return;
      setDl('busy');
      const r = await downloadGuide(slug);
      setDl(r.ok ? (r.kept ? null : {note: 'الرسمة ظاهرة دلوقتي بس، ومش هتتحفظ على الجهاز ده.'}) : {err: GUIDE_ERRORS[r.code]});
    };
    const canDownload = slug && frames === null && !WORKOUT_GUIDE_ASSETS[slug];
    return html`<div class="wk-ex-detail">
      <${ExerciseIllustration} exId=${exId} name=${name} large />
      ${frames ? html`<p class="small muted">ثلاث لقطات للحركة من البداية للنهاية</p>`
        : frames === null ? html`<p class="small muted">رسم عام للتمرين</p>` : null}
      ${canDownload ? html`<button type="button" class="btn" disabled=${dl === 'busy'} onClick=${download}>${dl === 'busy' ? 'بتتنزّل…' : 'نزّل الرسمة'}</button>
        <p class="small muted">الرسمة دي محتاجة نت مرة واحدة، وبعد كده تشتغل من غير نت.</p>` : null}
      ${dl && dl.err ? html`<p class="form-err" role="alert">${dl.err}</p>` : null}
      ${dl && dl.note ? html`<p class="small" role="status">${dl.note}</p>` : null}
    </div>`;
  }

