/**
 * Phase 9 gate — 500 VUs, p95 < 500ms on hot public paths.
 * Full DB-mixed stress is in mixed-load.js (requires staging capacity).
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    gate_500: {
      executor: 'constant-vus',
      vus: 500,
      duration: '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE = (__ENV.API_BASE_URL || 'http://localhost:3001/api/v1').replace(
  /\/$/,
  '',
);

export default function () {
  const roll = Math.random();
  const path =
    roll < 0.5 ? '/healthz' : roll < 0.8 ? '/categories' : '/readyz';
  const res = http.get(`${BASE}${path}`);
  check(res, { '2xx': (r) => r.status >= 200 && r.status < 300 });
  sleep(1);
}
