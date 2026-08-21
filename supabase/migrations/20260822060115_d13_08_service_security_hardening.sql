-- D13-08: reconcile live grants for the service RPC surface.
-- The service routines are SECURITY INVOKER and must be callable only by
-- authenticated employees through their company-scoped checks.

revoke all on function public.create_service_request(uuid, uuid, text, text, uuid, uuid, text) from public, anon;
grant execute on function public.create_service_request(uuid, uuid, text, text, uuid, uuid, text) to authenticated;

revoke all on function public.create_service_job_card(uuid) from public, anon;
grant execute on function public.create_service_job_card(uuid) to authenticated;

revoke all on function public.transition_service_job_card(uuid, text, text) from public, anon;
grant execute on function public.transition_service_job_card(uuid, text, text) to authenticated;

revoke all on function public.record_service_intake_inspection(uuid, integer, integer, text, jsonb, text, jsonb) from public, anon;
grant execute on function public.record_service_intake_inspection(uuid, integer, integer, text, jsonb, text, jsonb) to authenticated;

revoke all on function public.assign_service_job_card(uuid, text, uuid, text, text, text, text, text) from public, anon;
grant execute on function public.assign_service_job_card(uuid, text, uuid, text, text, text, text, text) to authenticated;
