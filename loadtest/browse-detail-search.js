/**
 * Public API mix: featured, list, search, optional detail.
 *
 * Usage:
 *   BASE_URL=http://localhost:8080/v1 CITY=Bidar k6 run loadtest/browse-detail-search.js
 *   PROPERTY_IDS=uuid1,uuid2,... k6 run loadtest/browse-detail-search.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8080/v1';
const CITY = encodeURIComponent(__ENV.CITY || 'Bidar');

const propertyIds = (__ENV.PROPERTY_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const options = {
  scenarios: {
    browse_search: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 200 },
        { duration: '1m', target: 500 },
        { duration: '2m', target: 1000 },
        { duration: '2m', target: 2000 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
  },
};

function pickIdFromFeatured(body) {
  try {
    const j = JSON.parse(body);
    const list = j.content || j.data || [];
    if (!Array.isArray(list) || list.length === 0) return null;
    const row = list[Math.floor(Math.random() * list.length)];
    return row.id || row.propertyId || null;
  } catch (e) {
    return null;
  }
}

function pick(arr) {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  const featuredUrl = `${BASE}/properties/featured?city=${CITY}&page=0&size=20`;
  let res = http.get(featuredUrl);
  check(res, { 'featured 200': (r) => r.status === 200 });

  let idPool = propertyIds.slice();
  if (res.status === 200 && idPool.length === 0) {
    const fromFeed = pickIdFromFeatured(res.body);
    if (fromFeed) idPool = [fromFeed];
  }

  res = http.get(`${BASE}/properties?city=${CITY}&type=PLOT&page=0&size=20`);
  check(res, { 'list 200': (r) => r.status === 200 });

  res = http.get(`${BASE}/properties/search?q=plot&city=${CITY}&page=0&size=20`);
  check(res, { 'search 200': (r) => r.status === 200 });

  if (idPool.length > 0) {
    const id = pick(idPool);
    res = http.get(`${BASE}/properties/${id}`);
    check(res, { 'detail 2xx': (r) => r.status >= 200 && r.status < 300 });
  }

  sleep(0.3 + Math.random() * 0.7);
}
