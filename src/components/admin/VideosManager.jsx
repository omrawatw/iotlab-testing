import { useEffect, useState } from 'react';
import FileUploader from '../shared/FileUploader';
import ConfirmDialog from '../shared/ConfirmDialog';
import { listSubItems, addSubItem, deleteSubItem } from '../../supabase/database';
import { deleteFile } from '../../cloudinary/storage';
import { useToast } from '../../context/ToastContext';

function toEmbedUrl(url) {
  const m = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

export default function VideosManager({ projectId }) {
  const [items, setItems] = useState(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const toast = useToast();

  function refresh() { listSubItems(projectId, 'videos').then(setItems); }
  useEffect(refresh, [projectId]);

  async function addYoutube() {
    if (!title || !url) { toast.error('Add a title and a YouTube URL first.'); return; }
    await addSubItem(projectId, 'videos', { title, url: toEmbedUrl(url), provider: 'youtube', order: items?.length || 0 });
    setTitle(''); setUrl('');
    refresh();
  }

  async function handleUploaded(file) {
    if (!title) { toast.error('Add a title before uploading.'); return; }
    await addSubItem(projectId, 'videos', { title, url: file.url, path: file.path, provider: 'upload', order: items?.length || 0 });
    setTitle('');
    refresh();
  }

  async function confirmDelete() {
    const item = pendingDelete;
    setPendingDelete(null);
    if (item.path) {
      try {
        await deleteFile(item.path);
      } catch (err) {
        toast.error(`Removed from the list, but the file may still exist in Cloudinary: ${err.message}`);
      }
    }
    try {
      await deleteSubItem(projectId, 'videos', item.id);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!items) return null;

  return (
    <div>
      <div className="panel" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label className="field-label">Title</label>
          <input className="input" placeholder="Demo — auto-watering in action" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={{ flex: '2 1 260px' }}>
          <label className="field-label">YouTube URL</label>
          <input className="input" placeholder="https://youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <button type="button" className="btn" onClick={addYoutube}>+ Add YouTube link</button>
        <FileUploader kind="video" storagePath={`projects/${projectId}/videos`} label="+ Upload video file" accept="video/*" onUploaded={handleUploaded} />
      </div>
      <div className="panel">
        {items.length === 0 && <p style={{ padding: 16 }}>No demo videos yet.</p>}
        {items.map((v) => (
          <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13.5 }}>{v.title}</div>
              <span className="tag" style={{ marginTop: 4, display: 'inline-block' }}>{v.provider}</span>
            </div>
            <button className="btn btn--danger" onClick={() => setPendingDelete(v)}>Delete</button>
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!pendingDelete} title="Delete video?" message="This will remove the video from the project page." onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />
    </div>
  );
}
