# Phase 8 plan — Admin Operations Portal

**Branch:** `phase-8-admin` · **Tag:** `v0.8-admin`  
**Depends on:** Phase 7 (`v0.7-trust`)

## Auth
- Admin login + TOTP enrollment/verify (otplib); admin JWT claim `admin:true` + totpVerified
- User tokens rejected on /admin/* (RolesGuard already requires admin roles; tighten with AdminGuard)

## API `/admin/*`
Dashboard KPIs, users CRUD actions, listings moderation, transactions/refunds, disputes (existing), verification queue, reports, fraud alerts, support tickets, catalog/meet-points/scan-rules, promotions, analytics export, audit log read

## Admin app
Role-gated nav + pages for each area; CSV export on users/analytics

## Tests
Table-driven RBAC; audit on mutations; Content Moderator 403 on finance/transactions
