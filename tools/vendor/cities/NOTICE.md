# City list

- **Source**: [GeoNames](https://www.geonames.org), downloaded 2026-10-17. The files used are `cities15000.zip`,
  `alternateNamesV2.zip` and `countryInfo.txt` from <https://download.geonames.org/export/dump/>.
- **License**: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) (CC BY 4.0). The data
  is © GeoNames contributors.
- **Made by**: `tools/make-cities.py`, run by hand with a 200,000 population threshold.

## What ميزان يومي changed

- It kept only the 57 member states of the Organisation of Islamic Cooperation, the owner's choice of 2026-10-17. In
  them it kept every capital, plus every city of 200,000 people or more: 724 cities.
- It kept only the name, the country code, the coordinates (rounded to 4 decimal places), the time zone and a size
  rank (1 for the most people over the whole list; the population itself is not kept).
- The rank was added on 2026-11-21 from `cities15000.zip` downloaded that day, matching each listed city by country,
  name and coordinates (one city GeoNames renamed since, Bogra, by country and coordinates). Nothing else changed.
- It uses the Arabic name when GeoNames has one, preferred names first, and the English name otherwise.

This file (`cities.json`) is shared under the same license, CC BY 4.0. `tools/build.py` puts it into the app, so the
city list works offline. The app never downloads anything from GeoNames.
