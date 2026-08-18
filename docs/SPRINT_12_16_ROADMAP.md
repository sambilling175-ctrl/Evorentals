# Evo Rentals Sprint 12-16 Roadmap

## Delivery rule

Only the first unblocked task is `Ready`. Later tasks remain `Blocked` until
their recorded dependency is verified. Each task must still be claimed on its
own `agent/<task-id>-<description>` branch before implementation.

Email-dependent work is parked by operator decision:

- D4-04 final real-email recovery journey;
- D4-06 live Resend SMTP activation and mailbox smoke;
- D6-03 employee invitation email delivery.

The existing non-email recovery tests remain part of Sprint 12 integration.

## Sprint 12 - Integration and release hardening

Goal: produce one stable baseline from the completed rental, finance, security,
and test branches before adding another operational module.

1. D12-01: review and integrate D9-06 rental settlement.
2. D12-02: review and integrate D10-01 receivables ledger.
3. D12-03: review and integrate D10-03 returned-rental collections.
4. D12-04: integrate D4-05 RLS isolation and D4-04 non-email Playwright tests.
5. D12-05: reconcile rental/vehicle state and financial/reporting totals.
6. D12-06: enforce validation, Playwright, migration, and SQL test CI gates.

Acceptance: the integrated production candidate passes build, browser, SQL,
RLS, advisor, and reconciliation checks without leaving test business records.

## Sprint 13 - Service and maintenance foundation

Goal: replace the Service placeholder with a live company-scoped workflow.

1. D13-01: service requests and controlled reason lookups.
2. D13-02: service job cards and state-transition rules.
3. D13-03: intake inspection with odometer and battery telemetry.
4. D13-04: employee/garage assignment.
5. D13-05: requested, inspection, in-service, waiting-parts, QC, completed flow.
6. D13-06: atomic vehicle availability changes.
7. D13-07: live service pipeline, turnaround, overdue, and readiness dashboard.
8. D13-08: RLS, immutable history, advisors, and rollback-only tests.

Acceptance: an authorized employee can move a vehicle through service without
manual database edits, double assignment, lost history, or cross-company access.

## Sprint 14 - Parts, vendors, QC, and costing

Goal: complete the operational and cost trail for a service job.

1. D14-01: vendor and garage directory.
2. D14-02: spare-parts catalogue and immutable stock movements.
3. D14-03: job reservations and parts consumption.
4. D14-04: labour, parts, battery, and miscellaneous cost capture.
5. D14-05: QC checklist and rework cycle.
6. D14-06: atomic vehicle release.
7. D14-07: vehicle service history and lifetime-cost reporting.
8. D14-08: reference-aligned service analytics dashboard.

Acceptance: stock, job cost, QC, vehicle status, and service history reconcile.

## Sprint 15 - Notifications and operational tasks

Goal: make exceptions and assigned work visible without relying on email.

1. D15-01: live notifications and unread state.
2. D15-02: document-expiry and rental-overdue alerts.
3. D15-03: payment, collection, and service-due alerts.
4. D15-04: employee-assigned tasks.
5. D15-05: realtime refresh for dashboards and alerts.
6. D15-06: notification preferences.
7. D15-07: permission and workflow acceptance tests.

Acceptance: authorized users see current, company-scoped alerts and tasks, and
acknowledgements do not erase immutable operational facts.

## Sprint 16 - Legacy migration and production readiness

Goal: complete the guarded metadata migration and production-release controls.

1. D16-01: authenticated D11-03 remote dry-run.
2. D16-02: explicit-confirmation import of the 13,760 currently eligible rows.
3. D16-03: retain and resolve the 32-row identity quarantine separately.
4. D16-04: inventory and plan private KYC binary migration; do not combine it
   with customer metadata import.
5. D16-05: performance, index, security, and RLS regression review.
6. D16-06: backup, rollback, deployment, and operational runbook.
7. D16-07: full customer-to-settlement lifecycle acceptance.

Acceptance: imported counts and checksums reconcile, quarantined rows remain
traceable, no KYC object is exposed publicly, and the release has a tested
rollback path.
