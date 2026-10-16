"""Build the installable app from src/planner.html and the script parts listed in src/app/ORDER.

Run from the repo root:  python3 tools/build.py [--icons] [--print-source-sha]
Writes index.html, manifest.webmanifest and sw.js at the repo root, which is what GitHub Pages serves.
The output is the same on every OS (LF line endings), so CI can rebuild and compare.
The icons are only redrawn with --icons, or when one is missing (needs Pillow): the drawing is not
byte-identical across Pillow versions, so redrawing them on every build would change files for nothing.
"""
import base64, hashlib, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
VENDOR = ROOT / 'tools' / 'vendor'
APP = ROOT / 'src' / 'app'
PLACEHOLDER = '/* @app-parts */\n'

def join_parts(text):
    """Put the script parts in place of the placeholder. Same rule as tools/lib/source.js."""
    if PLACEHOLDER not in text:
        return text
    if text.count(PLACEHOLDER) > 1:
        raise SystemExit('src/planner.html has the parts placeholder twice')
    order = APP / 'ORDER'
    if not order.is_file():
        raise SystemExit('src/app/ORDER is missing')
    names = [l.strip() for l in order.read_text(encoding='utf-8').splitlines() if l.strip() and not l.strip().startswith('#')]
    seen = set()
    for n in names:
        if n in seen:
            raise SystemExit(f'src/app/ORDER lists {n} twice')
        seen.add(n)
        if not (APP / n).is_file():
            raise SystemExit(f'src/app/ORDER lists {n}, which does not exist')
    for f in sorted(p.name for p in APP.glob('*.js')):
        if f not in seen:
            raise SystemExit(f'src/app/{f} is not listed in src/app/ORDER')
    body = ''.join((APP / n).read_text(encoding='utf-8').replace('\r\n', '\n') for n in names)
    return text.replace(PLACEHOLDER, body, 1)

src = join_parts((ROOT / 'src' / 'planner.html').read_text(encoding='utf-8').replace('\r\n', '\n'))
if '--print-source-sha' in sys.argv[1:]:
    print(hashlib.sha1(src.encode()).hexdigest())
    sys.exit(0)

def write(name, text):
    (ROOT / name).write_text(text, encoding='utf-8', newline='\n')

# 1. Inline the CDN scripts so the app works offline.
LIBS = {
    'https://cdn.jsdelivr.net/npm/preact@10.26.4/dist/preact.min.umd.js': 'preact.min.umd.js',
    'https://cdn.jsdelivr.net/npm/preact@10.26.4/hooks/dist/hooks.umd.js': 'hooks.umd.js',
    'https://cdn.jsdelivr.net/npm/htm@3.1.1/dist/htm.umd.js': 'htm.umd.js',
    'https://cdn.jsdelivr.net/npm/adhan@4.4.3/lib/bundles/adhan.umd.min.js': 'adhan.umd.min.js',
}
for url, name in LIBS.items():
    tag = f'<script src="{url}"></script>'
    if tag not in src:
        raise SystemExit(f'missing script tag for {url}')
    code = (VENDOR / name).read_text(encoding='utf-8')
    code = re.sub(r'//# sourceMappingURL=\S+', '', code).replace('</script', '<\\/script')
    src = src.replace(tag, '<script>' + code + '</script>')

# 2. Replace the Google Fonts link with embedded font files.
FONTS = [('Readex Pro', 'readex-pro', [400, 500, 600, 700], ['arabic', 'latin']),
         ('Spectral', 'spectral', [700], ['latin'])]
ranges = json.loads((VENDOR / 'fonts' / 'ranges.json').read_text())
faces = []
for family, slug, weights, subsets in FONTS:
    for w in weights:
        for sub in subsets:
            data = base64.b64encode((VENDOR / 'fonts' / f'{slug}-{sub}-{w}-normal.woff2').read_bytes()).decode()
            faces.append(f"@font-face{{font-family:'{family}';font-style:normal;font-display:swap;font-weight:{w};"
                         f"src:url(data:font/woff2;base64,{data}) format('woff2');unicode-range:{ranges[slug + '|' + sub]};}}")
