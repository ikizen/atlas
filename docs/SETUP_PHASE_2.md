# Atlas — Phase 2 setup

Everything you do **outside the codebase** to enable Google login + Google
Drive Sheet sync. At the end you set 6 values in `.env.local` and in Vercel.
You don't paste any secrets in chat — `vercel env add` prompts for them
directly.

Time estimate: **~20 minutes total**.

You'll end up with:

- A Supabase project (Postgres + Auth)
- A Google Cloud project with Drive API + Picker API enabled, an OAuth 2.0
  Web Client, and a Picker API key
- Supabase Auth wired to your Google OAuth client
- 6 env vars set locally and on Vercel

---

## 1. Supabase project · ~5 min

1. Go to <https://supabase.com/dashboard>. Sign in if needed.
2. Click **New project**.
3. Fill in:
   - **Name:** `atlas`
   - **Database Password:** click **Generate**, then save it in your password
     manager (you won't need it for Atlas, but for psql/admin later).
   - **Region:** closest to you.
   - **Pricing Plan:** Free.
4. Click **Create new project**. Wait ~60 seconds.
5. Sidebar → **Project Settings → API**.
6. **Save these three values** somewhere — you'll need them in step 6:
   - **Project URL** (looks like `https://abcdefghij.supabase.co`)
   - **Project API keys → anon `public`** (long string starting with `eyJ...`)
   - **Project API keys → service_role `secret`** (also `eyJ...`).
     ⚠️ Server-side only. Atlas uses it from a Vercel API route to read
     stored Google refresh tokens. Never exposed to the browser, never
     pasted into any other tool.

---

## 2. Run the database schema · ~2 min

1. In your Supabase project: sidebar → **SQL Editor**.
2. Click **+ New query**.
3. Open `docs/SCHEMA.sql` from this repo (I'll commit it alongside this doc),
   copy its full contents, paste into the SQL editor.
4. Click **Run**. You should see "Success. No rows returned."
5. Sidebar → **Table Editor** to confirm `folders`, `links`, `recent`,
   `settings`, and `drive_tokens` tables exist.

---

## 3. Google Cloud project · ~10 min

### 3a. Create the project

1. Go to <https://console.cloud.google.com/>.
2. Top bar project dropdown → **New Project**.
3. **Project name:** `atlas`. Click **Create**.
4. Once created, pick `atlas` from the top dropdown.

### 3b. Enable two APIs

1. Sidebar → **APIs & Services → Library**.
2. Search **Google Drive API** → click → **Enable**.
3. Sidebar → **APIs & Services → Library** again.
4. Search **Google Picker API** → click → **Enable**.

### 3c. OAuth consent screen

Google Cloud has two different UIs for this. Find yours in the left sidebar:

#### Path A — new "Google Auth Platform" UI

If your sidebar shows **Google Auth Platform** (a multi-step wizard with
Branding, Audience, Clients, Data Access tabs):

1. Sidebar → **APIs & Services → Google Auth Platform**.
2. Click **Get Started** if you see it. Fill the 4-tab wizard:
   - **App information:** App name `Atlas`; User support email = you.
   - **Audience:** **External**. (Internal is only for Google Workspace.)
   - **Contact information:** your email.
   - **Finish:** tick the User Data Policy box. **Continue**.
3. Sidebar → **Google Auth Platform → Branding**. Scroll to
   **Authorized domains** → **+ Add Domain** twice:
   - `supabase.co`
   - `vercel.app`
   Click **Save**.
4. Sidebar → **Google Auth Platform → Data Access** →
   **Add or Remove Scopes**. Search and tick each:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   - `https://www.googleapis.com/auth/drive.readonly`
   Click **Update** → then **Save**.
5. Sidebar → **Google Auth Platform → Audience**. Leave **Publishing status:
   Testing**. Under **Test users** → **+ Add users** → your Google email →
   **Save**.

#### Path B — old "OAuth consent screen" UI

If your sidebar shows **OAuth consent screen** directly:

1. Sidebar → **APIs & Services → OAuth consent screen**.
2. **User Type:** External. **Create**.
3. Fill in: App name `Atlas`; User support email = you; Application home page
   `https://atlas-six-ashen.vercel.app`; **Authorized domains** → add
   `supabase.co` and `vercel.app`; Developer contact = you.
   **Save and Continue**.
4. **Scopes** → **Add or Remove Scopes**. Tick:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   - `https://www.googleapis.com/auth/drive.readonly`
   **Update** → **Save and Continue**.
5. **Test users** → **Add Users** → your Google email → **Save and
   Continue**.
6. **Back to Dashboard**. Leave publishing status as **Testing**.

### 3d. OAuth 2.0 client (web)

1. Sidebar → **APIs & Services → Credentials**.
2. **+ Create Credentials → OAuth client ID**.
3. **Application type:** Web application.
4. **Name:** `Atlas Web Client`.
5. **Authorized JavaScript origins** — **+ Add URI** for each:
   - `http://localhost:3210`
   - `https://atlas-six-ashen.vercel.app`
   - `https://YOUR-SUPABASE-PROJECT.supabase.co` ← replace with your real
     Supabase URL from step 1
6. **Authorized redirect URIs** — **+ Add URI**:
   - `https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback`
7. Click **Create**.
8. A dialog shows **Client ID** and **Client Secret**. Save both somewhere
   safe — you'll need them in step 4 and step 6.

### 3e. API key (for the Google Picker)

1. Sidebar → **APIs & Services → Credentials**.
2. **+ Create Credentials → API key**.
3. Click **Restrict key**.
4. **Name:** `Atlas Picker Key`.
5. **Application restrictions:** **HTTP referrers (websites)**. Click **Add an
   item** for each:
   - `http://localhost:3210/*`
   - `https://atlas-six-ashen.vercel.app/*`
6. **API restrictions:** **Restrict key**. From the dropdown, check **Google
   Picker API** only. (Drive API uses OAuth, not this key.)
7. Click **Save**.
8. Save the **API key** (`AIza...`) for step 6.

---

## 4. Wire Google as a Supabase Auth provider · ~3 min

1. Back in Supabase: sidebar → **Authentication → Sign In / Up → Auth
   Providers**.
2. Find **Google**, click to expand.
3. Toggle **Enable Sign in with Google** on.
4. **Client IDs (for OAuth):** paste the **Client ID** from step 3d.
5. **Client Secret (for OAuth):** paste the **Client Secret** from step 3d.
6. Leave the rest default. **Save**.
7. Sidebar → **Authentication → URL Configuration**.
8. **Site URL:** `https://atlas-six-ashen.vercel.app`
9. **Redirect URLs** → **+ Add URL** for each:
   - `http://localhost:3210/auth/callback`
   - `https://atlas-six-ashen.vercel.app/auth/callback`
10. **Save**.

---

## 5. Set local env vars · ~1 min

In the repo root, copy the template:

```bash
cp .env.local.example .env.local
```

Open `.env.local` in your editor and fill in the six values (the comments in
the file explain each one). Save.

`.env.local` is gitignored. Never commit it.

---

## 6. Set the same vars on Vercel · ~3 min

Run these seven commands from the repo root. Each will prompt you to paste
the value — paste, hit Enter, then pick **Production**, **Preview**, and
**Development** (space to select, Enter to confirm):

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID
npx vercel env add NEXT_PUBLIC_GOOGLE_API_KEY
npx vercel env add GOOGLE_CLIENT_ID
npx vercel env add GOOGLE_CLIENT_SECRET
```

The `NEXT_PUBLIC_*` ones are sent to the browser (safe — they're public by
design: anon key is RLS-gated, Picker key is referrer-restricted, Client ID
is public OAuth). `GOOGLE_CLIENT_SECRET` is server-only and is used by an
Atlas API route to refresh Drive tokens.

> Tip: `GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` have the same
> value. Keeping both lets the API route and the browser each read it from
> their own scope.

---

## 7. Tell me you're done

Send me one message: **"setup done"**. I'll:

1. Verify the vars are set on Vercel (`vercel env ls` — values stay hidden).
2. Trigger a redeploy.
3. Run a login + connect-a-Drive-folder smoke test together.

Then Phase 2 is live.

---

## Troubleshooting

- **"Access blocked: This app's request is invalid"** during Google login →
  the redirect URI in 3d doesn't match Supabase's. It must be **exactly**
  `https://YOUR-PROJECT.supabase.co/auth/v1/callback` with no trailing slash.
- **"Error 403: access_denied"** → you're not in the Test users list (3c.5).
- **Picker shows "An error occurred"** → API key restrictions don't include
  the origin you're loading from. Re-check 3e.5.
- **You signed in but Atlas still shows the login screen** → the Supabase
  Site URL or Redirect URL in step 4 doesn't match where you're loading from.
