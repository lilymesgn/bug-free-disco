-- ============================================================
-- Fit Tracker PRO — Database Schema (Initial Migration)
-- ============================================================
-- Run this entire file once in the Supabase SQL Editor
-- (Project → SQL Editor → New query → paste → Run).
--
-- This creates every table the app needs, indexes for the
-- common query patterns, and Row Level Security policies so
-- each user can only ever read/write their own rows. The
-- anon key used in the client is safe specifically because of
-- these policies.
--
-- Auth: this app uses Supabase Auth (auth.users). The
-- `profiles` table extends auth.users with app-specific
-- fields and is created automatically via a trigger on signup.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════════════
-- PROFILES
-- One row per user, 1:1 with auth.users. Created automatically by the
-- handle_new_user() trigger below when someone signs up.
-- ════════════════════════════════════════════════════════════════════════════
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  name              text not null default '',
  email             text not null,
  gender            text check (gender in ('male', 'female')) default 'male',
  age               integer,
  weight            numeric,                 -- kg
  height            numeric,                 -- cm
  goal              text check (goal in ('lose_weight', 'build_muscle', 'get_fit', 'improve_endurance')) default 'get_fit',
  preferred_unit    text check (preferred_unit in ('metric', 'imperial')) default 'metric',
  subscription      text check (subscription in ('none', 'trial', 'active', 'cancelled')) default 'trial',
  trial_start_date  timestamptz default now(),
  avatar_url        text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
-- Reads name/gender/goal/etc. from the signup metadata if provided.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, gender, goal, weight, height, preferred_unit)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'gender', 'male'),
    coalesce(new.raw_user_meta_data->>'goal', 'get_fit'),
    nullif(new.raw_user_meta_data->>'weight', '')::numeric,
    nullif(new.raw_user_meta_data->>'height', '')::numeric,
    coalesce(new.raw_user_meta_data->>'preferred_unit', 'metric')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at fresh on every profile change
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- ════════════════════════════════════════════════════════════════════════════
-- RUN SESSIONS (GPS activity tracker)
-- ════════════════════════════════════════════════════════════════════════════
create table public.run_sessions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  start_time      timestamptz not null default now(),
  end_time        timestamptz not null default now(),
  duration        integer not null default 0, -- seconds
  distance        numeric not null default 0, -- km
  pace            text not null default '--:--',
  calories        integer not null default 0,
  steps           integer not null default 0,
  avg_heart_rate  integer,
  route           jsonb default '[]'::jsonb,  -- [{lat, lon}, ...] GPS points
  created_at      timestamptz default now()
);

create index run_sessions_user_start_idx on public.run_sessions (user_id, start_time desc);

alter table public.run_sessions enable row level security;

create policy "Users manage own run sessions"
  on public.run_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- WORKOUTS (legacy/simple logged workouts — dashboard quick-log)
-- ════════════════════════════════════════════════════════════════════════════
create table public.workouts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  category    text default 'strength',
  exercises   jsonb default '[]'::jsonb,   -- [{name, sets, reps, weight?, duration?}]
  duration    integer not null default 0, -- minutes
  calories    integer not null default 0,
  notes       text,
  date        timestamptz not null default now(),
  created_at  timestamptz default now()
);

create index workouts_user_date_idx on public.workouts (user_id, date desc);

alter table public.workouts enable row level security;

create policy "Users manage own workouts"
  on public.workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- WORKOUT SESSIONS (from the AI workout builder — richer tracking)
-- ════════════════════════════════════════════════════════════════════════════
create table public.workout_sessions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  plan_name       text not null,
  category        text not null default 'strength',
  exercise_logs   jsonb default '[]'::jsonb, -- [{exerciseId, exerciseName, isTimed, sets:[...], totalDuration?, notes?}]
  start_time      timestamptz not null default now(),
  end_time        timestamptz,
  duration        integer not null default 0, -- minutes
  total_calories  integer not null default 0,
  new_prs         text[] default '{}',
  notes           text,
  created_at      timestamptz default now()
);

create index sessions_user_start_idx on public.workout_sessions (user_id, start_time desc);

alter table public.workout_sessions enable row level security;

create policy "Users manage own sessions"
  on public.workout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- PERSONAL RECORDS
