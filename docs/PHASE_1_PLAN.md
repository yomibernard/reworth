# Phase 1 plan — Accounts, Auth & Identity

**Branch:** `phase-1-auth` · **Tag:** `v0.1-auth`  
**Depends on:** Phase 0 (`v0.0-scaffold`)

## Schema (Prisma)
- User, Profile, Address, Verification, Device, RefreshToken, AuditLog, AdminRoleAssignment, OtpChallenge
- Enums: VerificationLevel (L1/L2/L3), VerificationStatus, AdminRole, AuthProvider

## API (`/api/v1`)
- Auth: OTP request/verify, login (email), refresh, logout, OAuth mock callback
- Me: GET/PATCH profile, devices list/revoke, sign-out-all
- Verifications: list, POST identity (L3 via mock provider)
- Admin: bootstrap Super Admin from env; POST/GET users + roles; RBAC guard

## Security
- OTP: hashed, 5 min expiry, max 5 attempts; rate 3/15min + 5/day per number
- JWT: 15m access + 30d rotating refresh; reuse detection revokes family
- Argon2id passwords; no PII in logs; audit on role/verification/deletion

## UI
- Web: welcome → phone → OTP → profile complete
- Mobile: same shell flow
- Admin: email/password login (+ TOTP placeholder), role-gated nav shell

## Risks
- Docker/Postgres required for migrate + integration tests
- OAuth real providers deferred to env; mock in dev
