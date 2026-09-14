/**
 * Staging smoke — k6 (optional).
 * Install: https://k6.io
 * Usage: k6 run scripts/k6/smoke.js -e BASE_URL=http://localhost:3001/api/v1
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3001/api/v1';

export default function () {
  const health = http.get(`${BASE}/healthz`);
  check(health, { 'healthz 200': (r) => r.status === 200 });

  const regions = http.get(`${BASE}/regions`);
  check(regions, {
    'regions 200': (r) => r.status === 200,
    'regions has cities': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body.items) && body.items.length >= 3;
      } catch {
        return false;
      }
    },
  });

  const home = http.get(`${BASE}/home`);
  check(home, { 'home 200': (r) => r.status === 200 });

  sleep(1);
}
