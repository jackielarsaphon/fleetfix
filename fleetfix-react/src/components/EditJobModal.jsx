import { useState } from 'react';
import { ORDER, STATUS } from '../constants.js';
import Icon from './Icon.jsx';

const INPUT = { padding: '9px 10px', border: '1px solid #d8d1c4', borderRadius: 8, fontSize: 13 };
const LABEL = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#6f6860' };

/** dd/mm/yyyy (หรือ '—') → yyyy-mm-dd สำหรับ <input type="date"> */
function toISO(thai) {
  if (!thai || thai === '—') return '';
  const [d, m, y] = thai.split('/');
  if (!d || !m || !y) return '';
  return `${y}-${m}-${d}`;
}

/** แยกชื่อช่างจากข้อความเดียว — คั่นด้วย + หรือ , ก็ได้ */
function splitTechnicians(text) {
  return [...new Set((text || '').split(/[+,]/).map((t) => t.trim()).filter((t) => t && t !== '—'))];
}

/** รหัสสถานะจากชื่อไทย (หน้าจออื่นใช้ชื่อไทยเป็นหลัก) */
const CODE_BY_LABEL = { 'แจ้งใหม่': 'new', 'รออะไหล่': 'waiting_parts', 'กำลังซ่อม': 'in_progress', 'เสร็จแล้ว': 'done' };

