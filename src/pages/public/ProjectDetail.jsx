import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getProjectBySlug, incrementProjectViews, listSubItems, watchTelemetry,
} from '../../supabase/database';
import { Spinner, ErrorState } from '../../components/shared/States';

const DOC_LABELS = {
  report: 'Project report', manual: 'User manual', presentation: 'Presentation',
  pdf: 'PDF', datasheet: 'Datasheet', other: 'Document',
};

export default function ProjectDetail() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [sourceCode, setSourceCode] = useState([]);
  const [videos, setVideos] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let unsubTelemetry = null;
    setError(null);
    setProject(null);
    setGallery([]); setDocuments([]); setSourceCode([]); setVideos([]); setTelemetry(null);

    async function loadProject() {
      try {
        const p = await getProjectBySlug(slug);
        if (cancelled) return;
        if (!p) { setError('This project doesn\u2019t exist or isn\u2019t published.'); return; }
        setProject(p);
        incrementProjectViews(p.id).catch(() => {});

        const [g, d, s, v] = await Promise.all([
          listSubItems(p.id, 'gallery'),
          listSubItems(p.id, 'documents', 'category'),
          listSubItems(p.id, 'sourceCode', 'createdAt'),
          listSubItems(p.id, 'videos'),
        ]);
        if (cancelled) return;
        setGallery(g); setDocuments(d); setSourceCode(s); setVideos(v);

        unsubTelemetry = watchTelemetry(p.id, (data) => {
          if (!cancelled) setTelemetry(data);
        });
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load project.');
      }
    }

    loadProject();

    return () => {
      cancelled = true;
      unsubTelemetry?.();
    };
  }, [slug]);

  if (error) return <div className="container" style={{ padding: '80px 0' }}><ErrorState message={error} /></div>;
  if (!project) return <div className="container"><Spinner label="Loading project…" /></div>;

  const docsByCategory = documents.reduce((acc, d) => {
    (acc[d.category] ||= []).push(d);
    return acc;
  }, {});

  return (
    <>
      <section className="container" style={{ paddingTop: 40 }}>
        <Link to="/" className="mono" style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>← All projects</Link>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
          <span className="tag">{project.categoryName}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={`led ${project.status === 'completed' ? 'led--active' : project.status === 'archived' ? 'led--archived' : 'led--progress'}`} />
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>{project.status}</span>
          </span>
        </div>

        <h1 style={{ fontSize: 38, marginBottom: 14, maxWidth: 780 }}>{project.title}</h1>
        <p style={{ fontSize: 16, maxWidth: 680, marginBottom: 20 }}>{project.shortDescription}</p>

        {!!project.technologies?.length && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {project.technologies.map((t) => <span key={t} className="tag">{t}</span>)}
          </div>
        )}

        {!!project.githubLinks?.length && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
            {project.githubLinks.map((g) => (
              <a key={g.url} href={g.url} target="_blank" rel="noreferrer" className="btn">
                {g.label || 'Repository'} ↗
              </a>
            ))}
          </div>
        )}

        {telemetry && (
          <div className="panel" style={{ padding: 18, marginBottom: 32, display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`led ${telemetry.status === 'online' ? 'led--online' : 'led--offline'}`} />
              <span className="mono" style={{ fontSize: 12.5 }}>{telemetry.status === 'online' ? 'DEVICE ONLINE' : 'DEVICE OFFLINE'}</span>
            </span>
            {telemetry.temperature != null && <TelemetryStat label="Temp" value={`${telemetry.temperature}°C`} />}
            {telemetry.humidity != null && <TelemetryStat label="Humidity" value={`${telemetry.humidity}%`} />}
            {telemetry.batteryLevel != null && <TelemetryStat label="Battery" value={`${telemetry.batteryLevel}%`} />}
          </div>
        )}
      </section>

      {project.coverImage?.url && (
        <section className="container" style={{ marginBottom: 48 }}>
          <img src={project.coverImage.url} alt={project.title} style={{ width: '100%', borderRadius: 14, border: '1px solid var(--border)', display: 'block' }} />
        </section>
      )}

      <section className="container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 48, paddingBottom: 80 }}>
        <div>
          {project.description && <DetailSection title="Overview"><Prose text={project.description} /></DetailSection>}

          {!!project.objectives?.length && (
            <DetailSection title="Objectives">
              <ul style={styles.list}>{project.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
            </DetailSection>
          )}

          {!!project.features?.length && (
            <DetailSection title="Features">
              <div style={{ display: 'grid', gap: 12 }}>
                {project.features.map((f, i) => (
                  <div key={i} className="panel" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
                    {f.description && <p style={{ fontSize: 13.5 }}>{f.description}</p>}
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {!!gallery.length && (
            <DetailSection title="Gallery & Diagrams">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {gallery.map((img) => (
                  <button key={img.id} onClick={() => setLightbox(img)} style={styles.thumbBtn}>
                    <img src={img.url} alt={img.caption || ''} style={styles.thumb} />
                    {img.type && img.type !== 'photo' && (
                      <span className="tag" style={styles.thumbTag}>{img.type === 'circuit' ? 'Circuit' : 'Architecture'}</span>
                    )}
                  </button>
                ))}
              </div>
            </DetailSection>
          )}

          {!!videos.length && (
            <DetailSection title="Demo videos">
              <div style={{ display: 'grid', gap: 20 }}>
                {videos.map((v) => (
                  <div key={v.id}>
                    <div style={{ fontSize: 13.5, marginBottom: 8, color: 'var(--text-dim)' }}>{v.title}</div>
                    {v.provider === 'youtube' ? (
                      <div style={{ aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <iframe
                          src={v.url} title={v.title} width="100%" height="100%"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen style={{ border: 0 }}
                        />
                      </div>
                    ) : (
                      <video src={v.url} controls style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)' }} />
                    )}
                  </div>
                ))}
              </div>
            </DetailSection>
          )}
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {!!project.hardware?.length && (
            <SidebarBlock title="Hardware">
              {project.hardware.map((h, i) => (
                <div key={i} style={styles.specRow}>
                  <span>{h.name}{h.qty ? ` × ${h.qty}` : ''}</span>
                  {h.notes && <span style={styles.specNote}>{h.notes}</span>}
                </div>
              ))}
            </SidebarBlock>
          )}

          {!!project.software?.length && (
            <SidebarBlock title="Software & stack">
              {project.software.map((s, i) => (
                <div key={i} style={styles.specRow}>
                  <span>{s.name}</span>
                  {s.notes && <span style={styles.specNote}>{s.notes}</span>}
                </div>
              ))}
            </SidebarBlock>
          )}

          {!!sourceCode.length && (
            <SidebarBlock title="Source code">
              {sourceCode.map((f) => (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer" style={styles.fileLink}>
                  <span>{f.name}{f.version ? ` (${f.version})` : ''}</span>
                  <span className="mono" style={styles.fileSize}>{formatBytes(f.size)}</span>
                </a>
              ))}
            </SidebarBlock>
          )}

          {Object.entries(docsByCategory).map(([cat, docs]) => (
            <SidebarBlock key={cat} title={DOC_LABELS[cat] || cat}>
              {docs.map((d) => (
                <a key={d.id} href={d.url} target="_blank" rel="noreferrer" style={styles.fileLink}>
                  <span>{d.name}</span>
                  <span className="mono" style={styles.fileSize}>{formatBytes(d.size)}</span>
                </a>
              ))}
            </SidebarBlock>
          ))}

          {!!project.team?.length && (
            <SidebarBlock title="Team">
              {project.team.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-inset)', border: '1px solid var(--border)' }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5 }}>{m.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{m.role}</div>
                  </div>
                  {(m.github || m.linkedin) && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {m.github && (
                        <a href={m.github} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 11, color: 'var(--signal)' }}>
                          GitHub
                        </a>
                      )}
                      {m.linkedin && (
                        <a href={m.linkedin} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 11, color: 'var(--signal)' }}>
                          LinkedIn
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </SidebarBlock>
          )}
        </aside>
      </section>

      {lightbox && (
        <div style={styles.lightboxOverlay} onClick={() => setLightbox(null)}>
          <img src={lightbox.url} alt={lightbox.caption || ''} style={styles.lightboxImg} />
          {lightbox.caption && <div className="mono" style={{ color: 'var(--text-dim)', marginTop: 12 }}>{lightbox.caption}</div>}
        </div>
      )}
    </>
  );
}

function DetailSection({ title, children }) {
  return (
    <div style={{ marginBottom: 44 }}>
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>{title}</h2>
      {children}
    </div>
  );
}

function SidebarBlock({ title, children }) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.06em', color: 'var(--text-faint)', marginBottom: 12 }}>
        {title.toUpperCase()}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>{children}</div>
    </div>
  );
}

function TelemetryStat({ label, value }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column' }}>
      <span className="mono" style={{ fontSize: 16 }}>{value}</span>
      <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>{label.toUpperCase()}</span>
    </span>
  );
}

function Prose({ text }) {
  return <>{text.split('\n\n').map((para, i) => <p key={i} style={{ marginBottom: 14, fontSize: 15 }}>{para}</p>)}</>;
}

function formatBytes(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

const styles = {
  list: { paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, color: 'var(--text-dim)' },
  thumbBtn: { position: 'relative', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', padding: 0, background: 'none', aspectRatio: '4/3' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  thumbTag: { position: 'absolute', bottom: 8, left: 8 },
  specRow: { display: 'flex', flexDirection: 'column', paddingBottom: 8, borderBottom: '1px solid var(--border)' },
  specNote: { fontSize: 12, color: 'var(--text-faint)', marginTop: 2 },
  fileLink: { display: 'flex', justifyContent: 'space-between', gap: 10, color: 'var(--signal)', paddingBottom: 8, borderBottom: '1px solid var(--border)' },
  fileSize: { color: 'var(--text-faint)', fontSize: 11.5, flexShrink: 0 },
  lightboxOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(5,8,14,0.92)', zIndex: 1000,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  lightboxImg: { maxWidth: '90vw', maxHeight: '80vh', borderRadius: 10, border: '1px solid var(--border-bright)' },
};
