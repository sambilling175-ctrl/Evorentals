revoke all on table public.rental_extensions from anon;
revoke all on function public.extend_active_rental(uuid,timestamptz,text) from public, anon;
grant select, insert on table public.rental_extensions to authenticated;
grant execute on function public.extend_active_rental(uuid,timestamptz,text) to authenticated;