export default function EditJobModal({ job, vehicles, places, technicianOptions = [], onClose, onSave }) {
  const [form, setForm] = useState({
    vehicle: job.vehicle,
    status: CODE_BY_LABEL[job.status] || '',
    mileage: job.mileage ? String(job.mileage) : '',
    breakDate: toISO(job.breakDate),
    doneDate: toISO(job.doneDate),
    symptom: job.symptom,
    rootCause: job.rootCause === '—' ? '' : job.rootCause,
    tech: job.tech === '—' ? '' : job.tech,
    place: job.place === '—' ? '' : job.place,
    reporter: job.reporter === '—' ? '' : job.reporter,
    note: job.note === '—' ? '' : job.note,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  }

  const isClosed = form.status === 'done';

  async function save() {
    if (!form.vehicle) return setError('กรุณาเลือกเบอร์รถ');
    if (!form.symptom.trim()) return setError('กรุณากรอกอาการแจ้งซ่อม');

    setSaving(true);
    try {
      const ok = await onSave({
        vehicleCode: form.vehicle,
        symptom: form.symptom.trim(),
        rootCause: form.rootCause.trim(),
        status: form.status,
        mileage: Number(String(form.mileage).replace(/,/g, '')) || null,
        breakOn: form.breakDate,
        // วันที่เสร็จมีความหมายเฉพาะงานที่ปิดแล้ว (trigger ฝั่งฐานข้อมูลล้างให้เองถ้ายังไม่ปิด)
        doneOn: isClosed ? form.doneDate : '',
        placeName: form.place,
        reporter: form.reporter.trim(),
        note: form.note.trim(),
        technicians: splitTechnicians(form.tech),
      });
      if (ok === false) return;
      onClose();
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
      <div
        style={{
          background: '#fff',
          width: 780,
          maxWidth: '100%',
          borderRadius: 14,
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
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
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>แก้ไขใบแจ้งซ่อม</h2>
            <div style={{ fontSize: 12, color: '#6f6860', marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>
              {job.code}
            </div>
          </div>
          <button
            className="hov-dark"
            onClick={onClose}
            style={{ background: 'none', border: 0, color: '#8a837a', cursor: 'pointer', padding: 2, display: 'grid' }}
          >
            <Icon name="close" size={17} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <label style={LABEL}>
              เบอร์รถ *
              <select
                value={form.vehicle}
                onChange={(e) => set('vehicle', e.target.value)}
                style={{ ...INPUT, background: '#fff', color: '#1c1b18' }}
              >
                {vehicles.map((v) => (
                  <option key={v.code}>{v.code}</option>
                ))}
              </select>
            </label>
            <label style={LABEL}>
              สถานะ
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                style={{ ...INPUT, background: '#fff', color: '#1c1b18' }}
              >
                {ORDER.map((label) => (
                  <option key={label} value={CODE_BY_LABEL[label]}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label style={LABEL}>
              เลขไมล์
              <input value={form.mileage} onChange={(e) => set('mileage', e.target.value)} placeholder="182,450" style={INPUT} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={LABEL}>
              วันที่เสีย
              <input type="date" value={form.breakDate} onChange={(e) => set('breakDate', e.target.value)} style={INPUT} />
            </label>
            <label style={{ ...LABEL, opacity: isClosed ? 1 : 0.55 }}>
              วันที่ซ่อมเสร็จ
              <input
                type="date"
                value={form.doneDate}
                onChange={(e) => set('doneDate', e.target.value)}
                disabled={!isClosed}
                style={INPUT}
              />
              <span style={{ fontSize: 11, color: '#a29a90' }}>
                {isClosed ? 'เว้นว่างได้ ระบบจะใส่วันนี้ให้' : 'กรอกได้เมื่อสถานะเป็น "เสร็จแล้ว"'}
              </span>
            </label>
          </div>

          <label style={LABEL}>
            อาการแจ้งซ่อม *
            <textarea
              value={form.symptom}
              onChange={(e) => set('symptom', e.target.value)}
              rows={2}
              style={{ ...INPUT, padding: 10, resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={LABEL}>
              อาการหลักที่ตรวจพบ
              <input
                value={form.rootCause}
                onChange={(e) => set('rootCause', e.target.value)}
                placeholder="เช่น ผ้าเบรกหน้าสึกถึงหมุด"
                style={INPUT}
              />
            </label>
            <label style={LABEL}>
              ผู้แจ้ง
              <input
                value={form.reporter}
                onChange={(e) => set('reporter', e.target.value)}
                placeholder="เช่น พนักงานขับรถ สมชาย พ."
                style={INPUT}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={LABEL}>
              ช่างที่ทำ
              <input
                value={form.tech}
                onChange={(e) => set('tech', e.target.value)}
                placeholder="เช่น ช่างบุญมี + ช่างเอก"
                list="edit-technician-options"
                style={INPUT}
              />
              <datalist id="edit-technician-options">
                {technicianOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <span style={{ fontSize: 11, color: '#a29a90' }}>ใส่หลายคนได้ คั่นด้วย + หรือ ,</span>
            </label>
            <label style={LABEL}>
              ที่ซ่อม
              <select
                value={form.place}
                onChange={(e) => set('place', e.target.value)}
                style={{ ...INPUT, background: '#fff', color: '#1c1b18' }}
              >
                <option value="">— ไม่ระบุ —</option>
                {places.map((p) => (
                  <option key={p.name}>{p.name}</option>
                ))}
                {/* สถานที่เดิมของใบงานอาจถูกเลิกใช้ไปแล้ว จึงต้องคงตัวเลือกไว้ */}
                {form.place && !places.some((p) => p.name === form.place) && <option>{form.place}</option>}
              </select>
            </label>
          </div>

          <label style={LABEL}>
            หมายเหตุ
            <textarea
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              rows={2}
              style={{ ...INPUT, padding: 10, resize: 'vertical' }}
            />
          </label>

          <div
            style={{
              fontSize: '11.5px',
              color: '#6f6860',
              background: '#faf8f4',
              border: '1px solid #e8e3d8',
              borderRadius: 8,
              padding: '9px 11px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ ...STATUS_DOT, background: STATUS[job.status]?.dot || '#9a938a' }} />
            รายการอะไหล่แก้ได้ที่ตารางในหน้ารายละเอียด · เปลี่ยนสถานะที่นี่จะบันทึกไทม์ไลน์ให้เหมือนกดปุ่มเลื่อนสถานะ
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
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <Icon name="check" size={15} strokeWidth={2.1} /> {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_DOT = { width: 8, height: 8, borderRadius: '50%', flex: '0 0 auto' };
