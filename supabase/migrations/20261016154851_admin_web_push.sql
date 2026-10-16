begin;

-- Only authenticated server functions can access device capabilities and delivery jobs.
create table public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) <= 2048),
  p256dh text not null,
  auth text not null,
  vapid_public_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index admin_push_subscriptions_user on public.admin_push_subscriptions(user_id);
alter table public.admin_push_subscriptions enable row level security;
revoke all on public.admin_push_subscriptions from public, anon, authenticated;
grant all on public.admin_push_subscriptions to service_role;

create table public.admin_push_jobs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.admin_push_subscriptions(id) on delete cascade,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  claim_token uuid,
  claimed_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index admin_push_jobs_ready on public.admin_push_jobs(next_attempt_at) where status in ('pending', 'sending');
create index admin_push_jobs_subscription on public.admin_push_jobs(subscription_id);
alter table public.admin_push_jobs enable row level security;
revoke all on public.admin_push_jobs from public, anon, authenticated;
grant all on public.admin_push_jobs to service_role;

create schema if not exists private;
-- This definer trigger is intentionally server-owned: public booking inserts must
-- enqueue a generic notice without granting patients access to devices or jobs.
-- It cannot be called as an RPC and includes no names, contacts or medical details.
create function private.queue_admin_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_title text;
begin
  if tg_op = 'UPDATE' then
    if tg_table_name = 'appointments' then
      if (to_jsonb(new) - array['reminder_sent','updated_at']) is not distinct from
         (to_jsonb(old) - array['reminder_sent','updated_at']) then return new; end if;
    elsif to_jsonb(new) is not distinct from to_jsonb(old) then return new;
    end if;
  end if;

  if tg_table_name = 'appointments' then
    if tg_op = 'INSERT' then v_title := 'Нов записан час';
    elsif tg_op = 'DELETE' then v_title := 'Изтрит час';
    elsif new.status = 'cancelled' and old.status is distinct from new.status then v_title := 'Отменен час';
    elsif new.date is distinct from old.date or new.start_time is distinct from old.start_time then v_title := 'Преместен час';
    else v_title := 'Промяна в записан час'; end if;
  elsif tg_table_name = 'working_hours' then v_title := 'Промяна в работното време';
  else v_title := 'Промяна в почивните дни'; end if;

  insert into public.admin_push_jobs(subscription_id, payload)
    select s.id, jsonb_build_object('title', v_title, 'body', 'Отворете кабинета, за да видите актуалния график.')
    from public.admin_push_subscriptions s;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.queue_admin_push() from public, anon, authenticated;
create trigger appointments_admin_push after insert or update or delete on public.appointments
  for each row execute function private.queue_admin_push();
create trigger working_hours_admin_push after insert or update or delete on public.working_hours
  for each row execute function private.queue_admin_push();
create trigger days_off_admin_push after insert or update or delete on public.days_off
  for each row execute function private.queue_admin_push();

-- Leases and unique claim tokens prevent overlapping workers sharing a job.
-- Delivery is at-least-once; the same browser notification tag replaces a retry.
create function public.claim_admin_push_jobs(p_limit integer default 12)
returns setof public.admin_push_jobs language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.admin_push_jobs where created_at < now() - interval '7 days';
  update public.admin_push_jobs set status = 'failed'
    where status in ('pending', 'sending') and (created_at < now() - interval '24 hours' or
      (attempts >= 5 and (status = 'pending' or claimed_at < now() - interval '2 minutes')));
  return query
    with ready as (
      select j.id from public.admin_push_jobs j
      where j.attempts < 5 and j.created_at >= now() - interval '24 hours'
        and ((j.status = 'pending' and j.next_attempt_at <= now())
          or (j.status = 'sending' and j.claimed_at < now() - interval '2 minutes'))
      order by j.created_at
      limit greatest(1, least(coalesce(p_limit, 12), 12))
      for update skip locked
    )
    update public.admin_push_jobs j set status = 'sending', attempts = j.attempts + 1,
      claim_token = gen_random_uuid(), claimed_at = now()
    from ready where j.id = ready.id returning j.*;
end;
$$;
revoke all on function public.claim_admin_push_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_admin_push_jobs(integer) to service_role;
commit;
