import { useState } from 'react';
import Icon from '../components/Icon.jsx';

const TH = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#6f6860', borderBottom: '1px solid #efece4' };
const INPUT = { padding: '9px 10px', border: '1px solid #d8d1c4', borderRadius: 8, fontSize: 13 };
const LABEL = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#6f6860' };

const EMPTY = { name: '', kind: '' };

const ROW_BTN = {
  background: '#fff',
  border: '1px solid #e2ddd2',
  borderRadius: 7,
  padding: '6px 10px',
  fontSize: 12,
  color: '#6f6860',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};

export default function PlacesScreen({ places, jobs, onAdd, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(null); // สถานที่ที่กำลังแก้ (null = เพิ่มใหม่)
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  }

  function startEdit(place) {
    setEditing(place);
    setForm({ name: place.name, kind: place.kind === 'ไม่ระบุประเภท' ? '' : place.kind });
    setError('');
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY);
    setError('');
  }

  async function save() {
    const name = form.name.trim();
    if (!name) return setError('กรุณากรอกชื่อสถานที่ซ่อม');

    const clash = places.some(
      (p) => p.name.toLowerCase() === name.toLowerCase() && p._id !== editing?._id
    );
    if (clash) return setError('สถานที่นี้มีอยู่ในระบบแล้ว');

    const payload = { name, kind: form.kind.trim() || 'ไม่ระบุประเภท' };

    setSaving(true);
    try {
      const ok = editing ? await onUpdate(editing._id, payload) : await onAdd(payload);
      if (ok === false) return;
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <header style={{ background: '#f6f4ef', borderBottom: '1px solid #ded8cc', padding: '20px 28px' }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-0.3px' }}>สถานที่ซ่อม</h1>
        <div style={{ fontSize: '12.5px', color: '#6f6860', marginTop: 3 }}>
          ทั้งหมด {places.length} แห่ง · รายการนี้จะขึ้นให้เลือกในช่อง &quot;ที่ซ่อม&quot; ตอนแจ้งซ่อม
        </div>
      </header>

      <div style={{ padding: '22px 28px 44px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 18, alignItems: 'start' }}>
        <section style={{ background: '#fff', border: '1px solid #ded8cc', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#faf8f4', textAlign: 'left' }}>
                <th style={TH}>ชื่อสถานที่</th>
                <th style={TH}>ประเภท</th>
                <th style={TH}>การใช้งาน</th>
                <th style={TH} />
              </tr>
            </thead>
            <tbody>
              {places.map((p) => {
                const used = jobs.filter((j) => j.place === p.name).length;
                return (
                  <tr key={p.name} style={{ borderBottom: '1px solid #f2efe8' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="garage" size={15} style={{ color: '#b45309' }} />
                        {p.name}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#4b453e' }}>{p.kind}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#6f6860' }}>
                      {used ? `ใช้ในใบงาน ${used} ใบ` : 'ยังไม่มีใบงาน'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="hov-border"
                          onClick={() => startEdit(p)}
                          title="แก้ชื่อหรือประเภทของสถานที่นี้"
                          style={ROW_BTN}
                        >
                          <Icon name="pencil" size={13} /> แก้ไข
                        </button>
                        <button
                          className="hov-danger"
                          onClick={() => onRemove(p)}
                          title="เลิกใช้สถานที่นี้ (ประวัติใบงานเดิมยังอยู่)"
                          style={ROW_BTN}
                        >
                          <Icon name="trash" size={13} /> เลิกใช้
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section
          style={{
            background: '#fff',
            border: '1px solid #ded8cc',
            borderRadius: 12,
            padding: '17px 18px 19px',
            display: 'flex',
            flexDirection: 'column',
            gap: 13,
          }}
        >
          <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name={editing ? 'pencil' : 'plus'} size={15} style={{ color: '#b45309' }} />
            {editing ? `แก้ไข ${editing.name}` : 'เพิ่มสถานที่ซ่อม'}
          </h2>
          {error && (
            <div
              style={{
                fontSize: 12,
                color: '#b3261e',
                background: '#fdecea',
                border: '1px solid #f5c9c4',
                borderRadius: 8,
                padding: '8px 11px',
              }}
            >
              {error}
            </div>
          )}
          <label style={LABEL}>
            ชื่อสถานที่ *
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="เช่น อู่ช่างเล็ก บางนา" style={INPUT} />
          </label>
          <label style={LABEL}>
            ประเภท
            <input value={form.kind} onChange={(e) => set('kind', e.target.value)} placeholder="เช่น อู่คู่สัญญา / ศูนย์บริการ" style={INPUT} />
          </label>
          <button
            className="hov-orange"
            onClick={save}
            disabled={saving}
            style={{
              background: '#b45309',
              color: '#fff',
              border: 0,
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            <Icon name="check" size={15} strokeWidth={2.1} />{' '}
            {saving ? 'กำลังบันทึก...' : editing ? 'บันทึกการแก้ไข' : 'บันทึกสถานที่ซ่อม'}
          </button>
          {editing && (
            <button
              className="hov-border"
              onClick={cancelEdit}
              style={{
                background: '#fff',
                border: '1px solid #d8d1c4',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ยกเลิกการแก้ไข
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
