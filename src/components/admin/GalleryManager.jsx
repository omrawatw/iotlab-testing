import { useEffect, useState } from 'react';
import FileUploader from '../shared/FileUploader';
import ConfirmDialog from '../shared/ConfirmDialog';
import { listSubItems, addSubItem, updateSubItem, deleteSubItem, reorderSubItems } from '../../supabase/database';
import { deleteFile } from '../../cloudinary/storage';
import { useToast } from '../../context/ToastContext';

export default function GalleryManager({ projectId }) {
  const [items, setItems] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [dragId, setDragId] = useState(null);
  const toast = useToast();

  function refresh() { listSubItems(projectId, 'gallery').then(setItems); }
  useEffect(refresh, [projectId]);

  async function handleUploaded(file) {
    await addSubItem(projectId, 'gallery', {
      url: file.url, path: file.path, caption: '', type: 'photo', order: items?.length || 0,
    });
    refresh();
  }

  async function confirmDelete() {
    const item = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteFile(item.path);
    } catch (err) {
      // The Cloudinary file may be left orphaned (e.g. the delete Edge
      // Function isn't deployed yet) — that's recoverable later and
      // shouldn't block removing it from the gallery now.
      toast.error(`Removed from the gallery, but the file may still exist in Cloudinary: ${err.message}`);
    }
    try {
      await deleteSubItem(projectId, 'gallery', item.id);
      toast.success('Image removed.');
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function handleDrop(targetId) {
    if (!dragId || dragId === targetId) return;
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setItems(ids.map((id) => items.find((i) => i.id === id)));
    reorderSubItems(projectId, 'gallery', ids).catch((e) => toast.error(e.message));
    setDragId(null);
  }

  if (!items) return null;

  return (
    <div>
      <FileUploader kind="image" storagePath={`projects/${projectId}/gallery`} label="+ Upload image" accept="image/*" onUploaded={handleUploaded} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginTop: 16 }}>
        {items.map((img) => (
          <div
            key={img.id}
            className="gallery-thumb"
            draggable
            onDragStart={() => setDragId(img.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(img.id)}
          >
            <div className="gallery-thumb-image-wrap">
              <img src={img.url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
              <div className="gallery-thumb-actions">
                <button className="btn btn--danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setPendingDelete(img)}>Delete</button>
              </div>
            </div>
            <div style={{ padding: 8, background: 'var(--bg-panel)' }}>
              <select className="select" value={img.type} style={{ marginBottom: 6, fontSize: 12 }} onChange={(e) => { updateSubItem(projectId, 'gallery', img.id, { type: e.target.value }); refresh(); }}>
                <option value="photo">Photo</option>
                <option value="circuit">Circuit diagram</option>
                <option value="architecture">Architecture diagram</option>
              </select>
              <input
                className="input" placeholder="Caption" defaultValue={img.caption} style={{ fontSize: 12 }}
                onBlur={(e) => updateSubItem(projectId, 'gallery', img.id, { caption: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!pendingDelete} title="Remove image?" message="This image will be permanently deleted from storage." onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />
    </div>
  );
}
