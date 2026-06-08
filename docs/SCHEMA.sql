-- Atlas Phase 2 database schema.
-- Paste the entire file into Supabase → SQL Editor and click Run.
-- Idempotent: safe to re-run if you tweak something.

-- Useful for shorter UUID literals; Supabase has this preinstalled.
create extension if not exists "pgcrypto";

-- ─── folders ──────────────────────────────────────────────────────────────
create table if not exists public.folders (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  name                  text not null,
  accent                text not null default 'slate',
  position              integer not null default 0,
  drive_folder_id       text,
  drive_folder_name     text,
  drive_last_synced_at  timestamptz,
  created_at            timestamptz not null default now()
);
create index if not exists folders_user_position_idx
  on public.folders (user_id, position);

-- ─── links ────────────────────────────────────────────────────────────────
create table if not exists public.links (
  id              uuid primary key default gen_random_uuid(),
  folder_id       uuid not null references public.folders(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  url             text not null,
  position        integer not null default 0,
  pinned          boolean not null default false,
  source          text not null default 'manual' check (source in ('manual','drive')),
  drive_file_id   text,
  created_at      timestamptz not null default now(),
  -- Prevent re-importing the same Drive file twice into the same folder.
  unique (folder_id, drive_file_id)
);
create index if not exists links_folder_position_idx
  on public.links (folder_id, position);
create index if not exists links_user_pinned_idx
  on public.links (user_id) where pinned;

-- ─── recent (last 10 opened, per user) ────────────────────────────────────
create table if not exists public.recent (
  user_id    uuid not null references auth.users(id) on delete cascade,
  link_id    uuid not null references public.links(id) on delete cascade,
  opened_at  timestamptz not null default now(),
  primary key (user_id, link_id)
);
create index if not exists recent_user_opened_idx
  on public.recent (user_id, opened_at desc);

-- ─── settings (per user) ──────────────────────────────────────────────────
create table if not exists public.settings (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  theme                 text not null default 'dark' check (theme in ('light','dark')),
  dismissed_popup_hint  boolean not null default false,
  updated_at            timestamptz not null default now()
);

-- ─── drive_tokens (server-only Google refresh tokens) ─────────────────────
-- Stored once at /auth/callback. Read only via the service role from the
-- /api/drive/refresh route — clients can never read it.
create table if not exists public.drive_tokens (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  refresh_token  text not null,
  updated_at     timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────
alter table public.folders        enable row level security;
alter table public.links          enable row level security;
alter table public.recent         enable row level security;
alter table public.settings       enable row level security;
alter table public.drive_tokens   enable row level security;

-- Folders: a user can only see/modify their own.
drop policy if exists "folders are owned" on public.folders;
create policy "folders are owned" on public.folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Links: same — but checked against the user_id column on the row itself.
drop policy if exists "links are owned" on public.links;
create policy "links are owned" on public.links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Recent: same.
drop policy if exists "recent is owned" on public.recent;
create policy "recent is owned" on public.recent
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Settings: same.
drop policy if exists "settings are owned" on public.settings;
create policy "settings are owned" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Drive tokens: NO authenticated-user access. Service role only.
-- (No policy = no access under RLS for the `authenticated` role.)
-- Service role bypasses RLS, which is exactly what the refresh API route uses.
