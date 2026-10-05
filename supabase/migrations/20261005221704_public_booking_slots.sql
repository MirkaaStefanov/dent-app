-- Public booking sees only occupied times, never patient identities.
create or replace function public.get_booked_slots_for_date(p_date date)
returns table(start_time time, end_time time)
language sql stable security definer set search_path = '' as $$
  select a.start_time, a.end_time from public.appointments a where a.date = p_date and a.status != 'cancelled';
$$;
revoke all on function public.get_booked_slots_for_date(date) from public;
grant execute on function public.get_booked_slots_for_date(date) to anon, authenticated, service_role;


notify pgrst, 'reload schema';
