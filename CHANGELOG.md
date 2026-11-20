# Changelog

All notable changes to **NexaHR Enterprise HRIS** will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-11-18

### Added
- **Dynamic RBAC Permission Matrix** — 11 modules × 5 actions (view, create, edit, delete, approve) with per-role granular configuration.
- **7-Level Organizational Hierarchy** — C-Level → VP/Director → Head of Division → Manager → Supervisor → Staff → Entry/Support with circular-assignment prevention.
- **Multi-Tier Approval Workflow** — Sequential manager → HRD approval chain for Leave and Manager → Finance chain for Reimbursement, with per-stage audit trail.
- **Digital Signature System** — HTML5 Canvas draw, cursive-type, and saved-signature modes with unique `NX-SIG-XXXX-YYYY` verification hash.
- **PWA & Offline Action Queue** — Vite Plugin PWA + Workbox service worker with offline mutation queueing and automatic reconciliation on reconnection.
- **103 Unit Tests** — Full coverage of attendance, payroll IDR, RBAC, offline sync, digital signature, audit logs, simulated socket, hierarchy, kanban, and team calendar utilities.
- **Payroll Module** — Gross/net salary computation with BPJS (Kesehatan + Ketenagakerjaan) and PPh 21 deductions; official payslip print with digital signature slot.
- **Official Document Printing** — Leave letter, payslip, and reimbursement voucher modals with digital signature integration.
- **Real-time Notifications** — SimulatedSocket pub/sub event emitter with Web Audio API chime (no external MP3).
- **Global CSV Export** — 6 datasets: Leave, Reimbursement, Employees, Audit Logs, Attendance, Payroll.
- **Recharts Analytics** — AreaChart (headcount trend) + BarChart (departmental analysis) on Dashboard and Reports.
- **Kanban Board** — Task tracking by status (TODO / IN_PROGRESS / IN_REVIEW / DONE) and department filter.
- **Team Calendar** — Monthly calendar view with leave, attendance, and task event overlays per department.
- **Audit Log** — Full activity history with actor, action, target, severity, IP address, and change diff.
- `vercel.json` — SPA rewrite rules + security headers (X-Frame-Options, CSP, Referrer-Policy, etc.).
- `README.md` — Full professional documentation with module list, demo credentials, and npm scripts.
- `LICENSE` — MIT License.

### Technical Stack
- React 19.0.1, TypeScript 5.x / 7.x, Tailwind CSS v4, Vite 8, Lucide React, Motion, Recharts, Vite Plugin PWA / Workbox.

---

## [Unreleased]

### Planned
- MySQL / REST API backend integration (available in Sell package).
- Role management UI: create and delete custom roles.
- Employee photo upload.
- Payroll batch processing for all active employees.
