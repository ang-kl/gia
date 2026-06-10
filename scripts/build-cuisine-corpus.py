#!/usr/bin/env python3
# scripts/build-cuisine-corpus.py — v0.62.8
#
# Offline harvester for the curated cuisine corpus (Phase 1: Bangkok pilot).
# Reads the FREE Foursquare Open Source Places parquet (Apache-2.0, hosted on
# Source Cooperative) and writes a per-city gzipped shard the bot loads into
# Redis Geo at boot. NO Google Places calls — $0. Ratings/recency are added
# later, lazily, at serve time (corpus-enrich.js).
#
# Mirrors the role of scripts/build-michelin-meta.mjs (offline snapshot), but
# stays in Python because DuckDB-over-parquet is the proven reader and this is
# a build-time tool — it adds ZERO dependency to the deployed Node/Railway app.
#
# RUN:  pip3 install duckdb
#       python3 scripts/build-cuisine-corpus.py --city Bangkok
#
# Output: data/corpus/<city-slug>.json.gz   (gzipped JSON array of venue rows)
#         data/corpus/manifest.json         ({ city: { rows, fsqDate, bbox } })
#         data/corpus/NOTICE.txt            (Foursquare Apache-2.0 attribution)
#
# Row shape (no placeId/rating — filled lazily by corpus-enrich.js at serve):
#   { "id":"fsq:<id>", "name", "lat", "lng", "address", "locality",
#     "cats":[<leaf labels>], "website", "instagram" }

import argparse, gzip, json, os, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'data', 'corpus')

# Phase-1 city bboxes (lat_min, lat_max, lng_min, lng_max). Bangkok matches the
# spike. Phase 2 derives these from city-centroids.js (centroid ± radiusM).
CITY_BBOX = {
    'Bangkok': (13.5, 14.0, 100.3, 100.95, 'TH'),
}

FSQ_DATE = '2025-02-06'   # Source Cooperative release segment
BASE = f"https://data.source.coop/fused/fsq-os-places/{FSQ_DATE}/places"
N_SHARDS = 81


def city_slug(name):
    return name.lower().replace(' ', '-')


def harvest(city, dry_run=False):
    if city not in CITY_BBOX:
        sys.exit(f"no bbox for city '{city}' (known: {', '.join(CITY_BBOX)})")
    import duckdb
    lat0, lat1, lng0, lng1, cc = CITY_BBOX[city]
    urls = [f"{BASE}/{i}.parquet" for i in range(N_SHARDS)]
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    t0 = time.time()
    print(f"[corpus] {city}: scanning {N_SHARDS} FSQ shards (bbox-pruned)…")
    rows = con.execute(f"""
        SELECT fsq_place_id, name, latitude, longitude, address, locality,
               fsq_category_labels, website, instagram
        FROM read_parquet({urls})
        WHERE country = '{cc}'
          AND latitude BETWEEN {lat0} AND {lat1}
          AND longitude BETWEEN {lng0} AND {lng1}
          AND date_closed IS NULL
          AND array_to_string(fsq_category_labels, ' | ') ILIKE '%restaurant%'
    """).fetchall()
    print(f"[corpus] fetched {len(rows)} restaurant rows in {time.time()-t0:.0f}s")

    seen, out = set(), []
    for fid, name, lat, lng, addr, loc, labels, web, ig in rows:
        if not fid or fid in seen or name is None or lat is None or lng is None:
            continue
        seen.add(fid)
        # leaf = last segment of each "A > B > C" path; dedup, drop bare "Restaurant"
        leaves = []
        for lab in (labels or []):
            leaf = str(lab).split(' > ')[-1].strip()
            if leaf and leaf.lower() != 'restaurant' and leaf not in leaves:
                leaves.append(leaf)
        out.append({
            'id': f'fsq:{fid}', 'name': name,
            'lat': round(float(lat), 6), 'lng': round(float(lng), 6),
            'address': addr or '', 'locality': loc or '',
            'cats': leaves, 'website': web or '', 'instagram': ig or ''
        })

    print(f"[corpus] {len(out)} unique venues after dedup")
    if dry_run:
        print("[corpus] --dry-run: not writing.")
        for r in out[:5]:
            print("   sample:", json.dumps(r, ensure_ascii=False)[:160])
        return

    os.makedirs(OUT_DIR, exist_ok=True)
    slug = city_slug(city)
    shard = os.path.join(OUT_DIR, f'{slug}.json.gz')
    with gzip.open(shard, 'wt', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    size_mb = os.path.getsize(shard) / 1e6
    print(f"[corpus] wrote {shard} ({size_mb:.1f} MB gz, {len(out)} rows)")

    # manifest (merge with existing)
    man_path = os.path.join(OUT_DIR, 'manifest.json')
    man = {}
    if os.path.exists(man_path):
        try:
            man = json.load(open(man_path))
        except Exception:
            man = {}
    man[city] = {'rows': len(out), 'fsqDate': FSQ_DATE,
                 'bbox': [lat0, lat1, lng0, lng1], 'shard': f'{slug}.json.gz'}
    json.dump(man, open(man_path, 'w'), indent=2)
    print(f"[corpus] manifest updated: {man_path}")

    # Apache-2.0 attribution (required)
    notice = os.path.join(OUT_DIR, 'NOTICE.txt')
    open(notice, 'w').write(
        "This directory contains venue base data derived from\n"
        "Foursquare Open Source Places (https://opensource.foursquare.com/os-places/),\n"
        "licensed under the Apache License 2.0. Foursquare is credited as the source.\n"
        "Ratings/recency are NOT from Foursquare; they are fetched separately from Google Places.\n"
    )


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--city', default='Bangkok')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    harvest(a.city, a.dry_run)
