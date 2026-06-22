-- ============================================================
-- Fit Tracker PRO — Google OAuth Support (0003)
-- Run this AFTER 0001_init.sql and 0002_meal_prep.sql.
--
-- Google sign-in provides a different metadata shape than the
-- app's own signup form (no gender/goal/weight/height — those
-- only exist for email signups where the app's Step 2 form
-- collects them). This updates handle_new_user() to pull name
-- and avatar from whichever fields are present, and leaves the
-- fitness fields at their column defaults for Google users —
-- the existing "Personalize your goals" prompt on the
-- Dashboard already nudges them to fill those in afterward.
--
-- No table changes — this only replaces the trigger function,
-- which is safe to re-run.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, gender, goal, weight, height, preferred_unit, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce(new.raw_user_meta_data->>'gender', 'male'),
    coalesce(new.raw_user_meta_data->>'goal', 'get_fit'),
    nullif(new.raw_user_meta_data->>'weight', '')::numeric,
    nullif(new.raw_user_meta_data->>'height', '')::numeric,
    coalesce(new.raw_user_meta_data->>'preferred_unit', 'metric'),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger itself is unchanged — it already points at this function name,
-- so no need to drop/recreate it.

-- ============================================================
-- End of migration 0003.
--
-- Remaining step is NOT in SQL — enable the Google provider in
-- Supabase Dashboard → Authentication → Providers → Google,
-- using a Client ID/Secret from Google Cloud Console. See the
-- setup notes in GOOGLE_SIGNIN_SETUP.md for the full walkthrough.
-- ============================================================
