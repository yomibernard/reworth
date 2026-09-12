# Security (stub)

Full controls land by Phase 9 (`v0.9-risk-security`) per PRD §44.

## Mandatory themes (track as we build)

- TLS in transit; encryption at rest
- Argon2id password hashing; OTP rate limits; JWT rotation + reuse detection
- RBAC (admin 7 roles); audit logging
- Secure uploads (MIME sniff, size caps, malware-scan adapter)
- Injection / XSS / CSRF protections
- Secrets only via env / secret manager — never commit
- Pen-test checklist before public launch

## Phase 0 note

Scaffold only — no auth surface yet. Threat model expands each phase; Security Engineer signs the phase report.
