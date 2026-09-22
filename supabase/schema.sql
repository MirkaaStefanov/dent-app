-- ==============================================================================
-- СХЕМА ЗА ДЕНТАЛЕН КАБИНЕТ ТЪРГОВИЩЕ (SUPABASE POSTGRESQL)
-- ==============================================================================

-- 1. ТАБЛИЦА: ПРОФИЛИ (Админ и Потребители с Google Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  phone text,
  role text default 'patient' check (role in ('admin', 'patient')),
  created_at timestamptz default now()
);

-- 2. ТАБЛИЦА: ДЕНТАЛНИ УСЛУГИ
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_minutes integer not null default 30,
  price_bgn decimal(10, 2) not null,
  category text default 'Обща стоматология',
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 3. ТАБЛИЦА: РАБОТНО ВРЕМЕ ПО ДНИ ОТ СЕДМИЦАТА (0=Неделя ... 6=Събота)
create table if not exists public.working_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 0 and 6) unique,
  day_name text not null,
  is_working boolean default true,
  start_time time not null default '09:00:00',
  end_time time not null default '18:00:00',
  break_start time default '13:00:00',
  break_end time default '14:00:00'
);

-- 4. ТАБЛИЦА: ПОЧИВНИ ДНИ, ОТПУСКИ И НЕРАБОТНИ ДНИ
create table if not exists public.days_off (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  reason text not null,
  is_full_day boolean default true,
  created_at timestamptz default now()
);

-- 5. ТАБЛИЦА: ЗАПАЗЕНИ ЧАСОВЕ (РЕЗЕРВАЦИИ)
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete set null,
  patient_name text not null,
  patient_phone text not null,
  patient_email text,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  notes text,
  booked_by text default 'patient' check (booked_by in ('patient', 'admin')),
  reminder_sent boolean default false,
  created_at timestamptz default now()
);

-- 6. ТАБЛИЦА: НАСТРОЙКИ НА КАБИНЕТА
create table if not exists public.clinic_settings (
  id uuid primary key default gen_random_uuid(),
  doctor_name text not null default 'Д-р Джанел Аяз',
  title text not null default 'Дентален Център & Естетика',
  city text not null default 'Търговище',
  address text not null default 'бул. „Васил Левски“ 12, ет. 2, каб. 4',
  phone text not null default '+359 88 812 3456',
  email text not null default 'dentist.targovishte@gmail.com',
  slot_interval_minutes integer default 15,
  reminder_hours_before integer default 24
);

-- ==============================================================================
-- СИГУРНОСТ И ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.working_hours enable row level security;
alter table public.days_off enable row level security;
alter table public.appointments enable row level security;
alter table public.clinic_settings enable row level security;

-- Услуги: Всеки може да чете активните услуги
create policy "Public can read active services"
  on public.services for select
  using (is_active = true);

-- Работно време: Всеки може да чете работното време
create policy "Public can read working hours"
  on public.working_hours for select
  using (true);

-- Почивни дни: Всеки може да вижда кога кабинетът почива
create policy "Public can read days off"
  on public.days_off for select
  using (true);

-- Настройки: Всеки може да чете контактите
create policy "Public can read clinic settings"
  on public.clinic_settings for select
  using (true);

-- Часове: Пациентите могат да записват час (INSERT)
create policy "Public can create appointments"
  on public.appointments for insert
  with check (true);

-- Часове: Само логнати администратори могат да виждат личните данни на всички пациенти
create policy "Admins can view all appointments"
  on public.appointments for select
  using (auth.role() = 'authenticated');

create policy "Admins can update appointments"
  on public.appointments for update
  using (auth.role() = 'authenticated');

create policy "Admins can delete appointments"
  on public.appointments for delete
  using (auth.role() = 'authenticated');

-- Администраторът управлява услугите, графика и настройките
create policy "Admins can manage services"
  on public.services for all
  using (auth.role() = 'authenticated');

create policy "Admins can manage working hours"
  on public.working_hours for all
  using (auth.role() = 'authenticated');

create policy "Admins can manage days off"
  on public.days_off for all
  using (auth.role() = 'authenticated');

create policy "Admins can manage clinic settings"
  on public.clinic_settings for all
  using (auth.role() = 'authenticated');

-- ==============================================================================
-- СИГУРНА ФУНКЦИЯ ЗА СВОБОДНИ ЧАСОВЕ (RPC)
-- ==============================================================================
create or replace function get_booked_slots_for_date(p_date date)
returns table (start_time time, end_time time)
language sql
security definer
as $$
  select start_time, end_time
  from public.appointments
  where date = p_date and status != 'cancelled';
$$;

-- ==============================================================================
-- НАЧАЛНИ ДАННИ (SEED DATA)
-- ==============================================================================
insert into public.clinic_settings (doctor_name, title, city, address, phone, email, slot_interval_minutes, reminder_hours_before)
values (
  'Д-р Джанел Аяз',
  'Дентален Център & Естетична Стоматология',
  'Търговище',
  'бул. „Васил Левски“ №12, ет. 2, каб. 4',
  '+359 88 812 3456',
  'dr.ayaz.dent@gmail.com',
  15,
  24
) on conflict do nothing;

insert into public.working_hours (day_of_week, day_name, is_working, start_time, end_time, break_start, break_end)
values
  (1, 'Понеделник', true, '09:00', '18:00', '13:00', '14:00'),
  (2, 'Вторник',    true, '09:00', '18:00', '13:00', '14:00'),
  (3, 'Сряда',      true, '09:00', '18:00', '13:00', '14:00'),
  (4, 'Четвъртък',   true, '09:00', '18:00', '13:00', '14:00'),
  (5, 'Петък',      true, '09:00', '17:00', '13:00', '14:00'),
  (6, 'Събота',     false, '10:00', '14:00', null, null),
  (0, 'Неделя',     false, '10:00', '14:00', null, null)
on conflict (day_of_week) do nothing;

insert into public.services (title, description, duration_minutes, price_bgn, category, sort_order)
values
  ('Обстоен първичен преглед & План за лечение', 'Пълен статус на зъбите и венците, консултация, изготвяне на персонален терапевтичен план.', 30, 40.00, 'Профилактика', 1),
  ('Почистване на зъбен камък с ултразвук & AirFlow полиране', 'Премахване на подвенечен и надвенечен зъбен камък, AirFlow полиране със сода и флуоризация.', 45, 80.00, 'Хигиена & Профилактика', 2),
  ('Лечение на кариес с фотополимерна обтурация (пломба)', 'Анатомично възстановяване на зъба с високоякостен японски фотополимер с естествен цвят.', 45, 90.00, 'Терапия', 3),
  ('Ендодонтско лечение (Кореново лечение)', 'Механична и медикаментозна обработка на коренови канали с микромотор и 3D запълване.', 60, 140.00, 'Ендодонтия', 4),
  ('Професионално избелване на зъби (Кабинетно)', 'Безопасно изсветляване на емайла с до 6-8 нюанса чрез LED активация и реминерализиращ гел.', 60, 260.00, 'Естетика', 5),
  ('Циркониева коронка / мост', 'Максимална здравина, биосъвместимост и съвършена естетика без метален кант.', 60, 450.00, 'Протезиране', 6),
  ('Детски преглед и лечение на млечно зъбче', 'Внимателен и спокоен подход към малките пациенти, поставяне на цветна пломба или силанизиране.', 30, 50.00, 'Детска стоматология', 7)
on conflict do nothing;
