# Google Sign-In Setup

The app's code is fully wired up for "Continue with Google" — but Google OAuth requires
credentials from Google's side that only you can create (they're tied to your own Google
account/project). Two steps: Google Cloud Console, then Supabase Dashboard.

## 1. Create OAuth credentials in Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new
   project (or pick an existing one) — top-left project selector → "New Project".
2. Go to **APIs & Services → OAuth consent screen**.
   - User type: **External**
   - Fill in app name ("Fit Tracker PRO"), your support email, and developer contact email.
   - Scopes: the defaults (email, profile, openid) are enough — no need to add more.
   - Add your own email under **Test users** if the consent screen is in "Testing" mode
     (you can publish it later once you're ready for the public).
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**
   - Name: anything, e.g. "Fit Tracker PRO Web"
   - **Authorized redirect URIs** — add exactly this, with your own Supabase project ref:
     ```
     https://vpjtpbhrlqcwuoigukft.supabase.co/auth/v1/callback
     ```
   - Click **Create**. You'll get a **Client ID** and **Client Secret** — copy both, you
     need them in the next step.

## 2. Enable Google in Supabase

1. Open your Supabase project → **Authentication → Providers**.
2. Find **Google** in the list and toggle it on.
3. Paste the **Client ID** and **Client Secret** from step 1.
4. Save.
5. Still in Authentication, go to **URL Configuration** and make sure your app's URLs
   are in the **Redirect URLs** allow list, e.g.:
   ```
   http://localhost:5173/**
   https://your-production-domain.com/**
   ```
   (Supabase blocks redirects to URLs not on this list — without this, Google sign-in
   will appear to work but bounce back to an error page instead of your app.)

## 3. Run the database migration

Run `supabase/migrations/0003_google_oauth.sql` in the Supabase SQL Editor. It updates
the new-user trigger so it correctly pulls a name and profile picture from Google's
sign-in data (Google provides different fields than the app's own email signup form).

## That's it

Once both are saved, the "Continue with Google" button on the Login and Sign Up pages
will work immediately — no app code changes needed, no redeploy required for the
Supabase-side config.

### What happens for a Google-signed-up user

Google doesn't provide gender, weight, height, or fitness goal — those only come from
the app's own Step 2 signup form. A user who signs up via Google skips straight to the
dashboard, where the existing **"Personalize your goals"** banner prompts them to add
their weight and height so their calorie targets are accurate. Their name and profile
photo are pulled in automatically from their Google account.
