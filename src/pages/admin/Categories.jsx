import { useEffect, useState } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../supabase/database';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { Spinner, EmptyState } from '../../components/shared/States';
import { useToast } from '../../context/ToastContext';

function slugify(s) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

export default function Categories() {
  const [items, setItems] = useState(null);
  const [name, setName] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const toast = useToast();

  function refresh() { getCategories().then(setItems); }
  useEffect(refresh, []);

  async function add() {
    if (!name.trim()) return;
    await createCategory({ name: name.trim(), slug: slugify(name), order: items?.length || 0 });
    setName('');
    toast.success('Category added.');
    refresh();
  }

  async function rename(id, newName) {
    await updateCategory(id, { name: newName, slug: slugify(newName) });
    refresh();
  }

  async function confirmDelete() {
    await deleteCategory(pendingDelete.id);
    setPendingDelete(null);
    toast.success('Category removed.');
    refresh();
  }

  if (!items) return <Spinner />;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Categories</h1>
      <p style={{ marginBottom: 20 }}>Used to group and filter projects on the public site.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, maxWidth: 420 }}>
        <input className="input" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn btn--primary" onClick={add}>Add</button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No categories yet" message="Add a category so projects have somewhere to sit." />
      ) : (
        <div className="panel">
          {items.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <input
                className="input" defaultValue={c.name} style={{ maxWidth: 260, background: 'transparent', border: '1px solid transparent' }}
                onBlur={(e) => e.target.value !== c.name && rename(c.id, e.target.value)}
              />
              <button className="btn btn--danger" onClick={() => setPendingDelete(c)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete category?"
        message={`Projects using "${pendingDelete?.name}" will keep their old category name until reassigned.`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
