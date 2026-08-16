import { useEffect, useState } from 'react';
import { getTechnologies, createTechnology, deleteTechnology } from '../../supabase/database';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { Spinner, EmptyState } from '../../components/shared/States';
import { useToast } from '../../context/ToastContext';

export default function Technologies() {
  const [items, setItems] = useState(null);
  const [name, setName] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const toast = useToast();

  function refresh() { getTechnologies().then(setItems); }
  useEffect(refresh, []);

  async function add() {
    if (!name.trim()) return;
    await createTechnology({ name: name.trim() });
    setName('');
    toast.success('Technology added.');
    refresh();
  }

  async function confirmDelete() {
    await deleteTechnology(pendingDelete.id);
    setPendingDelete(null);
    toast.success('Technology removed.');
    refresh();
  }

  if (!items) return <Spinner />;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Technologies</h1>
      <p style={{ marginBottom: 20 }}>The tag list projects can be labeled with (ESP32, MQTT, React, etc). Removing one here doesn't remove it from projects that already used it.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, maxWidth: 420 }}>
        <input className="input" placeholder="New technology name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn btn--primary" onClick={add}>Add</button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No technologies yet" message="Add the tools and platforms your projects use." />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {items.map((t) => (
            <span key={t.id} className="tag" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px 6px 12px' }}>
              {t.name}
              <button className="btn btn--ghost" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => setPendingDelete(t)}>×</button>
            </span>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete technology?"
        message={`"${pendingDelete?.name}" will be removed from the filter list.`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
