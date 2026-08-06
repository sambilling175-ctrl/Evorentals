create index rental_swaps_created_by_idx on public.rental_swaps(created_by)
  where created_by is not null;

revoke all on table public.rental_swaps from public, anon;
revoke all on function public.swap_rental_vehicle(uuid,uuid,timestamptz,integer,integer,text,text) from public, anon;
grant select, insert on table public.rental_swaps to authenticated;
grant execute on function public.swap_rental_vehicle(uuid,uuid,timestamptz,integer,integer,text,text) to authenticated;
