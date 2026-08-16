import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllProjectsAdmin, setProjectPublished, deleteProject, reorderProjects, getProjectFilePaths } from '../../supabase/database';
import { deleteFile } from '../../cloudinary/storage';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { Spinner, EmptyState } from '../../components/shared/States';
import { useToast } from '../../context/ToastContext';

export default function ProjectList() {
  const [projects, setProjects] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [dragId, setDragId] = useState(null);
  const toast = useToast();

  function refresh() { getAllProjectsAdmin().then(setProjects); }
  useEffect(refresh, []);

  async function togglePublish(p) {
    await setProjectPublished(p.id, !p.published);
    toast.success(p.published ? 'Unpublished — hidden from the public site.' : 'Published — now live.');
    refresh();
  }

  async function confirmDelete() {
    const p = pendingDelete;
    setPendingDelete(null);
    // Postgres CASCADE removes the gallery/documents/sourceCode/videos
    // rows automatically, but has no idea Cloudinary exists — try to clean
    // those files up first, but don't let a failed cleanup (e.g. the
    // delete Edge Function isn't deployed yet) block deleting the project
    // itself. Use allSettled so one failed file doesn't stop the rest.
    try {
      const paths = await getProjectFilePaths(p.id);
      const results = await Promise.allSettled(paths.map((path) => deleteFile(path)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      await deleteProject(p.id);
      toast.success(
        failed > 0
          ? `Deleted "${p.title}". ${failed} file(s) may still exist in Cloudinary.`
          : `Deleted "${p.title}" and its files.`
      );
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function handleDrop(targetId) {
    if (!dragId || dragId === targetId) return;
    const ids = projects.map((p) => p.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    const reordered = ids.map((id) => projects.find((p) => p.id === id));
    setProjects(reordered);
    reorderProjects(ids).catch((err) => toast.error(err.message));
    setDragId(null);
  }

  if (!projects) return <Spinner />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>Projects</h1>
          <p>Drag rows to reorder how they appear on the public site.</p>
        </div>
        <Link className="btn btn--primary" to="/admin/projects/new">+ New project</Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects yet" message="Create your first project to populate the showcase." action={<Link className="btn btn--primary" to="/admin/projects/new">+ New project</Link>} />
      ) : (
        <div className="panel">
          <table className="admin-table">
            <thead><tr><th></th><th>Project</th><th>Category</th><th>Status</th><th>Visibility</th><th>Views</th><th></th></tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className="admin-row"
                  draggable
                  onDragStart={() => setDragId(p.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(p.id)}
                  style={{ cursor: 'grab' }}
                >
                  <td className="mono" style={{ color: 'var(--text-faint)' }}>::</td>
                  <td>{p.title}</td>
                  <td>{p.categoryName || '—'}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`led ${p.status === 'completed' ? 'led--active' : p.status === 'archived' ? 'led--archived' : 'led--progress'}`} />
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn--ghost" style={{ padding: '4px 10px' }} onClick={() => togglePublish(p)}>
                      {p.published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="mono">{p.views || 0}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <Link className="btn btn--ghost" to={`/admin/projects/${p.id}`}>Edit</Link>
                    <button className="btn btn--danger" onClick={() => setPendingDelete(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete project?"
        message={`"${pendingDelete?.title}" and all of its documented resources will be permanently removed. This can't be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
