import { Link } from 'react-router-dom';

const STATUS_LABEL = {
  planning: 'Planning',
  'in-progress': 'In progress',
  completed: 'Completed',
  archived: 'Archived',
};
const STATUS_LED = {
  planning: 'led--progress',
  'in-progress': 'led--progress',
  completed: 'led--active',
  archived: 'led--archived',
};

export default function ProjectCard({ project }) {
  return (
    <Link to={`/projects/${project.slug}`} className="project-card" style={styles.card}>
      <div style={styles.imageWrap}>
        {project.coverImage?.url ? (
          <img src={project.coverImage.url} alt={project.title} style={styles.image} />
        ) : (
          <div style={styles.imagePlaceholder}>NO IMAGE</div>
        )}
        <span style={styles.notch} />
      </div>
      <div style={styles.body}>
        <div style={styles.metaRow}>
          <span className="tag">{project.categoryName || 'Uncategorized'}</span>
          <span style={styles.status}>
            <span className={`led ${STATUS_LED[project.status] || 'led--progress'}`} />
            <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
              {STATUS_LABEL[project.status] || project.status}
            </span>
          </span>
        </div>
        <h3 style={styles.title}>{project.title}</h3>
        <p style={styles.desc}>{project.shortDescription}</p>
        {!!project.technologies?.length && (
          <div style={styles.techRow}>
            {project.technologies.slice(0, 4).map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
            {project.technologies.length > 4 && (
              <span className="tag">+{project.technologies.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

const styles = {
  card: {
    display: 'block',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    transition: 'transform 0.18s ease, border-color 0.18s ease',
  },
  imageWrap: { position: 'relative', aspectRatio: '16 / 10', background: 'var(--bg-inset)' },
  image: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  imagePlaceholder: {
    display: 'grid', placeItems: 'center', height: '100%',
    fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-faint)',
  },
  notch: {
    position: 'absolute', top: 12, right: 12, width: 10, height: 10,
    borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border-bright)',
  },
  body: { padding: 18 },
  metaRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  status: { display: 'flex', alignItems: 'center', gap: 6 },
  title: { fontSize: 17, marginBottom: 8 },
  desc: {
    fontSize: 13.5, marginBottom: 14, display: '-webkit-box',
    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  techRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
};
