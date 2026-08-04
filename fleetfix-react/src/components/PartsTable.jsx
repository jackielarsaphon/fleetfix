import { useState } from 'react';
import { fmt } from '../utils.js';
import Icon from './Icon.jsx';

const TH = { padding: '9px 14px', fontSize: 11, fontWeight: 600, color: '#6f6860', borderBottom: '1px solid #efece4' };
const CELL = { padding: '10px 14px' };
const NUM = { padding: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const IN = { width: '100%', padding: '6px 8px', border: '1px solid #d8d1c4', borderRadius: 6, fontSize: '12.5px' };
const IN_NUM = { ...IN, textAlign: 'right' };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };

const BTN = {
  background: '#fff',
  border: '1px solid #e2ddd2',
  borderRadius: 6,
  padding: '5px 8px',
  fontSize: 11.5,
  color: '#6f6860',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

const EMPTY = { name: '', partNo: '', qty: '1', unit: 'ชิ้น', unitPrice: '', discountPct: '0', prCode: '' };

function toInput(part) {
  return {
    name: part.name,
    partNo: part.partNo === '—' ? '' : part.partNo,
    qty: String(part.qty),
    unit: part.unit,
    unitPrice: String(part.unitPrice),
    discountPct: String(part.disc),
    prCode: part.pr,
  };
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    partNo: form.partNo.trim(),
    qty: Number(String(form.qty).replace(/,/g, '')) || 1,
    unit: form.unit.trim(),
    unitPrice: Number(String(form.unitPrice).replace(/,/g, '')) || 0,
    discountPct: Number(String(form.discountPct).replace(/,/g, '')) || 0,
    prCode: form.prCode.trim(),
  };
}

/**
 * ตารางอะไหล่และค่าแรงในใบงาน — แก้ไขในแถวได้เลย
 *
 * onAdd(input) / onUpdate(partId, input) / onDelete(partId) คืน false ถ้าบันทึกไม่ผ่าน
 */
