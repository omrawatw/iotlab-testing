import { useEffect, useState } from 'react';
import FileUploader from '../shared/FileUploader';
import ConfirmDialog from '../shared/ConfirmDialog';
import { listSubItems, addSubItem, deleteSubItem } from '../../supabase/database';
import { deleteFile } from '../../cloudinary/storage';
import { useToast } from '../../context/ToastContext';

const CATEGORIES = [
  { value: 'report', label: 'Project report' },
  { value: 'manual', label: 'User manual' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'datasheet', label: 'Datasheet' },
  { value: 'pdf', label: 'PDF' },
  { value: 'other', label: 'Other' },
];

export default function DocumentsManager({ projectId }) {
  const [items, setItems] = useState(null);
  const [category, setCategory] = useState('report');
  const [pendingDelete, setPendingDelete] = useState(null);
  const toast = useToast();

  function refresh() { listSubItems(projectId, 'documents', 'category').then(setItems); }
  useEffect(refresh, [projectId]);

  async function handleUploaded(file) {
    await addSubItem(projectId, 'documents', { ...file, category });
    toast.success('Document added.');
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
      await deleteSubItem(projectId, 'documents', item.id);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!items) return null;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <select className="select" style={{ width: 200 }} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <FileUploader kind="presentation" storagePath={`projects/${projectId}/documents`} label="+ Upload file" onUploaded={handleUploaded} />
      </div>
      <div className="panel">
        {items.length === 0 && <p style={{ padding: 16 }}>No documents uploaded yet.</p>}
        {items.map((d) => (
          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13.5 }}>{d.name}</div>
              <span className="tag" style={{ marginTop: 4, display: 'inline-block' }}>{CATEGORIES.find((c) => c.value === d.category)?.label}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <a className="btn btn--ghost" href={d.url} target="_blank" rel="noreferrer">View</a>
              <button className="btn btn--danger" onClick={() => setPendingDelete(d)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!pendingDelete} title="Delete document?" message="This file will be permanently removed from storage." onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />
    </div>
  );
}
