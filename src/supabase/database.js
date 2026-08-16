import { supabase } from './config';

/*
  Postgres schema (see supabase/schema.sql for the full definition + RLS):

  admins                    -> id (= auth.users.id), email
  settings                  -> single row, id = 'site'
  categories                -> id, name, slug, sort_order
  technologies              -> id, name
  projects
    id, title, slug, short_description, description
    category_id, category_name, technologies (text[])
    hardware/software/features/github_links/team (jsonb arrays)
    status, published, cover_image (jsonb), sort_order, views
    created_at, updated_at
  project_gallery           -> project_id, url, path, caption, type, sort_order
  project_documents         -> project_id, url, path, name, category, size, content_type
  project_source_code       -> project_id, url, path, name, size, version, description
  project_videos            -> project_id, title, url, provider, path, sort_order
  project_telemetry         -> project_id (pk), status, temperature, humidity,
                                battery_level, alerts, last_seen

  This file translates between the app's camelCase JS objects and Postgres's
  snake_case columns, so every component that already called
  getPublishedProjects()/createProject()/listSubItems() etc. keeps working
  unchanged — only the internals here talk to Postgres instead of Firestore.
*/

const SUBTABLES = {
  gallery: 'project_gallery',
  documents: 'project_documents',
  sourceCode: 'project_source_code',
  videos: 'project_videos',
};
const DEFAULT_ORDER_COLUMN = {
  gallery: 'sort_order', documents: 'category', sourceCode: 'created_at', videos: 'sort_order',
};

// "order" is the one field name that isn't a simple camelCase<->snake_case
// conversion (it maps to the sort_order column) — everything else
// (shortDescription, categoryId, coverImage, githubLinks, deviceToken,
// contentType, createdAt, ...) round-trips through the generic converters.
const SPECIAL_TO_DB = { order: 'sort_order' };
const SPECIAL_TO_JS = { sort_order: 'order' };