export default function PartsTable({ parts, onAdd, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null); // id ของแถวที่กำลังแก้ · 'new' = แถวเพิ่มใหม่
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  }

  function startAdd() {
    setEditingId('new');
    setForm(EMPTY);
    setError('');
  }

  function startEdit(part) {
    setEditingId(part._id);
    setForm(toInput(part));
    setError('');
  }

  function cancel() {
    setEditingId(null);
    setForm(EMPTY);
    setError('');
  }

  async function submit() {
    if (!form.name.trim()) return setError('ต้องกรอกชื่อรายการ');

    const payload = toPayload(form);
    if (payload.discountPct < 0 || payload.discountPct > 100) return setError('ส่วนลดต้องอยู่ระหว่าง 0–100');

    setBusy(true);
    try {
      const ok = editingId === 'new' ? await onAdd(payload) : await onUpdate(editingId, payload);
      if (ok === false) return;
      cancel();
    } finally {
      setBusy(false);
    }
  }

  async function remove(part) {
    setBusy(true);
    try {
      await onDelete(part._id);
    } finally {
      setBusy(false);
    }
  }

  // แถวฟอร์ม (ใช้ทั้งเพิ่มและแก้)
  const formRow = (key) => (
    <tr key={key} style={{ borderBottom: '1px solid #f2efe8', background: '#fdf7ec' }}>
      <td style={CELL}>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="ชื่ออะไหล่ / ค่าแรง" style={IN} autoFocus />
      </td>
      <td style={CELL}>
        <input value={form.partNo} onChange={(e) => set('partNo', e.target.value)} placeholder="Part number" style={{ ...IN, ...MONO }} />
      </td>
      <td style={{ padding: 10 }}>
        <input value={form.qty} onChange={(e) => set('qty', e.target.value)} style={IN_NUM} />
      </td>
      <td style={{ padding: 10 }}>
        <input value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="ชิ้น" style={IN} />
      </td>
      <td style={{ padding: 10 }}>
        <input value={form.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} placeholder="0" style={IN_NUM} />
      </td>
      <td style={{ padding: 10 }}>
        <input value={form.discountPct} onChange={(e) => set('discountPct', e.target.value)} style={IN_NUM} />
      </td>
      <td style={{ padding: 10 }}>
        <input value={form.prCode} onChange={(e) => set('prCode', e.target.value)} placeholder="ยังไม่ออก PR" style={{ ...IN, ...MONO }} />
      </td>
      <td style={{ ...NUM, color: '#8a837a' }}>
        {fmt(toPayload(form).qty * toPayload(form).unitPrice * (1 - toPayload(form).discountPct / 100))}
      </td>
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'inline-flex', gap: 5 }}>
          <button className="hov-orange" onClick={submit} disabled={busy} style={{ ...BTN, background: '#b45309', color: '#fff', border: 0 }}>
            <Icon name="check" size={12} strokeWidth={2.2} /> {busy ? 'กำลังบันทึก' : 'บันทึก'}
          </button>
          <button className="hov-border" onClick={cancel} disabled={busy} style={BTN}>
            ยกเลิก
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <>
      {error && (
        <div
          style={{
            margin: '0 14px 10px',
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

      <table style={{ width: '100%', fontSize: '12.5px' }}>
        <thead>
          <tr style={{ background: '#faf8f4', textAlign: 'left' }}>
            <th style={TH}>รายการ</th>
            <th style={TH}>Part number</th>
            <th style={{ ...TH, textAlign: 'right' }}>จำนวน</th>
            <th style={TH}>หน่วย</th>
            <th style={{ ...TH, textAlign: 'right' }}>ราคา/หน่วย</th>
            <th style={{ ...TH, textAlign: 'right' }}>ส่วนลด %</th>
            <th style={TH}>เลข PR</th>
            <th style={{ ...TH, textAlign: 'right' }}>รวม</th>
            <th style={TH} />
          </tr>
        </thead>
        <tbody>
          {parts.map((p) =>
            editingId === p._id ? (
              formRow(p._id)
            ) : (
              <tr key={p._id} style={{ borderBottom: '1px solid #f2efe8' }}>
                <td style={CELL}>{p.name}</td>
                <td style={{ ...CELL, ...MONO, fontSize: '11.5px', color: '#4b453e' }}>{p.partNo}</td>
                <td style={NUM}>{p.qty}</td>
                <td style={{ padding: 10, color: '#6f6860' }}>{p.unit}</td>
                <td style={NUM}>{fmt(p.unitPrice)}</td>
                <td style={{ ...NUM, color: p.disc ? '#b45309' : '#a29a90' }}>{p.disc ? `${p.disc}%` : '—'}</td>
                <td style={{ padding: 10, ...MONO, fontSize: '11.5px', color: p.pr ? '#0f5f5c' : '#a29a90' }}>
                  {p.pr || 'ยังไม่ออก'}
                </td>
                <td style={{ ...NUM, fontWeight: 600 }}>{fmt(p.qty * p.unitPrice * (1 - p.disc / 100))}</td>
                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', gap: 5 }}>
                    <button className="hov-border" onClick={() => startEdit(p)} disabled={busy} title="แก้ไขรายการนี้" style={BTN}>
                      <Icon name="pencil" size={12} /> แก้
                    </button>
                    <button className="hov-danger" onClick={() => remove(p)} disabled={busy} title="ลบรายการนี้" style={BTN}>
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          )}

          {editingId === 'new' && formRow('new')}

          {parts.length === 0 && editingId !== 'new' && (
            <tr>
              <td colSpan={9} style={{ padding: '22px 14px', textAlign: 'center', color: '#a29a90', fontSize: '12.5px' }}>
                ยังไม่มีรายการอะไหล่หรือค่าแรง — กด "+ เพิ่มรายการ" ด้านบน
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {editingId === null && (
        <div style={{ padding: '10px 14px 0' }}>
          <button
            className="hov-border"
            onClick={startAdd}
            style={{
              background: '#f6f4ef',
              border: '1px solid #e2ddd2',
              borderRadius: 7,
              padding: '7px 12px',
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="plus" size={13} strokeWidth={2.1} /> เพิ่มรายการ
          </button>
        </div>
      )}
    </>
  );
}
