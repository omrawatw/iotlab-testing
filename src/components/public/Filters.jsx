const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export default function Filters({
  categories, technologies, filters, onChange, search, onSearchChange,
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <input
        className="input"
        placeholder="Search projects, e.g. “ESP32”, “soil moisture”…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ maxWidth: 420, marginBottom: 18 }}
      />

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} className="checkerboard-scroll">
        <button
          className={`filter-chip ${!filters.categoryId ? 'active' : ''}`}
          onClick={() => onChange({ ...filters, categoryId: '' })}
        >
          All categories
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`filter-chip ${filters.categoryId === c.id ? 'active' : ''}`}
            onClick={() => onChange({ ...filters, categoryId: c.id })}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14, alignItems: 'center' }}>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
        >
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select
          className="select"
          style={{ width: 'auto' }}
          value={filters.technology}
          onChange={(e) => onChange({ ...filters, technology: e.target.value })}
        >
          <option value="">All technologies</option>
          {technologies.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
      </div>
    </div>
  );
}
