# IoT Project Showcase

A full-stack IoT project management and showcase site: a public gallery of
projects with rich detail pages, and a secure admin CMS to manage all of it
without touching code. Built with **React + Vite**, **Supabase** (Postgres
+ Auth + Edge Functions), and **Cloudinary** (file storage). Neither
Supabase's nor Cloudinary's free tiers require a credit card.

## What's included

- **Public site** — project grid with search/category/technology/status
  filters, and a detail page per project covering description, objectives,
  features, hardware, software, gallery images, circuit/architecture
  diagrams, demo videos, GitHub links, source-code downloads, and documents
  (reports, manuals, presentations, PDFs).
- **Admin CMS** (`/admin`, gated by Supabase Auth) — create/edit/publish/
  unpublish/delete/reorder projects; upload, caption, tag, reorder, and
  delete gallery images; manage hardware, software, features, technologies,
  categories, GitHub links, source-code ZIPs, documents, and videos; manage
  site name, logo, description, contact info, and social links.
- **Real-time**: the public site reads live from Postgres, so admin edits
  appear without a redeploy. The telemetry panel on a project page updates
  live via Supabase Realtime.
- **Security**: Postgres Row Level Security restricts writes to
  authenticated admins (checked against an `admins` table allow-list, not
  just "any logged-in user"); file uploads are validated client-side and
  scoped by the Cloudinary upload preset; deleting a file requires a
  signed request that only an Edge Function can make, gated by the same
  admin check the database uses.
- **IoT-ready**: an Edge Function (`supabase/functions/ingest-telemetry`)
  accepts POSTs from ESP32/ESP8266/NodeMCU devices and writes them to the
  `project_telemetry` table, which the project page subscribes to live.

## Project structure

```
src/
  supabase/         config.js (client), auth.js (admin sign-in), database.js (all data access)
  cloudinary/        config.js, storage.js (upload direct to Cloudinary, delete via Edge Function)
  context/           AuthContext (admin session), ToastContext (notifications)
  routes/            ProtectedRoute (guards /admin)
  components/
    public/          Navbar, Footer, ProjectCard, Filters, SignalTrace (hero), PublicLayout
    admin/            AdminLayout, RepeaterField, GalleryManager, DocumentsManager,
                       SourceCodeManager, VideosManager
    shared/           FileUploader, ConfirmDialog, States (spinner/empty/error)
  pages/
    public/          Home, ProjectDetail, About, Contact
    admin/            Login, Dashboard, ProjectList, ProjectEditor, Categories,
                       Technologies, SiteSettings
  styles/            tokens.css (design system), animations.css, components.css
supabase/
  schema.sql          Tables, indexes, RLS policies — run once in the SQL Editor
  functions/
    delete-cloudinary-asset/  Edge Function: signed Cloudinary delete, admin-gated
    ingest-telemetry/          Edge Function: IoT device telemetry endpoint
```

## Setup

### 1. Create a Supabase project