links = re.search(r'<link rel="preconnect"[^>]*>\s*<link rel="preconnect"[^>]*>\s*<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>', src)
if not links:
    raise SystemExit('Google Fonts links not found')
src = src.replace(links.group(0), '<style>' + ''.join(faces) + '</style>')

# 3. Inline the exercise drawings of the built-in exercises only. The others stay as files on the site and are
#    downloaded when the user taps for one (feature 011).
GUIDES = VENDOR / 'workout-guide' / 'frames'
builtin = re.search(r'const WORKOUT_GUIDE_BUILTIN_SLUGS = \{(.*?)\};', src, re.S)
if not builtin or 'const WORKOUT_GUIDE_ASSETS = {};' not in src:
    raise SystemExit('exercise drawing tables not found')
slugs = sorted(set(re.findall(r':\s*"([a-z0-9-]+)"', builtin.group(1))))
missing = [s for s in slugs if not (GUIDES / f'{s}.json.gz').is_file()]
if missing:
    raise SystemExit('missing exercise drawings: ' + ', '.join(missing))
assets = ','.join(f'"{s}":"{base64.b64encode((GUIDES / f"{s}.json.gz").read_bytes()).decode()}"' for s in slugs)
src = src.replace('const WORKOUT_GUIDE_ASSETS = {};', 'const WORKOUT_GUIDE_ASSETS = {' + assets + '};', 1)
# The English names that have a drawing (a data table, kept out of the code).
names = json.loads((VENDOR / 'workout-guide' / 'names.json').read_text(encoding='utf-8'))
if 'const WORKOUT_GUIDE_NAME_TO_SLUG = {};' not in src:
    raise SystemExit('exercise name table not found')
src = src.replace('const WORKOUT_GUIDE_NAME_TO_SLUG = {};',
                  'const WORKOUT_GUIDE_NAME_TO_SLUG = ' + json.dumps(names, ensure_ascii=False, separators=(',', ':')) + ';', 1)

