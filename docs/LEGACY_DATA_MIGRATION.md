# Legacy EvoRentals Data Migration

## Source inventory (read-only discovery, 2026-08-04)

Source: the authenticated legacy master panel at `evorentals.in/masterpanel`.
Credentials and raw personal data must never be committed to this repository.

| Legacy module | Reported rows | Target domain | Export observation |
| --- | ---: | --- | --- |
| Customers | 13,792 | customers, addresses, KYC reviews, documents | Server-side table; CSV/Excel UI; single `All` request capped at 2,000 |
| Inventory | 479 | vehicles, vehicle documents/history | Server-side table; CSV/Excel UI |
| Bike list | Not reported | vehicle categories/models/images | Rendered table |
| Bookings | 3,073 dashboard total | bookings, rentals, pricing snapshots | Server-side table; CSV/Excel UI |
| Wallet | 1,009 | payments, deposits/refunds/adjustments | Server-side table; CSV/Excel UI |
| Staff | 18 list / 12 dashboard | employees, roles | CSV/Excel UI; count mismatch requires reconciliation |
| Vendors | 14 | vendors | CSV/Excel UI |
| Pickup locations | 15 | locations/settings | CSV/Excel UI |
| Vendor payments | 0 | vendor payments | CSV/Excel UI |
| Coupons | 5 dashboard total | discounts/coupons | Rendered module |
| Rate card | Not reported | pricing plans | Rendered table |

Additional visible modules: reviews/ratings, vehicle locations, notifications,
parcel delivery, referral/vendor charges, and sales/payment reports.

## Observed source fields

- Customer: legacy ID, name, email, mobile, driving licence number, address,
  account status, KYC status, document link, created timestamp.
- Inventory: bike name, model/engine/chassis/battery numbers, manufacturing year,
  registration number, color, manufacturer, purchase date, status.
- Booking: booking ID, customer, booking type, payment status, start/end date and
  time, booking status.
- Wallet: customer, amount type, amount, amount date, purpose.
- Staff: name, email, mobile, address, status, role, joining date.
- Vendor: name, email, mobile, address, status, image.
- Location: address, latitude, longitude, status.
- Rate card: name, per-kilometre rate, per-minute rate, base price, free kilometres.

## Extraction status

- `legacy-data/` is Git-ignored because it contains private customer data.
- `legacy-data/customers.raw.json` contains a 2,000-row partial raw snapshot and
  must not be treated or imported as the full customer dataset.
- `legacy-data/customers.csv` is now a complete 13,792-row metadata export. It
  is validated locally by `npm.cmd run legacy:customers:stage` and remains
  Git-ignored because it contains personal data.
- D11-03 import infrastructure is live, but no legacy business record has been
  written to Supabase. The current plan has 13,760 eligible rows and 32
  quarantined rows (10 blank names, 20 duplicate-identity rows, and 2
  unparseable Indian phone values).
- No source records were modified.

## Migration rules

1. Obtain a complete database/API export or implement a resumable batched
   extractor for server-side tables; UI dashboard totals are not authoritative.
2. Preserve every legacy primary key in an explicit `legacy_id` mapping table.
3. Import reference data first, then customers/KYC, vehicles, bookings/rentals,
   and finally payments/wallet records.
4. Deduplicate customers using normalized phone/email while preserving aliases;
   never merge solely on name.
5. Normalize Indian phone numbers, timestamps, INR values, registration/chassis
   identifiers, and legacy status values through explicit mapping tables.
6. Copy KYC/vehicle documents only into private storage and verify object counts
   and checksums before switching any application reads.
7. Reconcile source counts, imported counts, rejected rows, financial totals, and
   relationship orphans after every batch.
8. Run the first import in staging; production cutover requires a final delta
   export and an approved reconciliation report.

## Next action

Run `npm.cmd run legacy:customers:import -- --remote` with a short-lived
authenticated administrator JWT to validate every eligible chunk through the
live SECURITY INVOKER RPC. Only after that succeeds, use the checksum-derived
confirmation printed in the ignored import plan with `--apply`. KYC/photo
binaries still require a separate manifest and private-storage transfer; the
CSV's `Documents` column is not a binary export.
