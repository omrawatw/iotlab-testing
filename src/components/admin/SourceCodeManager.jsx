import { useEffect, useState } from 'react';
import FileUploader from '../shared/FileUploader';
import ConfirmDialog from '../shared/ConfirmDialog';
import { listSubItems, addSubItem, deleteSubItem } from '../../supabase/database';
import { deleteFile } from '../../cloudinary/storage';
import { useToast } from '../../context/ToastContext';

export default function SourceCodeManager({ projectId }) {
  const [items, setItems] = useState(null);
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const toast = useToast();

  function refresh() { listSubItems(projectId, 'sourceCode', 'createdAt').then(setItems); }
  useEffect(refresh, [projectId]);

  async function handleUploaded(file) {
    await addSubItem(projectId, 'sourceCode', { ...file, version, description });
    toast.success('Source archive added.');
    setVersion(''); setDescription('');
    refresh();
  }

  async function confirmDelete() {
    const item = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteFile(item.path);
    } catch (err) {
      toast.error(`Removed from the list, but the file may still exist in Cloudinary: ${err.message}`);
    }
    try {
      await deleteSubItem(projectId, 'sourceCode', item.id);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!items) return null;

  return (
    <div>
      <div className="panel" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 140px' }}>
          <label className="field-label">Version</label>
          <input className="input" placeholder="v1.2.0" value={version} onChange={(e) => setVersion(e.target.value)} />
        </div>
        <div style={{ flex: '2 1 240px' }}>
          <label className="field-label">Notes</label>
          <input className="input" placeholder="What changed in this build" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <FileUploader kind="archive" storagePath={`projects/${projectId}/source-code`} label="+ Upload ZIP" accept=".zip" onUploaded={handleUploaded} />
      </div>
      <div className="panel">
        {items.length === 0 && <p style={{ padding: 16 }}>No source archives uploaded yet.</p>}
        {items.map((f) => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13.5 }}>{f.name} {f.version && <span className="tag" style={{ marginLeft: 8 }}>{f.version}</span>}</div>
              {f.description && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>{f.description}</div>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <a className="btn btn--ghost" href={f.url} target="_blank" rel="noreferrer">Download</a>
              <button className="btn btn--danger" onClick={() => setPendingDelete(f)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!pendingDelete} title="Delete archive?" message="This source-code file will be permanently removed from storage." onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />
    </div>
  );
}
