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
  const WORKOUT_GUIDE_NAME_TO_SLUG = {"bench press":"bench-press","incline bench press":"incline-bench-press","incline dumbbell press":"incline-dumbbell-press","dumbbell bench press":"dumbbell-bench-press","decline bench press":"decline-bench-press","machine chest press":"machine-chest-press","pec deck":"pec-deck","cable fly":"cable-fly","push up":"push-up","weighted push up":"weighted-push-up","overhead press":"overhead-press","dumbbell seated shoulder press":"seated-dumbbell-press","arnold press":"arnold-press","lateral raise":"lateral-raise","cable lateral raise":"cable-lateral-raise","front raise":"front-raise","rear delt fly":"rear-delt-fly","reverse pec deck":"reverse-pec-deck","face pull":"face-pull","upright row":"upright-row","deadlift":"deadlift","romanian deadlift":"romanian-deadlift","barbell row":"barbell-row","t bar row":"t-bar-row","dumbbell bent over row":"dumbbell-bent-over-row","one arm dumbbell row":"one-arm-dumbbell-row","chest supported row":"chest-supported-row","seated cable row":"seated-row","machine row":"machine-row","lat pulldown":"lat-pulldown","close grip lat pulldown":"close-grip-lat-pulldown","straight arm pulldown":"straight-arm-pulldown","pull up":"pull-up","assisted pull up":"assisted-pull-up","weighted pull up":"weighted-pull-up","chin up":"chin-up","barbell shrug":"shrug","squat":"squat","front squat":"front-squat","hack squat":"hack-squat","leg press":"leg-press","bulgarian split squat":"bulgarian-split-squat","walking lunge":"walking-lunge","step up":"step-up","leg extension":"leg-extension","leg curl":"leg-curl","seated leg curl":"seated-leg-curl","hip thrust":"hip-thrust","glute bridge":"glute-bridge","good morning":"good-morning","standing calf raise":"standing-calf-raise","seated calf raise":"seated-calf-raise","bicep curl":"bicep-curl","hammer curl":"hammer-curl","preacher curl":"preacher-curl","cable curl":"cable-curl","reverse curl":"reverse-curl","wrist curl":"wrist-curl","tricep pushdown":"tricep-pushdown","overhead tricep extension":"overhead-tricep-extension","skull crusher":"skull-crusher","close grip bench press":"close-grip-bench-press","dip":"dip","assisted dip":"assisted-dip","plank":"plank","side plank":"side-plank","hanging leg raise":"hanging-leg-raise","cable crunch":"cable-crunch","ab wheel rollout":"ab-wheel","running":"running","walking":"walking","cycling":"cycling","rowing":"rowing","stair climber":"stair-climber","dumbbell fly":"dumbbell-fly","incline cable fly":"incline-cable-fly","decline dumbbell press":"decline-dumbbell-press","smith machine bench press":"smith-machine-bench-press","landmine press":"landmine-press","chest dip":"chest-dip","weighted dip":"weighted-dip","machine shoulder press":"machine-shoulder-press","standing dumbbell press":"standing-dumbbell-press","push press":"push-press","machine lateral raise":"machine-lateral-raise","cable front raise":"cable-front-raise","plate front raise":"plate-front-raise","bent over rear delt raise":"bent-over-rear-delt-raise","cable rear delt fly":"cable-rear-delt-fly","pendlay row":"pendlay-row","inverted row":"inverted-row","meadows row":"meadows-row","single arm cable row":"single-arm-cable-row","wide grip lat pulldown":"wide-grip-lat-pulldown","neutral grip pull up":"neutral-grip-pull-up","assisted chin up":"assisted-chin-up","weighted chin up":"weighted-chin-up","rack pull":"rack-pull","back extension":"back-extension","dumbbell shrug":"dumbbell-shrug","goblet squat":"goblet-squat","smith machine squat":"smith-machine-squat","belt squat":"belt-squat","sumo deadlift":"sumo-deadlift","trap bar deadlift":"trap-bar-deadlift","lying leg curl":"lying-leg-curl","nordic hamstring curl":"nordic-hamstring-curl","single leg romanian deadlift":"single-leg-romanian-deadlift","reverse lunge":"reverse-lunge","split squat":"split-squat","cable kickback":"cable-kickback","hip abduction machine":"hip-abduction-machine","single leg glute bridge":"single-leg-glute-bridge","barbell glute bridge":"barbell-glute-bridge","dumbbell glute bridge":"dumbbell-glute-bridge","dumbbell hip thrust":"dumbbell-hip-thrust","smith machine hip thrust":"smith-machine-hip-thrust","smith machine romanian deadlift":"smith-machine-romanian-deadlift","dumbbell romanian deadlift":"dumbbell-romanian-deadlift","kettlebell romanian deadlift":"kettlebell-romanian-deadlift","cable pull through":"cable-pull-through","machine glute kickback":"machine-glute-kickback","cable standing hip abduction":"cable-standing-hip-abduction","cable standing hip adduction":"cable-standing-hip-adduction","hip adduction machine":"hip-adduction-machine","smith machine bulgarian split squat":"smith-machine-bulgarian-split-squat","smith machine reverse lunge":"smith-machine-reverse-lunge","smith machine split squat":"smith-machine-split-squat","heel elevated goblet squat":"heel-elevated-goblet-squat","dumbbell sumo squat":"dumbbell-sumo-squat","dumbbell sumo deadlift":"dumbbell-sumo-deadlift","front foot elevated split squat":"front-foot-elevated-split-squat","deficit reverse lunge":"deficit-reverse-lunge","dumbbell lateral lunge":"dumbbell-lateral-lunge","dumbbell curtsy lunge":"dumbbell-curtsy-lunge","landmine squat":"landmine-squat","landmine romanian deadlift":"landmine-romanian-deadlift","kettlebell swing":"kettlebell-swing","glute focused back extension":"glute-focused-back-extension","reverse hyperextension":"reverse-hyperextension","donkey calf raise":"donkey-calf-raise","leg press calf raise":"leg-press-calf-raise","wall sit":"wall-sit","jump squat":"jump-squat","incline dumbbell curl":"incline-dumbbell-curl","concentration curl":"concentration-curl","ez bar curl":"ez-bar-curl","spider curl":"spider-curl","rope hammer curl":"rope-hammer-curl","drag curl":"drag-curl","rope tricep pushdown":"rope-tricep-pushdown","two dumbbell skullcrusher":"dumbbell-skull-crusher","single dumbbell skullcrusher":"single-dumbbell-skullcrusher","dumbbell overhead tricep extension":"dumbbell-overhead-tricep-extension","single arm dumbbell tricep extension":"single-arm-dumbbell-tricep-extension","bench dip":"bench-dip","tricep kickback":"tricep-kickback","wrist extension":"wrist-extension","farmer carry":"farmer-carry","crunch":"crunch","reverse crunch":"reverse-crunch","russian twist":"russian-twist","bicycle crunch":"bicycle-crunch","mountain climber":"mountain-climber","dead bug":"dead-bug","bird dog":"bird-dog","pallof press":"pallof-press","cable woodchop":"cable-woodchop","half kneeling pallof press":"half-kneeling-pallof-press","cable pallof hold":"cable-pallof-hold","hanging knee raise":"hanging-knee-raise","captain s chair knee raise":"captains-chair-knee-raise","decline sit up":"decline-sit-up","weighted crunch":"weighted-crunch","weighted russian twist":"weighted-russian-twist","dumbbell side bend":"dumbbell-side-bend","elliptical":"elliptical","swimming":"swimming","jump rope":"jump-rope","assault bike":"assault-bike","skierg":"skierg","hiking":"hiking","treadmill incline walk":"treadmill-incline-walk","battle ropes":"battle-ropes","incline push up":"incline-push-up","knee push up":"knee-push-up","wide push up":"wide-push-up","diamond push up":"diamond-push-up","decline push up":"decline-push-up","pike push up":"pike-push-up","feet elevated pike push up":"feet-elevated-pike-push-up","archer push up":"archer-push-up","typewriter push up":"typewriter-push-up","explosive push up":"explosive-push-up","hindu push up":"hindu-push-up","scapular push up":"scapular-push-up","push up shoulder tap":"push-up-shoulder-tap","wall push up":"wall-push-up","wall walk":"wall-walk","wall handstand push up":"wall-handstand-push-up","handstand push up":"handstand-push-up","chair dip":"chair-dip","doorway row":"doorway-row","towel row":"towel-row","prone y raise":"prone-y-raise","prone t raise":"prone-t-raise","superman":"superman","superman hold":"superman-hold","reverse snow angel":"reverse-snow-angel","dead hang":"dead-hang","active hang":"active-hang","scapular pull up":"scapular-pull-up","negative pull up":"negative-pull-up","commando pull up":"commando-pull-up","l sit pull up":"l-sit-pull-up","towel pull up":"towel-pull-up","bodyweight squat":"bodyweight-squat","pistol squat":"pistol-squat","assisted pistol squat":"assisted-pistol-squat","shrimp squat":"shrimp-squat","cossack squat":"cossack-squat","sissy squat":"sissy-squat","forward lunge":"forward-lunge","lateral lunge":"lateral-lunge","curtsy lunge":"curtsy-lunge","skater squat":"skater-squat","single leg box squat":"single-leg-box-squat","step down":"step-down","calf raise":"calf-raise","single leg calf raise":"single-leg-calf-raise","glute bridge march":"glute-bridge-march","frog pump":"frog-pump","donkey kick":"donkey-kick","fire hydrant":"fire-hydrant","clamshell":"clamshell","hip airplane":"hip-airplane","side lying hip abduction":"side-lying-hip-abduction","side lying leg raise":"side-lying-leg-raise","lying hamstring walkout":"lying-hamstring-walkout","towel hamstring curl":"towel-hamstring-curl","stability ball hamstring curl":"stability-ball-hamstring-curl","banded glute bridge":"banded-glute-bridge","banded hip thrust":"banded-hip-thrust","banded frog pump":"banded-frog-pump","banded clamshell":"banded-clamshell","banded lateral walk":"banded-lateral-walk","banded monster walk":"banded-monster-walk","banded squat":"banded-squat","banded donkey kick":"banded-donkey-kick","banded fire hydrant":"banded-fire-hydrant","banded kickback":"banded-kickback","banded standing hip abduction":"banded-standing-hip-abduction","banded seated hip abduction":"banded-seated-hip-abduction","band pull apart":"band-pull-apart","banded face pull":"banded-face-pull","banded row":"banded-row","banded lat pulldown":"banded-lat-pulldown","banded pallof press":"banded-pallof-press","banded woodchop":"banded-woodchop","banded dead bug":"banded-dead-bug","hollow body hold":"hollow-body-hold","hollow rock":"hollow-rock","v up":"v-up","flutter kick":"flutter-kick","lying leg raise":"lying-leg-raise","toe touch":"toe-touch","heel tap":"heel-tap","plank shoulder tap":"plank-shoulder-tap","plank jack":"plank-jack","bear plank":"bear-plank","bear crawl":"bear-crawl","crab walk":"crab-walk","inchworm":"inchworm","l sit hold":"l-sit-hold","seated knee tuck":"seated-knee-tuck","side plank hip dip":"side-plank-hip-dip","copenhagen plank":"copenhagen-plank","dragon flag":"dragon-flag","burpee":"burpee","half burpee":"half-burpee","squat thrust":"squat-thrust","high knees":"high-knees","jumping jack":"jumping-jack","skater hop":"skater-hop","lateral shuffle":"lateral-shuffle","fast feet":"fast-feet","sprawl":"sprawl","seal jack":"seal-jack","cat cow stretch":"cat-cow-stretch","arm circles":"arm-circles","world s greatest stretch":"worlds-greatest-stretch","leg swings":"leg-swings-stretch","torso twists":"torso-twist-stretch","doorway chest stretch":"doorway-chest-stretch","child s pose":"childs-pose","kneeling hip flexor stretch":"kneeling-hip-flexor-stretch","hamstring stretch":"hamstring-stretch","standing quad stretch":"standing-quad-stretch","seated forward fold":"seated-forward-fold-stretch","cross body shoulder stretch":"cross-body-shoulder-stretch","wall calf stretch":"wall-calf-stretch","butterfly stretch":"butterfly-stretch","chest fly":"dumbbell-fly","dips":"dip","dumbbell shoulder press":"seated-dumbbell-press","triceps pushdown":"tricep-pushdown","barbell curl":"bicep-curl","dumbbell curl":"bicep-curl","lunge":"forward-lunge"};
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

