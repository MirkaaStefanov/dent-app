begin;

alter table public.appointments
  add column if not exists patient_user_id uuid references auth.users(id) on delete set null;

create index if not exists appointments_patient_user_history
  on public.appointments(patient_user_id, date desc, start_time desc)
  where patient_user_id is not null;

-- Public booking remains registration-free. Ownership is assigned only by the
-- security-definer triggers below, after a verified auth email is matched.
drop policy if exists "Public can view appointment slots" on public.appointments;
drop policy if exists "Public can update appointments" on public.appointments;
drop policy if exists "Public can create appointments" on public.appointments;
create policy "Public can create appointments"
  on public.appointments for insert to anon, authenticated
  with check (patient_user_id is null);

create policy "Patients can read own appointments"
  on public.appointments for select to authenticated
  using (patient_user_id = (select auth.uid()));

create schema if not exists private;

create or replace function private.link_appointment_to_verified_patient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_user_id uuid;
begin
  if nullif(trim(new.patient_email), '') is null then
    return new;
  end if;

  select u.id into matched_user_id
  from auth.users u
  where lower(u.email) = lower(trim(new.patient_email))
    and u.email_confirmed_at is not null
  limit 1;

  if matched_user_id is not null then
    update public.appointments
    set patient_user_id = matched_user_id
    where id = new.id and patient_user_id is null;
  end if;

  return new;
end;
$$;
revoke all on function private.link_appointment_to_verified_patient() from public, anon, authenticated;

drop trigger if exists link_appointment_to_verified_patient on public.appointments;
create trigger link_appointment_to_verified_patient
after insert or update of patient_email on public.appointments
for each row
when (new.patient_user_id is null)
execute function private.link_appointment_to_verified_patient();

-- This extends the existing profile trigger. An account can see historical guest
-- bookings only after Supabase has verified ownership of the matching email.
create or replace function private.create_clinic_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, email, full_name, role)
  values(
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    case
      when lower(new.email) = 'mirkanstefanov2007@gmail.com' and new.email_confirmed_at is not null then 'admin'
      else 'patient'
    end
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      role = case when excluded.role = 'admin' then 'admin' else public.profiles.role end;

  if new.email_confirmed_at is not null and nullif(trim(new.email), '') is not null then
    update public.appointments
    set patient_user_id = new.id
    where patient_user_id is null
      and lower(trim(patient_email)) = lower(trim(new.email));
  end if;

  return new;
end;
$$;
revoke all on function private.create_clinic_profile() from public, anon, authenticated;

drop trigger if exists create_clinic_profile on auth.users;
create trigger create_clinic_profile
after insert or update of email, email_confirmed_at on auth.users
for each row execute function private.create_clinic_profile();

-- Backfill only for accounts whose email ownership is already verified.
update public.appointments a
set patient_user_id = u.id
from auth.users u
where a.patient_user_id is null
  and a.patient_email is not null
  and u.email_confirmed_at is not null
  and lower(trim(a.patient_email)) = lower(trim(u.email));

commit;
