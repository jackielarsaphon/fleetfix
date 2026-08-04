import { useState } from 'react';
import ImageSlot from './ImageSlot.jsx';
import Icon from './Icon.jsx';
import Lightbox from './Lightbox.jsx';

const INPUT = { padding: '9px 10px', border: '1px solid #d8d1c4', borderRadius: 8, fontSize: 13 };
const SMALL_INPUT = { padding: '8px 10px', border: '1px solid #d8d1c4', borderRadius: 7, fontSize: '12.5px' };
const LABEL = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#6f6860' };

const EMPTY_PART = { name: '', partNo: '', qty: '', unit: '', unitPrice: '', pr: '' };

/** แยกชื่อช่างจากข้อความเดียว — คั่นด้วย + หรือ , ก็ได้ */
function splitTechnicians(text) {
  return [...new Set((text || '').split(/[+,]/).map((t) => t.trim()).filter(Boolean))];
}

export default function NewJobModal({ vehicles, places, technicianOptions = [], onClose, onSave }) {
  const [form, setForm] = useState({
    vehicle: vehicles[0]?.code || '',
    mileage: '',
    breakDate: '',
    symptom: '',
    tech: '',
    place: places[0]?.name || '',
    note: '',
  });
  const [parts, setParts] = useState([{ ...EMPTY_PART }]);
  // เก็บไฟล์รูปไว้ในฟอร์มก่อน แล้วอัปโหลดหลังใบงานถูกสร้าง (ต้องมี id ของใบงานก่อน)
  const [photoSlots, setPhotoSlots] = useState([
    { id: 1, file: null },
    { id: 2, file: null },
    { id: 3, file: null },
    { id: 4, file: null },
  ]);
  const [nextSlot, setNextSlot] = useState(5);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null); // รูปที่กำลังดูเต็มจอ

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  }

  function setPart(idx, key, value) {
    setParts((list) => list.map((p, i) => (i === idx ? { ...p, [key]: value } : p)));
  }

  async function save() {
    if (!form.vehicle) return setError('กรุณาเลือกเบอร์รถ');
    if (!form.symptom.trim()) return setError('กรุณากรอกอาการแจ้งซ่อม');
    if (!form.breakDate) return setError('กรุณาระบุวันที่เสีย');

    // รูปแบบตรงกับพารามิเตอร์ของ RPC create_repair_job
    const cleanParts = parts
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        part_no: p.partNo.trim(),
        qty: Number(p.qty) || 1,
        unit: p.unit.trim(),
        unit_price: Number(String(p.unitPrice).replace(/,/g, '')) || 0,
        discount_pct: 0,
        pr_code: p.pr.trim(),
      }));

    setSaving(true);
    try {
      await onSave({
        vehicleCode: form.vehicle,
        symptom: form.symptom.trim(),
        breakOn: form.breakDate,                                    // yyyy-mm-dd ตรงตามชนิด date
        mileage: Number(String(form.mileage).replace(/,/g, '')) || null,
        placeName: form.place,
        reporter: null,                                             // ให้ระบบบันทึกผู้คีย์จาก created_by
        note: form.note.trim() || null,
        parts: cleanParts,
        technicians: splitTechnicians(form.tech),
        photos: photoSlots.map((p) => p.file).filter(Boolean),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(28, 27, 24, 0.42)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '40px 20px',
        zIndex: 40,
        overflow: 'auto',
      }}
    >
      {preview && <Lightbox items={[preview]} onClose={() => setPreview(null)} />}

      <div style={{ background: '#fff', width: 780, maxWidth: '100%', borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div
          style={{
            padding: '17px 22px',
            borderBottom: '1px solid #ded8cc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f6f4ef',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>แจ้งซ่อมใหม่</h2>
            <div style={{ fontSize: 12, color: '#6f6860', marginTop: 2 }}>กรอกเฉพาะช่องที่มี * ก็บันทึกได้ ส่วนราคาและ PR เติมภายหลังได้</div>
          </div>
          <button
            className="hov-dark"
            onClick={onClose}
            style={{ background: 'none', border: 0, color: '#8a837a', cursor: 'pointer', padding: 2, display: 'grid', placeItems: 'center' }}
          >
            <Icon name="close" size={17} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div style={{ fontSize: 12, color: '#b3261e', background: '#fdecea', border: '1px solid #f5c9c4', borderRadius: 8, padding: '8px 11px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <label style={LABEL}>
              เบอร์รถ *
              <select value={form.vehicle} onChange={(e) => set('vehicle', e.target.value)} style={{ ...INPUT, background: '#fff', color: '#1c1b18' }}>
                {vehicles.map((v) => (
                  <option key={v.code}>{v.code}</option>
                ))}
              </select>
            </label>
            <label style={LABEL}>
              เลขไมล์
              <input value={form.mileage} onChange={(e) => set('mileage', e.target.value)} placeholder="182,450" style={INPUT} />
            </label>
            <label style={LABEL}>
              วันที่เสีย *
              <input type="date" value={form.breakDate} onChange={(e) => set('breakDate', e.target.value)} style={{ ...INPUT, padding: '8px 10px' }} />
            </label>
          </div>

          <label style={LABEL}>
            อาการแจ้งซ่อม *
            <textarea
              value={form.symptom}
              onChange={(e) => set('symptom', e.target.value)}
              rows={2}
              placeholder="เช่น กากะบาดขาด + เข้าเกียร์ยาก"
              style={{ ...INPUT, padding: 10, resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={LABEL}>
              ช่างที่ทำ
              <input
                value={form.tech}
                onChange={(e) => set('tech', e.target.value)}
                placeholder="เช่น ช่างบุญมี + ช่างเอก"
                list="technician-options"
                style={INPUT}
              />
              <datalist id="technician-options">
                {technicianOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <span style={{ fontSize: 11, color: '#a29a90' }}>ใส่หลายคนได้ คั่นด้วย + หรือ ,</span>
            </label>
            <label style={LABEL}>
              ที่ซ่อม
              <select value={form.place} onChange={(e) => set('place', e.target.value)} style={{ ...INPUT, background: '#fff', color: '#1c1b18' }}>
                {places.map((p) => (
                  <option key={p.name}>{p.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#6f6860', marginBottom: 8 }}>แนบรูปอาการเสีย (ลากรูปมาวางได้หลายรูป)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9 }}>
              {photoSlots.map((slot, k) => (
                <div key={slot.id} style={{ height: 104, position: 'relative' }}>
                  <ImageSlot
                    placeholder={`รูปที่ ${k + 1}`}
                    onPick={(file) =>
                      setPhotoSlots((s) => s.map((x) => (x.id === slot.id ? { ...x, file } : x)))
                    }
                    onExpand={(src) => setPreview({ src, caption: `รูปที่ ${k + 1} · ${slot.file?.name || ''}` })}
                  />
                  <button
                    className="hov-close"
                    onClick={() => setPhotoSlots((s) => s.filter((x) => x.id !== slot.id))}
                    title="ลบช่องรูปนี้"
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: '1px solid #ded8cc',
                      background: '#fff',
                      color: '#8a837a',
                      cursor: 'pointer',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.14)',
                      zIndex: 2,
                      display: 'grid',
                      placeItems: 'center',
                      padding: 0,
                    }}
                  >
                    <Icon name="close" size={12} strokeWidth={2.2} />
                  </button>
                </div>
              ))}
              <button
                className="hov-slot"
                onClick={() => {
                  setPhotoSlots((s) => [...s, { id: nextSlot, file: null }]);
                  setNextSlot((n) => n + 1);
                }}
                style={{
                  height: 104,
                  border: '1px dashed #cbc4b6',
                  borderRadius: 8,
                  background: '#fff',
                  color: '#6f6860',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <Icon name="plus" size={17} /> เพิ่มช่องรูป
              </button>
            </div>
          </div>

          <div style={{ background: '#faf8f4', border: '1px solid #e8e3d8', borderRadius: 10, padding: '13px 14px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Icon name="part" size={14} style={{ color: '#8a837a' }} /> อะไหล่ที่ต้องใช้ (ไม่บังคับ)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parts.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr) 64px 70px 92px 108px', gap: 8 }}>
                  <input value={p.name} onChange={(e) => setPart(i, 'name', e.target.value)} placeholder="ชื่ออะไหล่" style={SMALL_INPUT} />
                  <input value={p.partNo} onChange={(e) => setPart(i, 'partNo', e.target.value)} placeholder="รหัสอะไหล่ (Part number)" style={SMALL_INPUT} />
                  <input value={p.qty} onChange={(e) => setPart(i, 'qty', e.target.value)} placeholder="จำนวน" style={SMALL_INPUT} />
                  <input value={p.unit} onChange={(e) => setPart(i, 'unit', e.target.value)} placeholder="หน่วย" style={SMALL_INPUT} />
                  <input value={p.unitPrice} onChange={(e) => setPart(i, 'unitPrice', e.target.value)} placeholder="ราคา/หน่วย" style={SMALL_INPUT} />
                  <input
                    value={p.pr}
                    onChange={(e) => setPart(i, 'pr', e.target.value)}
                    placeholder="เลข PR"
                    style={{ ...SMALL_INPUT, fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                </div>
              ))}
            </div>
            <button
              className="hov-border"
              onClick={() => setParts((list) => [...list, { ...EMPTY_PART }])}
              style={{
                marginTop: 9,
                background: '#fff',
                border: '1px solid #d8d1c4',
                borderRadius: 7,
                padding: '7px 12px',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="plus" size={13} strokeWidth={2.1} /> เพิ่มอีกรายการ
            </button>
          </div>
        </div>

        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #ded8cc',
            background: '#f6f4ef',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 9,
          }}
        >
          <button
            onClick={onClose}
            style={{ background: '#fff', border: '1px solid #d8d1c4', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
          >
            ยกเลิก
          </button>
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
            }}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกใบแจ้งซ่อม'}
          </button>
        </div>
      </div>
    </div>
  );
}