At [supabase.com](https://supabase.com) → New project. Free tier, no card.
Note: free projects pause after 7 days with no activity and need a manual
unpause from the dashboard — fine for development, worth knowing before
you rely on this for a rarely-visited production site.

### 2. Run the schema

Dashboard → **SQL Editor** → New query → paste the entire contents of
`supabase/schema.sql` → Run. This creates every table, the `is_admin()`
helper, and all Row Level Security policies in one shot.

### 3. Create a Cloudinary account

At [cloudinary.com](https://cloudinary.com), free tier, no card.
1. Dashboard → copy your **Cloud name**.
2. Settings → Upload → **Upload presets** → Add upload preset.
   - Signing Mode: **Unsigned**.
   - Optionally restrict folder/format/size so the public preset can't be
     abused for arbitrary uploads.
3. Settings → Access Keys → note your **API Key** and **API Secret** for
   step 6 (not `.env` — the secret never goes in client code).

### 4. Configure environment

```bash
cp .env.example .env
# VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: Dashboard -> Project Settings -> API
# VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET: from step 3
```

### 5. Install and run

```bash
npm install
npm run dev
```

Uploads work immediately. Deleting a file, and IoT telemetry ingestion,
won't work until step 6 is deployed — expected at this point.

### 6. Deploy the Edge Functions

```bash
npm install -g supabase   # if you don't have the CLI
supabase login
supabase link --project-ref your-project-ref   # find this in the project URL or Settings -> General

supabase secrets set CLOUDINARY_CLOUD_NAME=your-cloud-name
supabase secrets set CLOUDINARY_API_KEY=your-api-key
supabase secrets set CLOUDINARY_API_SECRET=your-api-secret

supabase functions deploy delete-cloudinary-asset
supabase functions deploy ingest-telemetry --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already available to
every Edge Function automatically — no need to set those yourself.

The `--no-verify-jwt` flag on `ingest-telemetry` is deliberate: IoT
devices authenticate with their own per-project `device_token` (checked
inside the function), not a Supabase user session.

### 7. Create the first admin account

There's no public sign-up (by design):

1. Dashboard → **Authentication** → Add user (email + password).
2. Dashboard → **Table Editor** → `admins` table → Insert row: `id` =
   that user's UID (copy it from the Authentication tab), `email` = same
   email. Or via SQL Editor:
   ```sql
   insert into admins (id, email) values ('paste-the-uid-here', 'you@example.com');
   ```
3. Sign in at `/admin/login`.

Repeat for any additional admins.

### 8. Seed categories, technologies, and site settings

The admin panel's **Categories** and **Technologies** pages let you add
these directly. **Site settings** are filled in under `/admin/settings` —
the row already exists (created by `schema.sql`), so saving just updates it.

### 9. Deploy the site

Any static host works (Vercel, Netlify, Cloudflare Pages, GitHub Pages)
since this is a plain Vite build:

```bash
npm run build
# then deploy the dist/ folder to your host of choice
```

## Data model

See `supabase/schema.sql` for the authoritative version (tables, indexes,
RLS policies) — this is the shape as the app sees it in JS:

```
admins            → id (references auth.users), email
settings           → single row, id = 'site' → siteName, description, logoUrl, logoPath,
                      contactEmail, contactPhone, address, social: { github, linkedin, twitter, youtube }
categories         → id, name, slug, order
technologies       → id, name

projects
  title, slug, shortDescription, description
  categoryId, categoryName, technologies: string[]
  status: 'planning' | 'in-progress' | 'completed' | 'archived'
  published: boolean, order: number, views: number
  coverImage: { url, path }
  objectives: string[]
  features: [{ title, description }]
  hardware: [{ name, qty, notes }]
  software: [{ name, notes }]
  githubLinks: [{ label, url }]
  team: [{ name, role, linkedin, github, photoUrl }]
  deviceToken: string          (optional — only if using the telemetry endpoint)
  createdAt, updatedAt

  → project_gallery      { url, path, caption, type: 'photo'|'circuit'|'architecture', order }
  → project_documents    { url, path, name, category: 'report'|'manual'|'presentation'|'datasheet'|'pdf'|'other', size, contentType }
  → project_source_code  { url, path, name, size, version, description }
  → project_videos       { title, url, provider: 'youtube'|'upload', path?, order }
  → project_telemetry    { status, temperature, humidity, batteryLevel, alerts[], lastSeen }
```

`src/supabase/database.js` translates between this camelCase JS shape and
Postgres's snake_case columns automatically — every admin/public component
calls the same functions (`getPublishedProjects`, `createProject`,
`listSubItems`, etc.) regardless of the backend underneath.

Simple lists (hardware, software, features, objectives, githubLinks, team)
live as JSONB columns directly on the `projects` row because they're small
and edited together. Anything involving an uploaded file (gallery,
documents, source code, videos) is a real child table with a foreign key
and `ON DELETE CASCADE`, so each item can carry its own Cloudinary
reference for cleanup.

## File storage: Cloudinary

- **Uploads** go straight from the browser to Cloudinary using an
  *unsigned* upload preset — no secret key touches client code. Scope the
  preset (folder restriction, max file size, allowed formats) from the
  Cloudinary dashboard.
- **Deletes** need a *signed* request, which requires the API key and
  secret — those live only as Supabase Edge Function secrets, never in
  `.env` or any file that ships to the browser.
  `delete-cloudinary-asset` checks the caller is a signed-in admin before
  deleting anything.
- Client-side type/size validation in `src/cloudinary/storage.js` is for
  fast UX feedback only — the real guardrails are the Cloudinary preset's
  own restrictions and the admin-only gate on the delete function.

## Security notes

- Admin status is **not** "any signed-in user" — it's gated by a matching
  row in `admins`, checked by every RLS policy in `supabase/schema.sql`
  and by both Edge Functions. Deleting that row revokes access
  immediately even if the person still has a valid session.
- The `admins` table has RLS enabled with **no policies defined**, which
  means it default-denies all client access — not even an admin can read
  it through the API. `is_admin()` uses `security definer` so it can still
  check membership without the table itself being queryable.
- Postgres + PostgREST (what Supabase's client library talks to) rule out
  the injection surface a hand-rolled SQL backend would have to guard
  against manually. React escapes text content by default, covering most
  XSS surface — avoid introducing `dangerouslySetInnerHTML` for
  admin-entered text.
- Rate limiting: Supabase Auth has built-in throttling on failed sign-in
  attempts. The `ingest-telemetry` function is intentionally
  unauthenticated (devices can't hold user sessions) and gated only by
  `device_token` — consider adding a per-project rate limit if you deploy
  it publicly at any scale.

## Future IoT integration

`project_telemetry` is the live-data landing spot: publicly readable for
published projects (`ProjectDetail.jsx` subscribes with `watchTelemetry`
and renders an online/offline LED plus temperature/humidity/battery when
present), writable by admins from the panel, and — for real hardware —
writable via the `ingest-telemetry` Edge Function using a per-project
`device_token`.

To let real hardware report in:

1. Add a `device_token` value to a project (via SQL Editor or extend the
   admin project editor with a field for it — not included by default).
2. From firmware (ESP32/ESP8266/NodeMCU), POST JSON to the function URL
   shown after `supabase functions deploy ingest-telemetry` (looks like
   `https://<project-ref>.supabase.co/functions/v1/ingest-telemetry`):
   ```json
   {
     "projectId": "uuid-of-the-project",
     "deviceToken": "the-token-you-set",
     "status": "online",
     "temperature": 24.5,
     "humidity": 58,
     "batteryLevel": 87,
     "alerts": []
   }
   ```
3. For MQTT-based devices, run a small bridge (Node-RED or a lightweight
   service) that forwards messages to the same endpoint.
4. For offline detection, a scheduled job (Supabase supports `pg_cron`)
   could mark a project's telemetry `status: 'offline'` if `last_seen` is
   older than your timeout window — not included, since the right timeout
   is project-specific.

Never embed a Supabase service-role key in device firmware — the
`device_token` + Edge Function pattern above is the safe boundary between
"physical device on your network" and your database.

## Design notes

The visual language is built from the subject matter itself: a dark PCB
substrate background, a cyan "signal" accent for live/active states and an
amber "LED" accent for in-progress/attention states, `Space Grotesk` for
display type, `Inter` for body copy, and `JetBrains Mono` for anything
data-shaped (status, specs, file sizes). The recurring motif — a small
colored LED dot — appears on cards, the admin table, and the live
telemetry panel, so "is this thing on" reads the same way everywhere in
the product.