-- ════════════════════════════════════════════════════════════════════════════
create table public.personal_records (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  exercise_id    text not null,
  exercise_name  text not null,
  type           text not null check (type in ('weight', 'reps', 'duration')),
  value          numeric not null,
  unit           text not null check (unit in ('kg', 'reps', 'seconds')),
  date           timestamptz not null default now(),
  workout_id     uuid,
  created_at     timestamptz default now(),
  unique (user_id, exercise_id, type)  -- one current PR per exercise+type; upsert on new record
);

create index prs_user_idx on public.personal_records (user_id);

alter table public.personal_records enable row level security;

create policy "Users manage own PRs"
  on public.personal_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- BODY MEASUREMENTS
-- ════════════════════════════════════════════════════════════════════════════
create table public.body_measurements (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        timestamptz not null default now(),
  weight      numeric,  -- kg
  body_fat    numeric,  -- %
  chest       numeric,  -- cm
  waist       numeric,
  hips        numeric,
  arms        numeric,
  legs        numeric,
  created_at  timestamptz default now()
);

create index measurements_user_date_idx on public.body_measurements (user_id, date desc);

alter table public.body_measurements enable row level security;

create policy "Users manage own measurements"
  on public.body_measurements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- CALORIE / FOOD ENTRIES
-- ════════════════════════════════════════════════════════════════════════════
create table public.food_entries (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  calories    integer not null default 0,
  protein     numeric default 0,
  carbs       numeric default 0,
  fat         numeric default 0,
  fiber       numeric default 0,
  sodium      numeric default 0,
  meal_type   text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')) default 'snack',
  logged_date date not null default current_date,  -- the day this entry counts toward
  logged_time text,                                  -- "HH:MM" display string
  created_at  timestamptz default now()
);

create index food_entries_user_date_idx on public.food_entries (user_id, logged_date desc);

alter table public.food_entries enable row level security;

create policy "Users manage own food entries"
  on public.food_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- WATER INTAKE (one row per user per day, cups count)
-- ════════════════════════════════════════════════════════════════════════════
create table public.water_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  logged_date date not null default current_date,
  cups        integer not null default 0,
  created_at  timestamptz default now(),
  unique (user_id, logged_date)
);

alter table public.water_logs enable row level security;

create policy "Users manage own water logs"
  on public.water_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- SLEEP ENTRIES
-- ════════════════════════════════════════════════════════════════════════════
create table public.sleep_entries (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  sleep_date      date not null default current_date,  -- the night of
  bedtime         text not null,                          -- "HH:MM"
  wake_time       text not null,                          -- "HH:MM"
  duration_hours  numeric not null,
  quality         integer not null check (quality between 1 and 5),
  notes           text,
  created_at      timestamptz default now(),
  unique (user_id, sleep_date)
);

create index sleep_user_date_idx on public.sleep_entries (user_id, sleep_date desc);

alter table public.sleep_entries enable row level security;

create policy "Users manage own sleep entries"
  on public.sleep_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- RECENT FOODS (quick-add suggestions, most recently logged)
-- ════════════════════════════════════════════════════════════════════════════
create table public.recent_foods (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  calories    integer not null default 0,
  protein     numeric default 0,
  carbs       numeric default 0,
  fat         numeric default 0,
  fiber       numeric default 0,
  last_used   timestamptz default now(),
  unique (user_id, name)
);

alter table public.recent_foods enable row level security;

create policy "Users manage own recent foods"
  on public.recent_foods for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- REMINDER SETTINGS (one row per user)
-- ════════════════════════════════════════════════════════════════════════════
create table public.reminder_settings (
  user_id                     uuid primary key references auth.users(id) on delete cascade,
  meal_reminders_enabled      boolean default true,
  workout_reminders_enabled   boolean default true,
  meal_reminder_time          text default '19:00',
  workout_reminder_time       text default '18:00',
  updated_at                  timestamptz default now()
);

alter table public.reminder_settings enable row level security;

create policy "Users manage own reminder settings"
  on public.reminder_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS (mirrors Stripe state; source of truth once webhooks added)
-- ════════════════════════════════════════════════════════════════════════════
create table public.subscriptions (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  plan               text check (plan in ('monthly', 'yearly')),
  status             text check (status in ('active', 'cancelled', 'expired')) default 'active',
  stripe_customer_id text,
  start_date         timestamptz default now(),
  updated_at         timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users view own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users manage own subscription"
  on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "Users update own subscription"
  on public.subscriptions for update using (auth.uid() = user_id);

-- ============================================================
-- End of migration. After running this, your database is
-- ready — every table is created with RLS enforced so each
-- signed-in user can only ever touch their own rows.
-- ============================================================
