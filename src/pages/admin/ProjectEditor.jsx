import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createProject, updateProject, getProjectByIdAdmin, getCategories, getTechnologies, createTechnology,
} from '../../supabase/database';
import { uploadFile, validateFile, deleteFile } from '../../cloudinary/storage';
import RepeaterField, { StringListField } from '../../components/admin/RepeaterField';
import GalleryManager from '../../components/admin/GalleryManager';
import DocumentsManager from '../../components/admin/DocumentsManager';
import SourceCodeManager from '../../components/admin/SourceCodeManager';
import VideosManager from '../../components/admin/VideosManager';
import { Spinner } from '../../components/shared/States';
import { useToast } from '../../context/ToastContext';

const TABS = ['Details', 'Specs & Objectives', 'Team & Links', 'Gallery', 'Documents', 'Source Code', 'Videos'];

const EMPTY_PROJECT = {
  title: '', slug: '', shortDescription: '', description: '',
  categoryId: '', categoryName: '', technologies: [],
  status: 'in-progress', published: false,
  coverImage: null,
  objectives: [], features: [], hardware: [], software: [], githubLinks: [], team: [],
  order: 0,
};

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function ProjectEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [project, setProject] = useState(isNew ? EMPTY_PROJECT : null);
  const [categories, setCategories] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [tab, setTab] = useState('Details');
  const [saving, setSaving] = useState(false);
  const [coverProgress, setCoverProgress] = useState(null);
  const [newTech, setNewTech] = useState('');
  const [slugTouched, setSlugTouched] = useState(!isNew);

  useEffect(() => {
    getCategories().then(setCategories);
    getTechnologies().then(setTechnologies);
    if (!isNew) getProjectByIdAdmin(id).then(setProject);
  }, [id, isNew]);

  if (!project) return <Spinner label="Loading project…" />;

  function set(key, value) { setProject((p) => ({ ...p, [key]: value })); }

  function handleTitleChange(title) {
    set('title', title);
    if (!slugTouched) set('slug', slugify(title));
  }

  function handleCategoryChange(categoryId) {
    const cat = categories.find((c) => c.id === categoryId);
    setProject((p) => ({ ...p, categoryId, categoryName: cat?.name || '' }));
  }

  function toggleTechnology(name) {
    setProject((p) => ({
      ...p,
      technologies: p.technologies.includes(name)
        ? p.technologies.filter((t) => t !== name)
        : [...p.technologies, name],
    }));
  }

  async function addNewTechnology() {
    if (!newTech.trim()) return;
    const id = await createTechnology({ name: newTech.trim() });
    const tech = { id, name: newTech.trim() };
    setTechnologies((t) => [...t, tech]);
    toggleTechnology(tech.name);
    setNewTech('');
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      validateFile(file, 'image');
    } catch (err) {
      toast.error(err.message);
      return;
    }
    setCoverProgress(0);
    try {
      if (project.coverImage?.path) {
        try {
          await deleteFile(project.coverImage.path);
        } catch (err) {
          // Don't let a failed cleanup of the OLD cover block uploading
          // the new one — surface it, but keep going.
          toast.error(`Old cover image may still exist in Cloudinary: ${err.message}`);
        }
      }
      const result = await uploadFile(`projects/${project.id || 'new'}/cover`, file, setCoverProgress);
      set('coverImage', { url: result.url, path: result.path });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCoverProgress(null);
    }
  }

  async function handleSave(publish) {
    if (!project.title.trim()) { toast.error('Give the project a title first.'); setTab('Details'); return; }
    if (!project.slug.trim()) { toast.error('The project needs a URL slug.'); setTab('Details'); return; }
    setSaving(true);
    try {
      const payload = { ...project, published: publish ?? project.published };
      delete payload.id;
      if (isNew) {
        const newId = await createProject(payload);
        toast.success('Project created.');
        navigate(`/admin/projects/${newId}`, { replace: true });
      } else {
        await updateProject(project.id, payload);
        toast.success('Changes saved.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{isNew ? 'New project' : project.title || 'Untitled project'}</h1>
          <p>{isNew ? 'Fill in the details, then save to unlock gallery and file uploads.' : 'Changes are saved on demand — remember to save each tab.'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" disabled={saving} onClick={() => handleSave()}>Save draft</button>
          <button className="btn btn--primary" disabled={saving} onClick={() => handleSave(true)}>
            {project.published ? 'Save & keep published' : 'Save & publish'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }} className="checkerboard-scroll">
        {TABS.map((t) => {
          const locked = isNew && t !== 'Details' && t !== 'Specs & Objectives' && t !== 'Team & Links';
          return (
            <button
              key={t}
              onClick={() => !locked && setTab(t)}
              disabled={locked}
              className="btn btn--ghost"
              style={{
                borderRadius: 0, borderBottom: tab === t ? '2px solid var(--signal)' : '2px solid transparent',
                color: tab === t ? 'var(--signal)' : locked ? 'var(--text-faint)' : 'var(--text-dim)',
                whiteSpace: 'nowrap',
              }}
              title={locked ? 'Save the project first' : ''}
            >
              {t}
            </button>
          );
        })}
      </div>

      {tab === 'Details' && (
        <div className="panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="Title">
            <input className="input" value={project.title} onChange={(e) => handleTitleChange(e.target.value)} />
          </Field>
          <Field label="URL slug">
            <input className="input mono" value={project.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} />
          </Field>
          <Field label="Short description (shown on the project card)">
            <input className="input" maxLength={160} value={project.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} />
          </Field>
          <Field label="Full description">
            <textarea className="textarea" rows={8} value={project.description} onChange={(e) => set('description', e.target.value)} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <Field label="Category">
              <select className="select" value={project.categoryId} onChange={(e) => handleCategoryChange(e.target.value)}>
                <option value="">Select a category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="select" value={project.status} onChange={(e) => set('status', e.target.value)}>
                <option value="planning">Planning</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </div>

          <Field label="Technologies">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {technologies.map((t) => (
                <button
                  type="button" key={t.id}
                  className={`filter-chip ${project.technologies.includes(t.name) ? 'active' : ''}`}
                  onClick={() => toggleTechnology(t.name)}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Add a new technology…" value={newTech} onChange={(e) => setNewTech(e.target.value)} style={{ maxWidth: 220 }} />
              <button type="button" className="btn" onClick={addNewTechnology}>Add</button>
            </div>
          </Field>

          <Field label="Cover image">
            {project.coverImage?.url && <img src={project.coverImage.url} alt="" style={{ width: 220, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 10, display: 'block' }} />}
            <label className="btn" style={{ display: 'inline-flex' }}>
              {coverProgress === null ? 'Upload cover image' : `Uploading… ${coverProgress}%`}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} disabled={coverProgress !== null} />
            </label>
          </Field>
        </div>
      )}

      {tab === 'Specs & Objectives' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <TabSection title="Objectives">
            <StringListField value={project.objectives} onChange={(v) => set('objectives', v)} placeholder="What this project sets out to achieve" addLabel="+ Add objective" />
          </TabSection>
          <TabSection title="Features">
            <RepeaterField
              value={project.features} onChange={(v) => set('features', v)}
              fields={[{ key: 'title', placeholder: 'Feature name' }, { key: 'description', placeholder: 'Short description' }]}
              emptyRow={{ title: '', description: '' }} addLabel="+ Add feature"
            />
          </TabSection>
          <TabSection title="Hardware components">
            <RepeaterField
              value={project.hardware} onChange={(v) => set('hardware', v)}
              fields={[{ key: 'name', placeholder: 'e.g. ESP32 DevKit' }, { key: 'qty', placeholder: 'Qty' }, { key: 'notes', placeholder: 'Notes' }]}
              emptyRow={{ name: '', qty: '', notes: '' }} addLabel="+ Add component"
            />
          </TabSection>
          <TabSection title="Software & stack">
            <RepeaterField
              value={project.software} onChange={(v) => set('software', v)}
              fields={[{ key: 'name', placeholder: 'e.g. Arduino IDE, Firebase' }, { key: 'notes', placeholder: 'Notes' }]}
              emptyRow={{ name: '', notes: '' }} addLabel="+ Add software"
            />
          </TabSection>
        </div>
      )}

      {tab === 'Team & Links' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <TabSection title="GitHub / repository links">
            <RepeaterField
              value={project.githubLinks} onChange={(v) => set('githubLinks', v)}
              fields={[{ key: 'label', placeholder: 'Label, e.g. Firmware repo' }, { key: 'url', placeholder: 'https://github.com/…' }]}
              emptyRow={{ label: '', url: '' }} addLabel="+ Add link"
            />
          </TabSection>
          <TabSection title="Team members">
            <RepeaterField
              value={project.team} onChange={(v) => set('team', v)}
              fields={[
                { key: 'name', placeholder: 'Name' }, { key: 'role', placeholder: 'Role' },
                { key: 'linkedin', placeholder: 'LinkedIn URL' }, { key: 'github', placeholder: 'GitHub URL' },
              ]}
              emptyRow={{ name: '', role: '', linkedin: '', github: '' }} addLabel="+ Add team member"
            />
          </TabSection>
        </div>
      )}

      {tab === 'Gallery' && <TabSection title="Gallery & diagrams"><GalleryManager projectId={project.id} /></TabSection>}
      {tab === 'Documents' && <TabSection title="Reports, manuals & presentations"><DocumentsManager projectId={project.id} /></TabSection>}
      {tab === 'Source Code' && <TabSection title="Source code archives"><SourceCodeManager projectId={project.id} /></TabSection>}
      {tab === 'Videos' && <TabSection title="Demo videos"><VideosManager projectId={project.id} /></TabSection>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function TabSection({ title, children }) {
  return (
    <div className="panel" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 15, marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  );
}
