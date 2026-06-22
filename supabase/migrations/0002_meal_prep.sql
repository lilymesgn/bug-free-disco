-- ============================================================
-- Fit Tracker PRO — Meal Prep Migration (0002)
-- Run this AFTER 0001_init.sql in the Supabase SQL Editor.
--
-- Adds:
--   • meal_plan_items   — recipes assigned to a date + meal slot
--   • grocery_checked   — persisted checkbox state on the grocery list
--
-- Recipes themselves are NOT a database table — they live in
-- the app as curated content (src/app/services/recipeData.ts),
-- the same pattern used for the exercise database and the
-- common-foods list. meal_plan_items stores a denormalized
-- copy of the recipe name + macros at planning time, so a
-- recipe edit later doesn't retroactively change past plans.
-- ============================================================

-- ════════════════════════════════════════════════════════════════════════════
-- MEAL PLAN ITEMS
-- ════════════════════════════════════════════════════════════════════════════
create table public.meal_plan_items (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  plan_date     date not null,
  meal_type     text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')) default 'dinner',
  recipe_id     text not null,           -- id from the app's recipe catalog
  recipe_name   text not null,           -- denormalized snapshot for display
  servings      numeric not null default 1,
  calories      integer not null default 0,
  protein       numeric not null default 0,
  carbs         numeric not null default 0,
  fat           numeric not null default 0,
  logged        boolean not null default false, -- true once "log as eaten" was tapped
  created_at    timestamptz default now()
);

create index meal_plan_items_user_date_idx on public.meal_plan_items (user_id, plan_date);

alter table public.meal_plan_items enable row level security;

create policy "Users manage own meal plan items"
  on public.meal_plan_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- GROCERY LIST — CHECKED ITEMS
-- Persists which ingredients have been checked off for a given
-- week, so the state survives a refresh / device switch.
-- ════════════════════════════════════════════════════════════════════════════
create table public.grocery_checked_items (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_start  date not null,    -- Monday of the relevant week
  item_key    text not null,    -- normalized "name|unit" key
  checked     boolean not null default true,
  created_at  timestamptz default now(),
  unique (user_id, week_start, item_key)
);

create index grocery_checked_user_week_idx on public.grocery_checked_items (user_id, week_start);

alter table public.grocery_checked_items enable row level security;

create policy "Users manage own grocery checklist"
  on public.grocery_checked_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- End of migration 0002.
-- ============================================================