# 4. Wrap in a full document with the app manifest and service worker.
title = re.search(r'<title>.*?</title>', src).group(0)
src = src.replace(title, '', 1)
head = ('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="theme-color" content="#6E1A28"><link rel="manifest" href="manifest.webmanifest">'
        '<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">'
        '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="ميزان">'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>')
sw_reg = ("<script>if('serviceWorker' in navigator){addEventListener('load',function(){"
          "navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(function(){});});}</script>")
page = head + title + '</head><body>' + src + sw_reg + '</body></html>'

# 4b. Content-Security-Policy (feature 012): the browser runs only the inline scripts and styles hashed here, and
#     the page may talk only to its own site. A <meta> policy, because GitHub Pages cannot send headers.
def inline_blocks(html):
    """(tag, opening tag, text) of every <script> and <style>, cut the way the browser cuts them."""
    blocks, at = [], 0
    while True:
        m = re.compile(r'<(script|style)\b[^>]*>', re.I).search(html, at)
        if not m:
            return blocks
        end = html.lower().find('</' + m.group(1).lower(), m.end())
        blocks.append((m.group(1).lower(), m.group(0), html[m.end():end]))
        at = end

def csp_for(html):
    sha = lambda text: "'sha256-" + base64.b64encode(hashlib.sha256(text.encode()).digest()).decode() + "'"
    scripts = [t for tag, open_tag, t in inline_blocks(html) if tag == 'script' and 'type=' not in open_tag]
    styles = [t for tag, _, t in inline_blocks(html) if tag == 'style']
    return '; '.join([
        "default-src 'none'",
        'script-src ' + ' '.join(sha(t) for t in scripts),
        'style-src ' + ' '.join(sha(t) for t in styles),
        "img-src 'self' data:", 'font-src data:', "connect-src 'self'", "worker-src 'self'", "manifest-src 'self'",
        "base-uri 'none'", "form-action 'none'", "object-src 'none'"])

CHARSET = '<meta charset="utf-8">'
page = page.replace(CHARSET, CHARSET + '<meta http-equiv="Content-Security-Policy" content="' + csp_for(page) + '">', 1)
write('index.html', page)

# 5. Manifest.
manifest = {
    "name": "ميزان يومي", "short_name": "ميزان",
    "description": "يومك موزون بين مذاكرتك وشغلك والتزاماتك",
    "lang": "ar", "dir": "rtl", "start_url": "./", "scope": "./", "display": "standalone",
    "orientation": "any", "background_color": "#E7ECE3", "theme_color": "#6E1A28",
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
              {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
              {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
write('manifest.webmanifest', json.dumps(manifest, ensure_ascii=False, indent=2))

# 6. Service worker. The cache name changes with every build, so phones drop the old copy; downloaded
#    exercise drawings live in mizan-guides-* and survive updates.
version = hashlib.sha1(page.encode()).hexdigest()[:10]
write('sw.js', f"""const CACHE = 'mizan-{version}';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{ e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && !k.startsWith('mizan-guides-')).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
// Network first, so a new version shows up as soon as the app opens online; the cached copy serves offline.
self.addEventListener('fetch', e => {{
  const req = e.request;
  const url = new URL(req.url);
  // Exercise drawings the user downloads are kept by the app in its own cache (mizan-guides-*), not here.
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/tools/vendor/workout-guide/')) return;
  e.respondWith(fetch(req, {{cache: 'no-cache'}})
    .then(r => {{ if (r.ok) {{ const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }} return r; }})
    .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
}});
""")

# 7. Icons: the guilloche rosette in paper ink on the oxblood shell colour.
ICONS = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']
want_icons = '--icons' in sys.argv[1:] or not all((ROOT / n).exists() for n in ICONS)
try:
    if not want_icons:
        raise ImportError
    from PIL import Image, ImageDraw
except ImportError:
    if want_icons:
        print('Pillow not installed; icons left as they are')
else:
    import math
    SHELL, PAPER, OCHRE = (110, 26, 40), (250, 251, 246), (228, 197, 92)
    def icon(size, maskable=False):
        k = 4; W = 512 * k
        if maskable:
            im = Image.new('RGBA', (W, W), SHELL + (255,)); d = ImageDraw.Draw(im)
        else:
            im = Image.new('RGBA', (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
            d.rounded_rectangle([0, 0, W - 1, W - 1], radius=112 * k, fill=SHELL + (255,))
        sc = (0.78 if maskable else 0.9) * k
        cx = cy = W / 2
        for i in range(48):
            ang = math.radians(i * 7.5)
            col = OCHRE if i >= 24 else PAPER
            pts = []
            for t in range(0, 361, 6):
                tt = math.radians(t)
                x, y = 92 + 92 * math.cos(tt), 30 * math.sin(tt)
                pts.append((cx + (x * math.cos(ang) - y * math.sin(ang)) * sc, cy + (x * math.sin(ang) + y * math.cos(ang)) * sc))
            d.line(pts, fill=col, width=int(3.2 * k))
        r = 52 * sc; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=SHELL)
        r2 = 52 * sc; d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], outline=PAPER, width=int(3 * k))
        return im.resize((size, size), Image.LANCZOS)
    icon(192).save(ROOT / 'icon-192.png'); icon(512).save(ROOT / 'icon-512.png')
    icon(512, True).save(ROOT / 'icon-maskable-512.png')
    icon(180, True).convert('RGB').save(ROOT / 'apple-touch-icon.png')

print(f'built index.html ({len(page.encode()) // 1024} KB), cache mizan-{version}')
