begin;

-- Store only the opaque booking reference and day for authenticated deep links.
create or replace function private.queue_admin_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_title text;
  v_payload jsonb;
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

  v_payload := jsonb_build_object('title', v_title, 'body', 'Отворете кабинета, за да видите актуалния график.');
  if tg_table_name = 'appointments' then
    v_payload := v_payload || jsonb_build_object(
      'appointmentId', case when tg_op = 'DELETE' then old.id else new.id end,
      'date', case when tg_op = 'DELETE' then old.date::text else new.date::text end);
  end if;
  insert into public.admin_push_jobs(subscription_id, payload)
    select s.id, v_payload
    from public.admin_push_subscriptions s;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.queue_admin_push() from public, anon, authenticated;
commit;
