/**
 * Low-rate POST /v1/visits — keep RPS tiny to avoid abusing shared environments.
 *
 *   BASE_URL=http://localhost:8080/v1 \
 *   PROPERTY_ID=<active-listing-uuid> \
 *   BUYER_PHONE=+919999999999 \
 *   k6 run loadtest/visits-low-rate.js
 */
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8080/v1';
const propertyId = __ENV.PROPERTY_ID || '';
const buyerPhone = __ENV.BUYER_PHONE || '+919999999999';

export const options = {
  scenarios: {
    visits: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '10s',
      duration: '2m',
      preAllocatedVUs: 2,
      maxVUs: 5,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.5'],
  },
};

export default function () {
  if (!propertyId) {
    return;
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const visitDate = tomorrow.toISOString().slice(0, 10);

  const body = JSON.stringify({
    propertyId,
    visitDate,
    visitTime: '10:00:00',
    buyerPhone,
  });

  const res = http.post(`${BASE}/visits`, body, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'visit accepted or business error': (r) =>
      r.status === 200 || r.status === 201 || r.status === 400 || r.status === 404,
  });
}
