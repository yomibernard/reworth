import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1,
  duration: "15s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

const BASE_URL = __ENV.API_BASE_URL || "http://localhost:3001";

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/healthz`);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "body status ok": (r) => {
      try {
        return JSON.parse(String(r.body)).status === "ok";
      } catch {
        return false;
      }
    },
  });
  sleep(1);
}
