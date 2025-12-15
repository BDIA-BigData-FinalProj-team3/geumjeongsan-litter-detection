/**
 * 금정산 POI 좌표를 OSM(Overpass)로 교차검증/추출하는 스크립트
 * - 출력: 콘솔에 후보 좌표들 (center/lat/lon)
 * - 목적: geumjeongsan_poi.geojson의 좌표가 실제와 다른지 빠르게 확인
 */
const BBOX = { s: 35.15, w: 128.98, n: 35.40, e: 129.15 };
const OVERPASS = 'https://overpass-api.de/api/interpreter';

const targets = [
  { name: '고당봉', categoryHint: 'peak' },
  { name: '장군봉', categoryHint: 'peak' },
  { name: '금정산성 북문', categoryHint: 'gate' },
  { name: '금정산성 동문', categoryHint: 'gate' },
  { name: '금정산성 남문', categoryHint: 'gate' },
  { name: '금정산성 서문', categoryHint: 'gate' },
  { name: '범어사', categoryHint: 'temple' },
  { name: '대성암', categoryHint: 'temple' },
  { name: '미륵사', categoryHint: 'temple' },
  { name: '범어사역', categoryHint: 'station' },
  { name: '온천장역', categoryHint: 'station' },
  { name: '부산대역', categoryHint: 'station' },
  { name: '노포역', categoryHint: 'station' },
];

function buildQuery(name) {
  const { s, w, n, e } = BBOX;
  return (
    `[out:json][timeout:25];(` +
    `node["name"="${name}"](${s},${w},${n},${e});` +
    `way["name"="${name}"](${s},${w},${n},${e});` +
    `relation["name"="${name}"](${s},${w},${n},${e});` +
    `);out center 10;`
  );
}

function pickLatLon(el) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  return { lat, lon };
}

async function overpass(query) {
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': 'final_project/1.0',
    },
    body: 'data=' + encodeURIComponent(query),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Overpass ${res.status}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

function score(el, hint) {
  const t = el.tags || {};
  // 점수는 높을수록 선호
  let s = 0;
  if (hint === 'peak' && t.natural === 'peak') s += 50;
  if (hint === 'temple' && (t.amenity === 'place_of_worship' || t.tourism === 'attraction')) s += 50;
  if (hint === 'gate' && (t.historic === 'city_gate' || t.barrier === 'gate')) s += 50;
  if (hint === 'station' && (t.railway === 'station' || t.public_transport === 'station')) s += 50;
  if (t.wikidata) s += 5;
  if (t.wikipedia) s += 2;
  // name 정확히 일치
  if (t.name && typeof t.name === 'string') s += 1;
  return s;
}

async function main() {
  for (const target of targets) {
    const q = buildQuery(target.name);
    const json = await overpass(q);
    const els = (json.elements || [])
      .map((el) => {
        const ll = pickLatLon(el);
        if (!ll) return null;
        return {
          type: el.type,
          id: el.id,
          name: el.tags?.name,
          tags: el.tags,
          lat: ll.lat,
          lon: ll.lon,
          score: score(el, target.categoryHint),
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.score - a.score));

    console.log(`\n## ${target.name} (${target.categoryHint}) candidates: ${els.length}`);
    console.table(
      els.slice(0, 5).map((e) => ({
        score: e.score,
        type: e.type,
        id: e.id,
        lat: e.lat,
        lon: e.lon,
        tag: e.tags?.natural || e.tags?.amenity || e.tags?.historic || e.tags?.railway || e.tags?.public_transport || '',
        name: e.name,
        wikidata: e.tags?.wikidata || '',
      }))
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


