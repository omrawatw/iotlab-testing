import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllProjectsAdmin } from '../../supabase/database';
import { Spinner } from '../../components/shared/States';

export default function Dashboard() {
  const [projects, setProjects] = useState(null);

  useEffect(() => { getAllProjectsAdmin().then(setProjects); }, []);

  if (!projects) return <Spinner />;

  const published = projects.filter((p) => p.published).length;
  const drafts = projects.length - published;
  const totalViews = projects.reduce((sum, p) => sum + (p.views || 0), 0);

  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Dashboard</h1>
      <p style={{ marginBottom: 28 }}>An overview of everything currently in the showcase.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total projects" value={projects.length} />
        <StatCard label="Published" value={published} led="led--active" />
        <StatCard label="Drafts" value={drafts} led="led--progress" />
        <StatCard label="Total views" value={totalViews} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <Link className="btn btn--primary" to="/admin/projects/new">+ New project</Link>
        <Link className="btn" to="/admin/projects">Manage projects</Link>
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Recently updated</h2>
      <div className="panel">
        <table className="admin-table">
          <thead><tr><th>Project</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {projects.slice(0, 6).map((p) => (
              <tr key={p.id} className="admin-row">
                <td>{p.title}</td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`led ${p.published ? 'led--active' : 'led--progress'}`} />
                    {p.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td><Link className="btn btn--ghost" to={`/admin/projects/${p.id}`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, led }) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {led && <span className={`led ${led}`} />}
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.05em' }}>{label.toUpperCase()}</span>
      </div>
      <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{value}</div>
    </div>
  );
}
