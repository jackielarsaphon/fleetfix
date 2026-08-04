import { useState } from 'react';
import ImageSlot from '../components/ImageSlot.jsx';
import Icon from '../components/Icon.jsx';

const TH = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#6f6860', borderBottom: '1px solid #efece4' };
const INPUT = { padding: '9px 10px', border: '1px solid #d8d1c4', borderRadius: 8, fontSize: 13 };
const LABEL = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#6f6860' };

const EMPTY = { code: '', model: '', plate: '', type: '', owner: '', note: '' };

export default function VehicleNewScreen({ vehicles, onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  }

  async function save() {
    const code = form.code.trim();
    if (!code) return setError('กรุณากรอกเบอร์รถ');
    if (vehicles.some((v) => v.code.toLowerCase() === code.toLowerCase())) return setError('เบอร์รถนี้มีอยู่ในระบบแล้ว');

    setSaving(true);
    try {
      const ok = await onAdd({
        code,
        model: form.model.trim(),
        type: form.type.trim(),
        owner: form.owner.trim(),
        plate: form.plate.trim(),
        note: form.note.trim(),
      });
      if (ok === false) return;                 // บันทึกไม่ผ่าน — คงข้อมูลในฟอร์มไว้
      setForm(EMPTY);
      setError('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <header
        style={{
          background: '#f6f4ef',
          borderBottom: '1px solid #ded8cc',
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-0.3px' }}>เพิ่มทะเบียนรถ</h1>
          <div style={{ fontSize: '12.5px', color: '#6f6860', marginTop: 3 }}>ทั้งหมด {vehicles.length} คัน · กดปุ่มเพื่อกรอกข้อมูลรถคันใหม่</div>
        </div>
        <button
          className="hov-orange"
          onClick={() => {
            setOpen(true);
            setError('');
          }}
          style={{
            background: '#b45309',
            color: '#fff',
            border: 0,
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon name="truckPlus" size={17} /> เพิ่มทะเบียนรถ
        </button>
      </header>

      <div style={{ padding: '22px 28px 44px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {open && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(28, 27, 24, 0.42)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '48px 20px',
              zIndex: 45,
              overflow: 'auto',
            }}
          >
            <section
              style={{
                background: '#fff',
                border: '1px solid #ded8cc',
                borderRadius: 14,
                boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
                padding: '18px 20px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 15,
                width: 700,
                maxWidth: '100%',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="truck" size={17} style={{ color: '#b45309' }} /> ข้อมูลรถ
                </h2>
                <button
                  className="hov-dark"
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 0, color: '#8a837a', cursor: 'pointer', padding: 2, display: 'grid', placeItems: 'center' }}
                >
                  <Icon name="close" size={17} />
                </button>
              </div>

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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={LABEL}>
                  เบอร์รถ *
                  <input
                    value={form.code}
                    onChange={(e) => set('code', e.target.value)}
                    placeholder="เช่น TS-041"
                    style={{ ...INPUT, fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                </label>
                <label style={LABEL}>
                  ประเภทรถ
                  <input value={form.type} onChange={(e) => set('type', e.target.value)} placeholder="เช่น รถบรรทุก 6 ล้อ" style={INPUT} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={LABEL}>
                  ยี่ห้อ / รุ่น
                  <input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="เช่น ISUZU FVM" style={INPUT} />
                </label>
                <label style={LABEL}>
                  ทะเบียนรถ
                  <input value={form.plate} onChange={(e) => set('plate', e.target.value)} placeholder="เช่น 82-1234 กรุงเทพมหานคร" style={INPUT} />
                </label>
              </div>

              <label style={LABEL}>
                หมายเหตุ
                <textarea
                  value={form.note}
                  onChange={(e) => set('note', e.target.value)}
                  rows={2}
                  placeholder="เช่น รถประจำสายเหนือ ประกันหมด 12/2569"
                  style={{ ...INPUT, padding: 10, resize: 'vertical' }}
                />
              </label>

              <div>
                <div style={{ fontSize: 12, color: '#6f6860', marginBottom: 8 }}>รูปรถ (ไม่บังคับ)</div>
                <div style={{ height: 130, width: 200 }}>
                  <ImageSlot placeholder="ลากรูปรถมาวาง" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 9, borderTop: '1px solid #efece4', paddingTop: 14 }}>
                <button
                  className="hov-orange"
                  onClick={save}
                  disabled={saving}
                  style={{
                    background: '#b45309',
                    color: '#fff',
                    border: 0,
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving ? 'wait' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                >
                  <Icon name="check" size={15} strokeWidth={2.1} /> {saving ? 'กำลังบันทึก...' : 'เพิ่มทะเบียนรถ'}
                </button>
                <button
                  className="hov-border"
                  onClick={() => setOpen(false)}
                  style={{ background: '#fff', border: '1px solid #d8d1c4', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
                >
                  ยกเลิก
                </button>
              </div>
            </section>
          </div>
        )}

        <section style={{ background: '#fff', border: '1px solid #ded8cc', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid #efece4', fontSize: '13.5px', fontWeight: 600 }}>
            รถในระบบ · ทั้งหมด {vehicles.length} คัน
          </div>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#faf8f4', textAlign: 'left' }}>
                <th style={TH}>เบอร์รถ</th>
                <th style={TH}>ทะเบียนรถ</th>
                <th style={TH}>ยี่ห้อ / รุ่น</th>
                <th style={TH}>หมายเหตุ</th>
                <th style={TH}>รูปรถ</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.code} style={{ borderBottom: '1px solid #f2efe8' }}>
                  <td style={{ padding: '11px 14px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{v.code}</td>
                  <td style={{ padding: '11px 14px' }}>{v.plate || '—'}</td>
                  <td style={{ padding: '11px 14px', color: '#4b453e' }}>{v.model}</td>
                  <td style={{ padding: '11px 14px', color: '#6f6860' }}>{v.note || '—'}</td>
                  <td style={{ padding: '8px 14px' }}>
                    <div style={{ width: 96, height: 60 }}>
                      <ImageSlot placeholder="ลากรูปรถ" radius={6} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
