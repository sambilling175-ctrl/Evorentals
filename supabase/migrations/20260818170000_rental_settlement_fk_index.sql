-- D12-02: cover the composite rental settlement foreign key for joins and FK checks.

create index rental_settlements_company_rental_idx
  on public.rental_settlements (company_id, rental_id);
