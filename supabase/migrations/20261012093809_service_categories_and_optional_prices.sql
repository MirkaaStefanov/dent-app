begin;
create table public.service_categories (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) > 0),
 sort_order integer not null default 0
);
create unique index service_categories_unique_name on public.service_categories (lower(trim(name)));
alter table public.service_categories enable row level security;
grant select on public.service_categories to anon, authenticated;
grant insert, update, delete on public.service_categories to authenticated;
create policy "Public can read service categories" on public.service_categories for select to anon, authenticated using (true);
create policy "Admins can manage service categories" on public.service_categories for all to authenticated using ((select public.is_clinic_admin())) with check ((select public.is_clinic_admin()));
-- Consolidate overlapping legacy labels before creating reusable categories.
update public.services set category = case trim(category)
 when 'Хигиена & Профилактика' then 'Профилактика'
 when 'Терапия' then 'Лечение'
 when 'Ендодонтия' then 'Лечение'
 else category end;
insert into public.service_categories(name, sort_order)
select name, row_number() over (order by name)::integer from (select distinct coalesce(nullif(trim(category), ''), 'Обща стоматология') as name from public.services) existing;
alter table public.services add column category_id uuid references public.service_categories(id) on delete restrict;
update public.services s set category_id = c.id from public.service_categories c where c.name = coalesce(nullif(trim(s.category), ''), 'Обща стоматология');
create index services_category_id_idx on public.services(category_id);
alter table public.services alter column price_bgn drop not null;
alter table public.services add constraint services_nonnegative_price check (price_bgn is null or price_bgn >= 0);
alter table public.clinic_settings add column show_prices boolean not null default false;
commit;