function camelToSnake(str) { return str.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`); }
function snakeToCamel(str) { return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()); }
function toDbKey(key) { return SPECIAL_TO_DB[key] || camelToSnake(key); }
function toJsKey(key) { return SPECIAL_TO_JS[key] || snakeToCamel(key); }

function toDb(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[toDbKey(k)] = v;
  }
  return out;
}
function toJs(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[toJsKey(k)] = v;
  return out;
}
function check(error) { if (error) throw error; }

// ---------- Projects (public reads: published only) ----------

export async function getPublishedProjects({ categoryId, technology, status, search } = {}) {
  let q = supabase.from('projects').select('*').eq('published', true).order('sort_order', { ascending: true });
  if (categoryId) q = q.eq('category_id', categoryId);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  check(error);
  let items = (data || []).map(toJs);
  // Technology and free-text search are filtered client-side — fine for a
  // showcase with dozens–low hundreds of projects.
  if (technology) items = items.filter((p) => p.technologies?.includes(technology));
  if (search) {
    const s = search.toLowerCase();
    items = items.filter(
      (p) =>
        p.title?.toLowerCase().includes(s) ||
        p.shortDescription?.toLowerCase().includes(s) ||
        p.technologies?.some((t) => t.toLowerCase().includes(s))
    );
  }
  return items;
}

export async function getProjectBySlug(slug) {
  const { data, error } = await supabase.from('projects').select('*').eq('slug', slug).eq('published', true).maybeSingle();
  check(error);
  return data ? toJs(data) : null;
}

export async function incrementProjectViews(projectId) {
  const { error } = await supabase.rpc('increment_project_views', { p_project_id: projectId });
  check(error);
}

// ---------- Projects (admin: all projects, including drafts) ----------

export async function getAllProjectsAdmin() {
  const { data, error } = await supabase.from('projects').select('*').order('sort_order', { ascending: true });
  check(error);
  return (data || []).map(toJs);
}

export async function getProjectByIdAdmin(id) {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  check(error);
  return data ? toJs(data) : null;
}

export async function createProject(data) {
  const payload = toDb({ ...data, published: data.published ?? false, views: 0 });
  delete payload.id;
  const { data: row, error } = await supabase.from('projects').insert(payload).select('id').single();
  check(error);
  return row.id;
}

export async function updateProject(id, data) {
  const payload = toDb(data);
  delete payload.id;
  delete payload.created_at;
  const { error } = await supabase.from('projects').update(payload).eq('id', id);
  check(error);
}

export async function setProjectPublished(id, published) {
  const { error } = await supabase.from('projects').update({ published }).eq('id', id);
  check(error);
}

/** Every file (Cloudinary) path referenced by a project — cover image plus
 *  every gallery/document/source-code/video row. Used by the admin panel
 *  to clean up Cloudinary before deleting the project row (Postgres
 *  CASCADE removes the child rows, but has no idea Cloudinary exists). */
export async function getProjectFilePaths(projectId) {
  const [proj, gallery, documents, sourceCode, videos] = await Promise.all([
    supabase.from('projects').select('cover_image').eq('id', projectId).maybeSingle(),
    supabase.from('project_gallery').select('path').eq('project_id', projectId),
    supabase.from('project_documents').select('path').eq('project_id', projectId),
    supabase.from('project_source_code').select('path').eq('project_id', projectId),
    supabase.from('project_videos').select('path').eq('project_id', projectId),
  ]);
  const paths = [];
  if (proj.data?.cover_image?.path) paths.push(proj.data.cover_image.path);
  for (const res of [gallery, documents, sourceCode, videos]) {
    (res.data || []).forEach((row) => row.path && paths.push(row.path));
  }
  return paths;
}

export async function deleteProject(id) {
  // ON DELETE CASCADE in supabase/schema.sql removes gallery/documents/
  // sourceCode/videos/telemetry rows automatically. It does NOT delete the
  // Cloudinary files those rows referenced — call getProjectFilePaths()
  // and deleteFile() on each before calling this (ProjectList.jsx does).
  const { error } = await supabase.from('projects').delete().eq('id', id);
  check(error);
}

export async function reorderProjects(orderedIds) {
  await Promise.all(orderedIds.map((id, index) => supabase.from('projects').update({ sort_order: index }).eq('id', id)));
}

// ---------- Subcollection-equivalent tables ----------

export async function listSubItems(projectId, name, orderField) {
  const table = SUBTABLES[name];
  const col = orderField ? toDbKey(orderField) : DEFAULT_ORDER_COLUMN[name];
  const { data, error } = await supabase.from(table).select('*').eq('project_id', projectId).order(col, { ascending: true });
  check(error);
  return (data || []).map(toJs);
}

export async function addSubItem(projectId, name, data) {
  const table = SUBTABLES[name];
  const payload = toDb({ ...data, projectId });
  const { data: row, error } = await supabase.from(table).insert(payload).select('id').single();
  check(error);
  return row.id;
}

export async function updateSubItem(projectId, name, itemId, data) {
  const table = SUBTABLES[name];
  const { error } = await supabase.from(table).update(toDb(data)).eq('id', itemId);
  check(error);
}

export async function deleteSubItem(projectId, name, itemId) {
  const table = SUBTABLES[name];
  const { error } = await supabase.from(table).delete().eq('id', itemId);
  check(error);
}

export async function reorderSubItems(projectId, name, orderedIds) {
  const table = SUBTABLES[name];
  await Promise.all(orderedIds.map((id, index) => supabase.from(table).update({ sort_order: index }).eq('id', id)));
}

// ---------- Telemetry (real-time read path for future IoT integration) ----------

export function watchTelemetry(projectId, callback) {
  let active = true;

  supabase.from('project_telemetry').select('*').eq('project_id', projectId).maybeSingle()
    .then(({ data, error }) => {
      if (!active) return;
      if (error) { console.error('Initial telemetry fetch failed:', error); return; }
      callback(data ? toJs(data) : null);
    });

  const channel = supabase
    .channel(`telemetry-${projectId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'project_telemetry', filter: `project_id=eq.${projectId}` },
      (payload) => {
        if (!active) return;
        if (payload.eventType === 'DELETE') { callback(null); return; }
        callback(payload.new ? toJs(payload.new) : null);
      }
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

// ---------- Categories ----------

export async function getCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
  check(error);
  return (data || []).map(toJs);
}

export async function createCategory(data) {
  const { data: row, error } = await supabase.from('categories').insert(toDb(data)).select('id').single();
  check(error);
  return row.id;
}

export async function updateCategory(id, data) {
  const { error } = await supabase.from('categories').update(toDb(data)).eq('id', id);
  check(error);
}

export async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  check(error);
}

// ---------- Technologies ----------

export async function getTechnologies() {
  const { data, error } = await supabase.from('technologies').select('*').order('name', { ascending: true });
  check(error);
  return (data || []).map(toJs);
}

export async function createTechnology(data) {
  const { data: row, error } = await supabase.from('technologies').insert(toDb(data)).select('id').single();
  check(error);
  return row.id;
}

export async function deleteTechnology(id) {
  const { error } = await supabase.from('technologies').delete().eq('id', id);
  check(error);
}

// ---------- Site settings ----------

export async function getSiteSettings() {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 'site').maybeSingle();
  check(error);
  return data ? toJs(data) : null;
}

export async function updateSiteSettings(data) {
  const { error } = await supabase.from('settings').update(toDb(data)).eq('id', 'site');
  check(error);
}
