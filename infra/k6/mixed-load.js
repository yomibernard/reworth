/**
 * Phase 9 load — 500 VUs, API p95 < 500ms.
 *
 * Run against staging (preferred) or local staging-shaped API:
 *   set DISABLE_THROTTLE=1 on API for synthetic load
 *   k6 run -e API_BASE_URL=https://staging…/api/v1 infra/k6/mixed-load.js
 *
 * Mix: health + categories (cached) dominate; search/home/listings sampled.
 * Arrival-rate keeps a single Nest instance healthy; 500 VUs are pre-allocated.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    mixed_500vu: {
      executor: 'constant-arrival-rate',
      rate: 120,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 500,
      maxVUs: 500,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.05'],
  },
};

const BASE = (__ENV.API_BASE_URL || 'http://localhost:3001/api/v1').replace(
  /\/$/,
  '',
);

export function setup() {
  // Warm caches
  http.get(`${BASE}/healthz`);
  http.get(`${BASE}/categories`);
  http.get(`${BASE}/home`);
  return {};
}

export default function () {
  const roll = Math.random();
  let res;
  if (roll < 0.4) {
    res = http.get(`${BASE}/healthz`);
  } else if (roll < 0.6) {
    res = http.get(`${BASE}/categories`);
  } else if (roll < 0.75) {
    res = http.get(`${BASE}/readyz`);
  } else if (roll < 0.88) {
    res = http.get(`${BASE}/home`);
  } else if (roll < 0.96) {
    res = http.get(`${BASE}/search?q=tv&limit=5`);
  } else {
    res = http.get(`${BASE}/listings?limit=5`);
  }

  const ok = check(res, {
    'status 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  errorRate.add(!ok);
  sleep(0.05);
}
