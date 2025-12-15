/**
 * 금정산 "추정 경계(오목한 윤곽)" 생성 스크립트
 *
 * - 백엔드에서 trails/rockfall-risk 데이터를 가져와 포인트 샘플링
 * - concaveman(오목한 hull)으로 경계 폴리곤 생성
 * - frontend/public/geumjeongsan_boundary.geojson 으로 저장 (Vite public)
 *
 * 실행:
 *   cd frontend
 *   npm run generate:geumjeong-boundary
 *
 * 환경변수:
 *   BACKEND_URL (기본 http://localhost:8080)
 */

import fs from 'node:fs';
import path from 'node:path';
import concaveman from 'concaveman';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

const OUT_FILE = path.resolve('public/geumjeongsan_boundary.geojson');

function assertOk(res, label) {
  if (!res.ok) {
    throw new Error(`${label} failed: ${res.status} ${res.statusText}`);
  }
}

function uniqKey(lng, lat) {
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

function addPoint(points, seen, lng, lat) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
  // 한국 범위 근처만 (쓰레기값 제거)
  if (lng < 120 || lng > 135 || lat < 30 || lat > 40) return;
  const k = uniqKey(lng, lat);
  if (seen.has(k)) return;
  seen.add(k);
  points.push([lng, lat]);
}

function sampleTrailPoints(trails, maxPoints, points, seen) {
  for (const t of trails) {
    const coords = t?.geom?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const stride = Math.max(1, Math.floor(coords.length / 40)); // 구간당 ~40점
    for (let i = 0; i < coords.length; i += stride) {
      const c = coords[i];
      if (!Array.isArray(c) || c.length < 2) continue;
      addPoint(points, seen, Number(c[0]), Number(c[1]));
      if (points.length >= maxPoints) return;
    }
  }
}

function sampleGeoJsonVertices(geo, maxPoints, points, seen) {
  if (!geo || !geo.type) return;

  const pushCoord = (c) => addPoint(points, seen, Number(c[0]), Number(c[1]));

  if (geo.type === 'Polygon') {
    for (const ring of geo.coordinates || []) {
      if (!Array.isArray(ring)) continue;
      const stride = Math.max(1, Math.floor(ring.length / 60));
      for (let i = 0; i < ring.length; i += stride) {
        pushCoord(ring[i]);
        if (points.length >= maxPoints) return;
      }
    }
    return;
  }

  if (geo.type === 'MultiPolygon') {
    for (const poly of geo.coordinates || []) {
      for (const ring of poly || []) {
        if (!Array.isArray(ring)) continue;
        const stride = Math.max(1, Math.floor(ring.length / 80));
        for (let i = 0; i < ring.length; i += stride) {
          pushCoord(ring[i]);
          if (points.length >= maxPoints) return;
        }
      }
    }
  }
}

function closeRing(ring) {
  if (!ring || ring.length < 3) return ring;
  const [x0, y0] = ring[0];
  const [xN, yN] = ring[ring.length - 1];
  if (x0 !== xN || y0 !== yN) ring.push([x0, y0]);
  return ring;
}

async function main() {
  console.log('[GeumjeongBoundary] BACKEND_URL =', BACKEND_URL);

  const trailsRes = await fetch(`${BACKEND_URL}/api/mainmap/trails`);
  assertOk(trailsRes, 'GET /api/mainmap/trails');
  const trails = await trailsRes.json();
  console.log('[GeumjeongBoundary] trails:', Array.isArray(trails) ? trails.length : typeof trails);

  const rockfallRes = await fetch(`${BACKEND_URL}/api/mainmap/rockfall-risk`);
  assertOk(rockfallRes, 'GET /api/mainmap/rockfall-risk');
  const rockfall = await rockfallRes.json();
  console.log('[GeumjeongBoundary] rockfall:', Array.isArray(rockfall) ? rockfall.length : typeof rockfall);

  const points = [];
  const seen = new Set();

  // 1) trails 샘플
  sampleTrailPoints(trails, 12000, points, seen);

  // 2) 문화재/낙석 폴리곤 버텍스 샘플
  for (const item of rockfall) {
    const geo = item?.geomGeojson;
    if (!geo) continue;
    sampleGeoJsonVertices(geo, 15000, points, seen);
    if (points.length >= 15000) break;
  }

  if (points.length < 50) {
    throw new Error(`Not enough points to build boundary: ${points.length}`);
  }

  console.log('[GeumjeongBoundary] sampled points:', points.length);

  // concaveman: 낮을수록 더 오목(디테일 증가). 너무 낮으면 요철 과다.
  const concavity = 2.2;
  const lengthThreshold = 0; // 단순화 X (필요시 >0)
  const hull = concaveman(points, concavity, lengthThreshold);

  if (!hull || hull.length < 3) {
    throw new Error('concaveman returned invalid hull');
  }

  closeRing(hull);

  const featureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          source: 'generated-from-trails-and-rockfall',
          backendUrl: BACKEND_URL,
          concavity,
          lengthThreshold,
          pointCount: points.length,
          generatedAt: new Date().toISOString(),
        },
        geometry: {
          type: 'Polygon',
          // GeoJSON: [lng,lat]
          coordinates: [hull],
        },
      },
    ],
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(featureCollection, null, 2), 'utf8');
  console.log('[GeumjeongBoundary] wrote:', OUT_FILE);
}

main().catch((e) => {
  console.error('[GeumjeongBoundary] ERROR:', e);
  process.exit(1);
});


