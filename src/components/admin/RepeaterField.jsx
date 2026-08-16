/**
 * Generic "add/remove rows" editor for array fields stored directly on the
 * project document (hardware, software, features, objectives, githubLinks,
 * team). `fields` describes the inputs per row; `value` is the array;
 * `onChange` receives the whole updated array.
 */
export default function RepeaterField({ value = [], onChange, fields, addLabel = '+ Add row', emptyRow }) {
  function updateRow(index, key, val) {
    const next = value.map((row, i) => (i === index ? { ...row, [key]: val } : row));
    onChange(next);
  }
  function removeRow(index) {
    onChange(value.filter((_, i) => i !== index));
  }
  function addRow() {
    onChange([...value, emptyRow ? { ...emptyRow } : {}]);
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {value.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: 8, flex: 1 }}>
              {fields.map((f) => (
                <input
                  key={f.key}
                  className="input"
                  placeholder={f.placeholder}
                  value={row[f.key] || ''}
                  onChange={(e) => updateRow(i, f.key, e.target.value)}
                />
              ))}
            </div>
            <button type="button" className="btn btn--ghost" onClick={() => removeRow(i)}>Remove</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn" style={{ marginTop: 10 }} onClick={addRow}>{addLabel}</button>
    </div>
  );
}

/** Simple string-array editor, used for Objectives. */
export function StringListField({ value = [], onChange, placeholder, addLabel = '+ Add' }) {
  function update(i, v) {
    const next = [...value]; next[i] = v; onChange(next);
  }
  function remove(i) { onChange(value.filter((_, idx) => idx !== i)); }
  function add() { onChange([...value, '']); }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {value.map((v, i) => (
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={v} placeholder={placeholder} onChange={(e) => update(i, e.target.value)} />
            <button type="button" className="btn btn--ghost" onClick={() => remove(i)}>Remove</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn" style={{ marginTop: 10 }} onClick={add}>{addLabel}</button>
    </div>
  );
}
