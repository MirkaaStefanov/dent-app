begin;

-- Roles are controlled from Supabase, never from editable user metadata.
create or replace function public.is_clinic_admin()
returns boolean language sql stable security invoker set search_path = '' as $$
  select coalesce((select auth.jwt())->'app_metadata'->>'role' = 'admin', false)
    or exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function public.is_clinic_admin() from public, anon;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant select on public.profiles to authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));

create schema if not exists private;
create or replace function private.create_clinic_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email, full_name, role)
  values(new.id, coalesce(new.email, ''), new.raw_user_meta_data->>'full_name',
    case when lower(new.email) = 'mirkanstefanov2007@gmail.com' and new.email_confirmed_at is not null then 'admin' else 'patient' end)
  on conflict (id) do update set role = 'admin'
  where lower(new.email) = 'mirkanstefanov2007@gmail.com' and new.email_confirmed_at is not null;
  return new;
end;
$$;
revoke all on function private.create_clinic_profile() from public, anon, authenticated;
drop trigger if exists create_clinic_profile on auth.users;
create trigger create_clinic_profile after insert or update of email_confirmed_at on auth.users for each row execute function private.create_clinic_profile();
insert into public.profiles(id, email, full_name, role)
select id, coalesce(email, ''), raw_user_meta_data->>'full_name', 'patient' from auth.users on conflict(id) do nothing;
update public.profiles p set role = 'admin' from auth.users u
where p.id = u.id and lower(u.email) = 'mirkanstefanov2007@gmail.com' and u.email_confirmed_at is not null;

-- Public booking sees only occupied times, never patient identities.
create or replace function public.get_booked_slots_for_date(p_date date)
returns table(start_time time, end_time time)
language sql stable security definer set search_path = '' as $$
  select a.start_time, a.end_time from public.appointments a where a.date = p_date and a.status != 'cancelled';
$$;
revoke all on function public.get_booked_slots_for_date(date) from public;
grant execute on function public.get_booked_slots_for_date(date) to anon, authenticated, service_role;

-- Replace the old policies which treated any Google account as an administrator.
drop policy if exists "Admins can view all appointments" on public.appointments;
drop policy if exists "Admins can update appointments" on public.appointments;
drop policy if exists "Admins can delete appointments" on public.appointments;
create policy "Admins can view all appointments" on public.appointments for select to authenticated using ((select public.is_clinic_admin()));
create policy "Admins can update appointments" on public.appointments for update to authenticated using ((select public.is_clinic_admin())) with check ((select public.is_clinic_admin()));
create policy "Admins can delete appointments" on public.appointments for delete to authenticated using ((select public.is_clinic_admin()));

drop policy if exists "Admins can manage services" on public.services;
drop policy if exists "Admins can manage working hours" on public.working_hours;
drop policy if exists "Admins can manage days off" on public.days_off;
drop policy if exists "Admins can manage clinic settings" on public.clinic_settings;
create policy "Admins can manage services" on public.services for all to authenticated using ((select public.is_clinic_admin())) with check ((select public.is_clinic_admin()));
create policy "Admins can manage working hours" on public.working_hours for all to authenticated using ((select public.is_clinic_admin())) with check ((select public.is_clinic_admin()));
create policy "Admins can manage days off" on public.days_off for all to authenticated using ((select public.is_clinic_admin())) with check ((select public.is_clinic_admin()));
create policy "Admins can manage clinic settings" on public.clinic_settings for all to authenticated using ((select public.is_clinic_admin())) with check ((select public.is_clinic_admin()));

alter table public.appointments add column if not exists notification_consent boolean not null default false;
create index if not exists appointments_reminder_candidates on public.appointments(date, start_time) where status = 'confirmed' and notification_consent;

create table if not exists public.appointment_notifications (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  scheduled_start timestamptz not null,
  channel text not null check (channel in ('email', 'sms')),
  status text not null default 'pending' check (status in ('pending', 'sending', 'accepted', 'failed', 'unknown', 'skipped')),
  attempts integer not null default 0,
  first_attempt_at timestamptz,
  claimed_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  provider_id text,
  error_code text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(appointment_id, scheduled_start, channel)
);
alter table public.appointment_notifications enable row level security;
revoke all on public.appointment_notifications from anon, authenticated;
grant select on public.appointment_notifications to authenticated;
grant all on public.appointment_notifications to service_role;
create policy "Admins can read notification results" on public.appointment_notifications for select to authenticated using ((select public.is_clinic_admin()));
create index if not exists notifications_ready on public.appointment_notifications(next_attempt_at) where status in ('pending', 'failed', 'sending');

-- Only the server can create and claim jobs. SKIP LOCKED prevents concurrent workers claiming the same job.
create or replace function public.claim_appointment_reminders(p_channels text[], p_limit integer default 10)
returns setof public.appointment_notifications
language plpgsql security invoker set search_path = '' as $$
declare
  v_hours integer;
begin
  select greatest(1, least(168, coalesce(reminder_hours_before, 24))) into v_hours from public.clinic_settings limit 1;
  v_hours := coalesce(v_hours, 24);
  insert into public.appointment_notifications(appointment_id, scheduled_start, channel)
  select a.id, (a.date + a.start_time) at time zone 'Europe/Sofia', c.channel
  from public.appointments a cross join unnest(p_channels) c(channel)
  where a.status = 'confirmed' and a.notification_consent and not a.reminder_sent
    and c.channel in ('email', 'sms')
    and (a.date + a.start_time) at time zone 'Europe/Sofia' > now()
    and (a.date + a.start_time) at time zone 'Europe/Sofia' <= now() + make_interval(hours => v_hours)
    and ((c.channel = 'email' and nullif(trim(a.patient_email), '') is not null)
      or (c.channel = 'sms' and nullif(trim(a.patient_phone), '') is not null))
  on conflict(appointment_id, scheduled_start, channel) do nothing;

  -- A timed-out SMS might already have been submitted. Never resend it automatically.
  update public.appointment_notifications set status = 'unknown', error_code = 'stale_submission'
  where status = 'sending' and claimed_at < now() - interval '15 minutes'
    and (channel = 'sms' or first_attempt_at < now() - interval '23 hours');
  update public.appointment_notifications n set status = 'skipped', error_code = 'appointment_changed'
  from public.appointments a where a.id = n.appointment_id and n.status in ('pending', 'failed', 'sending')
    and (a.status != 'confirmed' or not a.notification_consent
      or n.scheduled_start != (a.date + a.start_time) at time zone 'Europe/Sofia' or n.scheduled_start <= now());
  update public.appointment_notifications set status = 'unknown', error_code = 'retry_window_expired'
  where status = 'failed' and attempts < 6 and first_attempt_at < now() - interval '23 hours';

  return query
  with ready as (
    select n.id from public.appointment_notifications n
    where n.channel = any(p_channels) and n.attempts < 6 and n.scheduled_start > now()
      and (n.status in ('pending', 'failed') and n.next_attempt_at <= now()
        or n.status = 'sending' and n.channel = 'email' and n.claimed_at < now() - interval '15 minutes')
    order by n.next_attempt_at, n.created_at
    limit greatest(1, least(20, p_limit)) for update skip locked
  )
  update public.appointment_notifications n
  set status = 'sending', attempts = attempts + 1, claimed_at = now(), first_attempt_at = coalesce(first_attempt_at, now())
  from ready where n.id = ready.id returning n.*;
end;
$$;
revoke all on function public.claim_appointment_reminders(text[], integer) from public, anon, authenticated;
grant execute on function public.claim_appointment_reminders(text[], integer) to service_role;
commit;
