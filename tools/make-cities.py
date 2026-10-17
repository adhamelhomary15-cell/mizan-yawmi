"""Make tools/vendor/cities/cities.json from GeoNames (feature 014). Dev-only: run by hand, never by CI or the build.

    python3 tools/make-cities.py <scratch folder outside the repo> [min population]

It downloads, once into the scratch folder, GeoNames cities15000.zip, alternateNamesV2.zip and countryInfo.txt
(CC BY 4.0, https://www.geonames.org). It keeps the 57 member states of the Organisation of Islamic Cooperation, and in
them every capital plus every city at or above the population threshold. It writes one line per city:
{ar, en, cc, lat, lng, tz}, with the Arabic name when GeoNames has one (preferred names first), else the English one.
"""
import io, json, pathlib, sys, urllib.request, zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'tools' / 'vendor' / 'cities' / 'cities.json'
BASE = 'https://download.geonames.org/export/dump/'
# The 57 OIC member states (ISO 3166-1 alpha-2).
OIC = set('AF AL DZ AZ BH BD BJ BN BF CM TD KM CI DJ EG GA GM GN GW GY ID IR IQ JO KZ KW KG LB LY MY MV ML MR MA MZ NE NG '
          'OM PK PS QA SA SN SL SO SD SR SY TJ TG TN TR TM UG AE UZ YE'.split())
assert len(OIC) == 57, len(OIC)

def fetch(scratch, name):
    path = scratch / name
    if not path.exists():
        print('downloading', name)
        urllib.request.urlretrieve(BASE + name, path)
    return path

def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    scratch = pathlib.Path(sys.argv[1]).resolve()
    if ROOT in scratch.parents or scratch == ROOT:
        raise SystemExit('the scratch folder must be outside the repo')
    scratch.mkdir(parents=True, exist_ok=True)
    min_pop = int(sys.argv[2]) if len(sys.argv) > 2 else 300000

    cities = {}
    with zipfile.ZipFile(fetch(scratch, 'cities15000.zip')) as z:
        for line in io.TextIOWrapper(z.open('cities15000.txt'), encoding='utf-8'):
            f = line.rstrip('\n').split('\t')
            gid, name, lat, lng, fcode, cc, pop, tz = f[0], f[2] or f[1], f[4], f[5], f[7], f[8], int(f[14] or 0), f[17]
            if cc in OIC and tz and (fcode == 'PPLC' or pop >= min_pop):
                cities[gid] = {'en': name, 'cc': cc, 'lat': round(float(lat), 4), 'lng': round(float(lng), 4), 'tz': tz, 'pop': pop}

    arabic = {}
    with zipfile.ZipFile(fetch(scratch, 'alternateNamesV2.zip')) as z:
        for line in io.TextIOWrapper(z.open('alternateNamesV2.txt'), encoding='utf-8'):
            f = line.rstrip('\n').split('\t')
            gid, lang, name = f[1], f[2], f[3]
            if lang != 'ar' or gid not in cities or f[6] == '1' or f[7] == '1':
                continue
            preferred = f[4] == '1'
            if gid not in arabic or (preferred and not arabic[gid][1]):
                arabic[gid] = (name, preferred)

    rows = []
    for gid, c in cities.items():
        rows.append({'ar': arabic.get(gid, (c['en'], False))[0], 'en': c['en'], 'cc': c['cc'], 'lat': c['lat'], 'lng': c['lng'], 'tz': c['tz']})
    rows.sort(key=lambda r: (r['cc'], r['en']))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    text = '[\n' + ',\n'.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in rows) + '\n]\n'
    OUT.write_text(text, encoding='utf-8', newline='\n')
    print(f'{len(rows)} cities in {len({r["cc"] for r in rows})} countries, {len(text.encode()) // 1024} KB, '
          f'{sum(1 for g in cities if g in arabic)} with an Arabic name, threshold {min_pop}')

main()
