# ReWorth Admin RBAC — permission matrix

Roles (Prisma `AdminRole`):

| Role | Code |
| --- | --- |
| Super Admin | `SUPER_ADMIN` |
| Operations | `OPERATIONS` |
| Customer Support | `CUSTOMER_SUPPORT` |
| Risk / Fraud | `RISK_FRAUD` |
| Finance | `FINANCE` |
| Marketing | `MARKETING` |
| Content Moderator | `CONTENT_MODERATOR` |

`SUPER_ADMIN` bypasses all role checks.

## Phase 1 endpoints

| Endpoint | Allowed roles |
| --- | --- |
| `POST /admin/users` | SUPER_ADMIN, OPERATIONS |
| `GET /admin/users/:id` | SUPER_ADMIN, OPERATIONS, CUSTOMER_SUPPORT, RISK_FRAUD |
| `POST /admin/users/:id/roles` | SUPER_ADMIN, OPERATIONS |
| `GET /admin/finance/summary` | FINANCE, SUPER_ADMIN |

Customer Support **must** receive **403** on Finance routes; denials are audit-logged (`RBAC_DENIED`).

## Verification levels (users)

| Level | Meaning |
| --- | --- |
| L1_PHONE | Phone OTP verified |
| L2_EMAIL | Email verified (password or OAuth) |
| L3_IDENTITY | Licensed ID check (NIN/BVN/gov ID) — **hash only**, never raw |

Identity Verified badge = L3 `VERIFIED`.

## Seed

```bash
# from apps/api (after migrate)
pnpm exec prisma db seed
```

Uses `ADMIN_SUPER_EMAIL` / `ADMIN_SUPER_PASSWORD` from env.
