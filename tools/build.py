"""Build the installable app from src/planner.html.

Run from the repo root:  python3 tools/build.py
Writes index.html, manifest.webmanifest, sw.js and the icons at the repo root,
which is what GitHub Pages serves. Needs Python 3 and Pillow (only for icons).
"""
import base64, hashlib, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
VENDOR = ROOT / 'tools' / 'vendor'
src = (ROOT / 'src' / 'planner.html').read_text(encoding='utf-8')

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
FONTS = [('Alexandria', 'alexandria', [500, 700], ['arabic', 'latin']),
         ('IBM Plex Sans Arabic', 'ibm-plex-sans-arabic', [400, 500, 600], ['arabic', 'latin']),
         ('IBM Plex Mono', 'ibm-plex-mono', [500, 600], ['latin'])]
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

# 3. Wrap in a full document with the app manifest and service worker.
title = re.search(r'<title>.*?</title>', src).group(0)
src = src.replace(title, '', 1)
head = ('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="theme-color" content="#14202B"><link rel="manifest" href="manifest.webmanifest">'
        '<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">'
        '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="ميزان">'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>')
sw_reg = ("<script>if('serviceWorker' in navigator){addEventListener('load',function(){"
          "navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(function(){});});}</script>")
page = head + title + '</head><body>' + src + sw_reg + '</body></html>'
(ROOT / 'index.html').write_text(page, encoding='utf-8')

# 4. Manifest.
manifest = {
    "name": "ميزان يومي", "short_name": "ميزان",
    "description": "يومك موزون بين الكلية والكورس والشغل والجيم والقرآن",
    "lang": "ar", "dir": "rtl", "start_url": "./", "scope": "./", "display": "standalone",
    "orientation": "any", "background_color": "#EEF1F4", "theme_color": "#14202B",
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
              {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
              {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
(ROOT / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

# 5. Service worker. The cache name changes with every build, so phones drop the old copy.
version = hashlib.sha1(page.encode()).hexdigest()[:10]
(ROOT / 'sw.js').write_text(f"""const CACHE = 'mizan-{version}';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{ e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
// Network first, so a new version shows up as soon as the app opens online; the cached copy serves offline.
self.addEventListener('fetch', e => {{
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req, {{cache: 'no-cache'}})
    .then(r => {{ if (r.ok) {{ const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }} return r; }})
    .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
}});
""", encoding='utf-8')

# 6. Icons: a balance with a green and an amber pan.
try:
    from PIL import Image, ImageDraw
except ImportError:
    print('Pillow not installed; icons left as they are')
else:
    INK, PAPER, GREEN, AMBER = (20, 32, 43), (238, 241, 244), (74, 203, 145), (241, 176, 74)
    def icon(size, maskable=False):
        k = 4; W = 512 * k
        if maskable:
            im = Image.new('RGBA', (W, W), INK + (255,)); d = ImageDraw.Draw(im)
        else:
            im = Image.new('RGBA', (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
            d.rounded_rectangle([0, 0, W - 1, W - 1], radius=112 * k, fill=INK + (255,))
        sc = 0.86 if maskable else 1.0
        P = lambda x, y: ((256 + (x - 256) * sc) * k, (256 + (y - 256) * sc) * k)
        line = lambda a, b, w: d.line([P(*a), P(*b)], fill=PAPER, width=int(w * k * sc))
        line((256, 150), (256, 372), 22); line((176, 384), (336, 384), 24); line((120, 180), (392, 180), 20)
        cx, cy = P(256, 148); r = 22 * k * sc; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=PAPER)
        for x0, col in ((120, GREEN), (392, AMBER)):
            line((x0, 180), (x0 - 44, 272), 8); line((x0, 180), (x0 + 44, 272), 8)
            a, b = P(x0 - 58, 232), P(x0 + 58, 312)
            d.pieslice([a[0], a[1], b[0], b[1]], 0, 180, fill=col)
        return im.resize((size, size), Image.LANCZOS)
    icon(192).save(ROOT / 'icon-192.png'); icon(512).save(ROOT / 'icon-512.png')
    icon(512, True).save(ROOT / 'icon-maskable-512.png')
    icon(180, True).convert('RGB').save(ROOT / 'apple-touch-icon.png')

print(f'built index.html ({len(page.encode()) // 1024} KB), cache mizan-{version}')
