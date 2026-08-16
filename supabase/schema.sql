-- IoT Project Showcase — Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- It creates every table, an is_admin() helper, and Row Level Security
-- policies equivalent to the old firestore.rules: public read of published
-- content, admin-only writes, gated by the `admins` table (not just "any
-- logged-in user" — see the is_admin() function below).

create extension if not exists pgcrypto;

-- ---------- admins ----------
-- One row per admin, keyed by their Supabase Auth user id. Provision this
-- from the SQL Editor or Table Editor only — never exposed to writes from
-- the client (see policies below).
create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from admins where id = auth.uid());
$$;

-- ---------- settings (single row) ----------
create table settings (
  id text primary key default 'site',
  site_name text default '',
  description text default '',
  logo_url text,
  logo_path text,
  contact_email text,
  contact_phone text,
  address text,
  social jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into settings (id) values ('site');

-- ---------- categories ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  sort_order integer not null default 0
);

-- ---------- technologies ----------
create table technologies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- ---------- projects ----------
create table projects (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  slug text not null unique,
  short_description text default '',
  description text default '',
  category_id uuid references categories(id) on delete set null,
  category_name text default '',
  technologies text[] not null default '{}',
  status text not null default 'in-progress'
    check (status in ('planning', 'in-progress', 'completed', 'archived')),
  published boolean not null default false,
  cover_image jsonb, -- { url, path }
  objectives text[] not null default '{}',
  features jsonb not null default '[]',       -- [{ title, description }]
  hardware jsonb not null default '[]',        -- [{ name, qty, notes }]
  software jsonb not null default '[]',        -- [{ name, notes }]
  github_links jsonb not null default '[]',    -- [{ label, url }]
  team jsonb not null default '[]',            -- [{ name, role, linkedin, github, photoUrl }]
  device_token text,                            -- optional, for the telemetry endpoint
  views integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_published_order_idx on projects (published, sort_order);
create index projects_slug_idx on projects (slug);
create index projects_category_idx on projects (category_id);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();

-- ---------- project_gallery ----------
create table project_gallery (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  url text not null,
  path text not null,       -- cloudinary "{resourceType}/{publicId}"
  caption text default '',
  type text not null default 'photo' check (type in ('photo', 'circuit', 'architecture')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index project_gallery_project_idx on project_gallery (project_id, sort_order);

-- ---------- project_documents ----------
create table project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  url text not null,
  path text not null,
  name text not null,
  category text not null default 'other'
    check (category in ('report', 'manual', 'presentation', 'datasheet', 'pdf', 'other')),
  size bigint,
  content_type text,
  created_at timestamptz not null default now()
);
create index project_documents_project_idx on project_documents (project_id, category);

-- ---------- project_source_code ----------
create table project_source_code (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  url text not null,
  path text not null,
  name text not null,
  size bigint,
  version text,
  description text,
  content_type text,
  created_at timestamptz not null default now()
);
create index project_source_code_project_idx on project_source_code (project_id, created_at);

-- ---------- project_videos ----------
create table project_videos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  url text not null,
  provider text not null default 'youtube' check (provider in ('youtube', 'upload')),
  path text, -- only set for provider = 'upload'
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index project_videos_project_idx on project_videos (project_id, sort_order);

-- ---------- project_telemetry (one row per project, upserted by devices) ----------
create table project_telemetry (
  project_id uuid primary key references projects(id) on delete cascade,
  status text not null default 'offline' check (status in ('online', 'offline')),
  temperature numeric,
  humidity numeric,
  battery_level numeric,
  alerts jsonb not null default '[]',
  last_seen timestamptz not null default now()
);

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table admins enable row level security;
alter table settings enable row level security;
alter table categories enable row level security;
alter table technologies enable row level security;
alter table projects enable row level security;
alter table project_gallery enable row level security;
alter table project_documents enable row level security;
alter table project_source_code enable row level security;
alter table project_videos enable row level security;
alter table project_telemetry enable row level security;

-- admins: unreadable/unwritable from the client entirely. Provision rows
-- from the SQL Editor (Dashboard) only — is_admin() uses security definer
-- so it can still check membership without this table being readable.
-- (no policies created => RLS default-denies everything on this table)

-- settings: public read, admin write
create policy "settings_public_read" on settings for select using (true);
create policy "settings_admin_write" on settings for all
  using (is_admin()) with check (is_admin());

-- categories / technologies: public read, admin write
create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_write" on categories for all
  using (is_admin()) with check (is_admin());

create policy "technologies_public_read" on technologies for select using (true);
create policy "technologies_admin_write" on technologies for all
  using (is_admin()) with check (is_admin());

-- projects: public can read published rows; admins can read/write everything
create policy "projects_public_read_published" on projects for select
  using (published = true or is_admin());
create policy "projects_admin_insert" on projects for insert
  with check (is_admin());
create policy "projects_admin_update" on projects for update
  using (is_admin()) with check (is_admin());
create policy "projects_admin_delete" on projects for delete
  using (is_admin());

-- Public view-count increments: allow anonymous clients to call the
-- increment_project_views() function below (security definer), instead of
-- granting a blanket public UPDATE on projects.
create or replace function increment_project_views(p_project_id uuid)
returns void
language sql
security definer
as $$
  update projects set views = views + 1 where id = p_project_id and published = true;
$$;

-- Subcollection-equivalent tables: readable if the parent project is
-- published (or the caller is admin); writable by admins only.
create policy "gallery_read" on project_gallery for select using (
  is_admin() or exists (select 1 from projects p where p.id = project_id and p.published)
);
create policy "gallery_admin_write" on project_gallery for all
  using (is_admin()) with check (is_admin());

create policy "documents_read" on project_documents for select using (
  is_admin() or exists (select 1 from projects p where p.id = project_id and p.published)
);
create policy "documents_admin_write" on project_documents for all
  using (is_admin()) with check (is_admin());

create policy "source_code_read" on project_source_code for select using (
  is_admin() or exists (select 1 from projects p where p.id = project_id and p.published)
);
create policy "source_code_admin_write" on project_source_code for all
  using (is_admin()) with check (is_admin());

create policy "videos_read" on project_videos for select using (
  is_admin() or exists (select 1 from projects p where p.id = project_id and p.published)
);
create policy "videos_admin_write" on project_videos for all
  using (is_admin()) with check (is_admin());

-- telemetry: publicly readable (project detail page shows live status),
-- writable by admins from the panel. IoT devices write via the
-- ingest-telemetry Edge Function, which uses the service role key
-- server-side and checks device_token itself — it bypasses RLS entirely,
-- so devices never need Supabase credentials of their own.
create policy "telemetry_read" on project_telemetry for select using (
  is_admin() or exists (select 1 from projects p where p.id = project_id and p.published)
);
create policy "telemetry_admin_write" on project_telemetry for all
  using (is_admin()) with check (is_admin());

-- Enable Realtime so ProjectDetail.jsx's watchTelemetry() gets live
-- updates instead of only the initial fetch.
alter publication supabase_realtime add table project_telemetry;
