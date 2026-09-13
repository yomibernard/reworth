# Phase status

| Field | Value |
| --- | --- |
| Current phase | **8 — Admin Operations Portal** |
| Prompt | Prompt 9 |
| Target tag | `v0.8-admin` |
| Branch | `phase-8-admin` (or current) |
| Status | **Complete (pending PR merge)** — tag `v0.8-admin` cut |
| Last updated | 2026-09-13 |

## What exists (Phase 8)

### API
- Schema: AdminTotp, Promotion, HeroBanner, Community, SupportTicketNote, WhitelistEntry, UserWarning; SupportTicket assignee + IN_PROGRESS; RiskEvent review fields
- Admin auth: `POST /admin/auth/login`, TOTP setup/verify (otplib); AdminOnlyGuard on `/admin/*`
- Dashboard KPIs, users, listings, orders/refunds, disputes, verifications, reports, fraud, support, catalog CRUD, promotions, analytics (+ CSV), audit
- Every mutation audit-logged; RBAC matrix in [`docs/RBAC.md`](RBAC.md)

### Admin UI (`apps/admin`)
- Login + TOTP second step
- Role-gated nav shell
- Pages: `/`, `/users`, `/listings`, `/orders`, `/disputes`, `/verifications`, `/reports`, `/fraud`, `/support`, `/catalog`, `/promotions`, `/analytics`, `/audit`

## Resume point
**Phase 8 complete.** Next: **Phase 9 — Risk, Moderation & Security** (`v0.9-risk-security`).

```
Continue: resume Phase 9 from docs/PHASE_STATUS.md. Re-read AGENTS.md and
PRD.md, verify the last commit's tests still pass, then continue the plan.
```
