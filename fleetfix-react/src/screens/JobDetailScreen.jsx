import { useState } from 'react';
import { NEXT_LABEL, ORDER } from '../constants.js';
import { chipStyle, decorate, fmt, prList, totals } from '../utils.js';
import ImageSlot from '../components/ImageSlot.jsx';
import Icon from '../components/Icon.jsx';
import Lightbox from '../components/Lightbox.jsx';

const TH = { padding: '9px 14px', fontSize: 11, fontWeight: 600, color: '#6f6860', borderBottom: '1px solid #efece4' };
const CARD = { background: '#fff', border: '1px solid #ded8cc', borderRadius: 12 };
const ROW = { display: 'flex', justifyContent: 'space-between', gap: 10 };

/** กลุ่มรูปหนึ่งประเภท: รูปที่มีอยู่ + ช่องว่างสำหรับเพิ่มรูปใหม่ */
function PhotoGroup({ title, color, photos, addLabel, onUpload, onDeletePhoto, onExpand }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 7 }}>
        {title} <span style={{ color: '#8a837a', fontWeight: 400 }}>({photos.length})</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {photos.map((p) => (
          <div key={p._id} style={{ height: 118 }}>
            <ImageSlot
              src={p.src}
              placeholder={p.caption || title}
              onDelete={() => onDeletePhoto(p._id)}
              onExpand={() => onExpand(p._id)}
            />
          </div>
        ))}
        <div style={{ height: 118 }}>
          <ImageSlot placeholder={addLabel} onUpload={onUpload} />
        </div>
      </div>
    </div>
  );
}

export default function JobDetailScreen({
  job,
  photos = [],
  onBack,
  onAdvance,
  onPartPrChange,
  onUploadPhoto,
  onDeletePhoto,
  onEdit,
  onDelete,
}) {
  const cur = decorate(job);
  const t = totals(job);
  const prs = prList(job);
  const doneStep = ORDER.indexOf(job.status);

  // ดูรูปเต็มจอ — เลื่อนดูได้ทุกรูปในใบงาน ไม่ใช่แค่รูปที่คลิก
  const [lightboxAt, setLightboxAt] = useState(-1);
  const openPhoto = (photoId) => setLightboxAt(photos.findIndex((p) => p._id === photoId));

  const timeline = [
    { title: 'รับแจ้งซ่อม', meta: `${job.reportedAt} · ${job.reporter}` },
    { title: 'ออก PR สั่งอะไหล่', meta: prs.length ? `${prs.join(', ')} · ฝ่ายจัดซื้อ` : 'ยังไม่ออก PR' },
    { title: 'ลงมือซ่อม', meta: doneStep >= 2 ? `${job.tech} · ${job.place}` : 'รอคิวช่าง' },
    { title: 'ปิดงาน', meta: job.doneDate === '—' ? 'ยังไม่ปิดงาน' : `เสร็จ ${job.doneDate}` },
  ];

  // จัดกลุ่มอะไหล่ตามเลข PR
  const prGroups = [];
  job.parts.forEach((p) => {
    const code = (p.pr || '').trim() || job.pr || '';
    const key = code || '—';
    const gross = p.qty * p.unitPrice;
    const net = gross - (gross * (p.disc || 0)) / 100;
    let g = prGroups.find((x) => x.key === key);
    if (!g) {
      g = { key, code: code || 'ยังไม่ออก PR', items: 0, amount: 0, pending: !code };
      prGroups.push(g);
    }
    g.items += 1;
    g.amount += net;
  });

  return (
    <div>
      {lightboxAt >= 0 && (
        <Lightbox
          items={photos.map((p) => ({
            src: p.src,
            caption: `${p.kind === 'before' ? 'ก่อนซ่อม' : 'หลังซ่อม'}${p.caption ? ' · ' + p.caption : ''} · ${job.code}`,
          }))}
          startAt={lightboxAt}
          onClose={() => setLightboxAt(-1)}
        />
      )}

      <header
        style={{
          background: '#f6f4ef',
          borderBottom: '1px solid #ded8cc',
          padding: '16px 28px 18px',
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}
      >
        <button
          className="hov-text"
          onClick={onBack}
          style={{
            background: 'none',
            border: 0,
            padding: 0,
            fontSize: '12.5px',
            color: '#6f6860',
            cursor: 'pointer',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="arrowLeft" size={14} /> กลับรายการงานซ่อม
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', lineHeight: 1.3 }}>
              <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.35 }}>{job.symptom}</h1>
              <span style={chipStyle(job.status)}>{job.status}</span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#6f6860', marginTop: 5, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{job.code}</span>
              <span>
                เบอร์รถ <strong>{job.vehicle}</strong>
              </span>
              <span>เลขไมล์ {cur.mileageText} กม.</span>
              <span>วันที่เสีย {job.breakDate}</span>
              <span>วันที่เสร็จ {job.doneDate}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="hov-danger"
              onClick={onDelete}
              title="ลบใบงานนี้ถาวร"
              style={{
                background: '#fff',
                border: '1px solid #d8d1c4',
                borderRadius: 8,
                padding: '9px 13px',
                fontSize: 13,
                color: '#8a837a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <Icon name="trash" size={15} /> ลบ
            </button>
            <button
              className="hov-border"
              onClick={onEdit}
              style={{
                background: '#fff',
                border: '1px solid #d8d1c4',
                borderRadius: 8,
                padding: '9px 14px',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <Icon name="pencil" size={15} /> แก้ไข
            </button>
            <button
              className="hov-border"
              onClick={() => window.print()}
              style={{
                background: '#fff',
                border: '1px solid #d8d1c4',
                borderRadius: 8,
                padding: '9px 14px',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <Icon name="printer" size={15} /> พิมพ์ใบงาน
            </button>
            <button
              className="hov-teal"
              onClick={onAdvance}
              style={{
                background: '#0f5f5c',
                color: '#fff',
                border: 0,
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <Icon name="check" size={15} strokeWidth={2.1} /> {NEXT_LABEL[job.status]}
            </button>
          </div>
        </div>
      </header>

      <div style={{ padding: '22px 28px 44px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section style={{ ...CARD, overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid #efece4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: 600 }}>รายการอะไหล่และค่าแรง</h2>
              <button
                className="hov-border"
                style={{
                  background: '#f6f4ef',
                  border: '1px solid #e2ddd2',
                  borderRadius: 7,
                  padding: '6px 11px',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name="plus" size={13} strokeWidth={2.1} /> เพิ่มรายการ
              </button>
            </div>
            <table style={{ width: '100%', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#faf8f4', textAlign: 'left' }}>
                  <th style={TH}>รายการ</th>
                  <th style={TH}>Part number</th>
                  <th style={{ ...TH, textAlign: 'right' }}>จำนวน</th>
                  <th style={TH}>หน่วย</th>
                  <th style={{ ...TH, textAlign: 'right' }}>ราคา/หน่วย</th>
                  <th style={{ ...TH, textAlign: 'right' }}>ส่วนลด</th>
                  <th style={TH}>เลข PR</th>
                  <th style={{ ...TH, textAlign: 'right' }}>รวม</th>
                </tr>
              </thead>
              <tbody>
                {job.parts.map((p, k) => {
                  const gross = p.qty * p.unitPrice;
                  const d = (gross * (p.disc || 0)) / 100;
                  return (
                    <tr key={`${p.partNo}-${k}`} style={{ borderBottom: '1px solid #f2efe8' }}>
                      <td style={{ padding: '10px 14px' }}>{p.name}</td>
                      <td style={{ padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11.5px', color: '#4b453e' }}>{p.partNo}</td>
                      <td style={{ padding: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.qty}</td>
                      <td style={{ padding: 10, color: '#6f6860' }}>{p.unit}</td>
                      <td style={{ padding: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.unitPrice)}</td>
                      <td style={{ padding: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#b45309' }}>
                        {p.disc ? `${p.disc}%` : '—'}
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <input
                          value={p.pr || ''}
                          onChange={(e) => onPartPrChange(k, e.target.value)}
                          placeholder="ยังไม่ออก PR"
                          style={{
                            width: 118,
                            padding: '6px 8px',
                            border: '1px solid #e2ddd2',
                            borderRadius: 6,
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '11.5px',
                            background: '#fff',
                          }}
                        />
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {fmt(gross - d)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 14px 16px', background: '#faf8f4', borderTop: '1px solid #efece4' }}>
              <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 7, fontSize: '12.5px' }}>
                <div style={ROW}>
                  <span style={{ color: '#6f6860' }}>มูลค่าอะไหล่และค่าแรง</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(t.sub)}</span>
                </div>
                {/* แสดงบรรทัดส่วนลดเฉพาะเมื่อมีส่วนลดจริง ไม่ต้องขึ้น "−0" ให้เกะกะ */}
                {Math.round(t.disc) > 0 && (
                  <div style={ROW}>
                    <span style={{ color: '#6f6860' }}>ส่วนลดรวม</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#b45309' }}>−{fmt(t.disc)}</span>
                  </div>
                )}
                <div style={{ ...ROW, borderTop: '1px solid #e2ddd2', paddingTop: 8, fontSize: 15, fontWeight: 700 }}>
                  <span>รวมทั้งสิ้น</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(t.grand)} ฿</span>
                </div>
              </div>
            </div>
          </section>

          <section style={{ ...CARD, padding: '15px 16px 17px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: 600 }}>รูปภาพก่อน / หลังซ่อม</h2>
              <span style={{ fontSize: '11.5px', color: '#8a837a' }}>
                {photos.length ? `${photos.length} รูป · ลากรูปมาวางเพื่อเพิ่ม` : 'ลากรูปมาวางในช่องได้เลย'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <PhotoGroup
                title="ก่อนซ่อม"
                color="#b45309"
                photos={photos.filter((p) => p.kind === 'before')}
                addLabel="เพิ่มรูปอาการเสีย"
                onUpload={(file) => onUploadPhoto(file, 'before')}
                onDeletePhoto={onDeletePhoto}
                onExpand={openPhoto}
              />
              <PhotoGroup
                title="หลังซ่อม"
                color="#157347"
                photos={photos.filter((p) => p.kind === 'after')}
                addLabel="เพิ่มรูปงานที่เสร็จ"
                onUpload={(file) => onUploadPhoto(file, 'after')}
                onDeletePhoto={onDeletePhoto}
                onExpand={openPhoto}
              />
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <section style={{ ...CARD, padding: '15px 16px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '14.5px', fontWeight: 600 }}>ข้อมูลใบงาน</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontSize: '12.5px' }}>
              <div style={ROW}>
                <span style={{ color: '#8a837a' }}>ผู้แจ้ง</span>
                <span style={{ textAlign: 'right' }}>{job.reporter}</span>
              </div>
              <div style={ROW}>
                <span style={{ color: '#8a837a' }}>ช่างที่ทำ</span>
                <span style={{ textAlign: 'right' }}>{job.tech}</span>
              </div>
              <div style={ROW}>
                <span style={{ color: '#8a837a' }}>อาการหลัก</span>
                <span style={{ textAlign: 'right' }}>{job.rootCause}</span>
              </div>
              <div style={{ borderTop: '1px solid #efece4', paddingTop: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ color: '#8a837a' }}>ใบสั่งซื้อ (PR)</span>
                <span style={{ fontSize: '11.5px', color: '#8a837a' }}>{cur.prCountText}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {prGroups.map((g) => (
                  <div
                    key={g.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      background: '#faf8f4',
                      border: '1px solid #eee9df',
                      borderRadius: 8,
                      padding: '8px 10px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: g.pending ? '#a8580c' : '#0f5f5c',
                        }}
                      >
                        {g.code}
                      </div>
                      <div style={{ fontSize: 11, color: '#8a837a', marginTop: 2 }}>อะไหล่ {g.items} รายการ</div>
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {fmt(g.amount * 1.07)} ฿
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#a29a90', marginTop: -3 }}>แก้เลข PR รายอะไหล่ได้ในตารางด้านซ้าย</div>
              <div style={ROW}>
                <span style={{ color: '#8a837a' }}>ที่ซ่อม</span>
                <span style={{ textAlign: 'right' }}>{job.place}</span>
              </div>
              <div style={{ borderTop: '1px solid #efece4', paddingTop: 10, color: '#8a837a' }}>หมายเหตุ</div>
              <div
                style={{
                  background: '#fdf7ec',
                  border: '1px solid #f0e2c8',
                  borderRadius: 8,
                  padding: '9px 11px',
                  lineHeight: 1.55,
                  color: '#7a4a0c',
                }}
              >
                {job.note}
              </div>
            </div>
          </section>

          <section style={{ ...CARD, padding: '15px 16px 6px' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: '14.5px', fontWeight: 600 }}>ไทม์ไลน์การซ่อม</h2>
            {timeline.map((ev, k) => (
              <div key={ev.title} style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: 10, paddingBottom: 14, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: '50%',
                      flex: '0 0 auto',
                      background: k <= doneStep ? '#157347' : '#fff',
                      border: `2px solid ${k <= doneStep ? '#157347' : '#d5cec2'}`,
                    }}
                  />
                  {k !== timeline.length - 1 && (
                    <span
                      style={{
                        flex: 1,
                        width: 2,
                        background: k < doneStep ? '#157347' : '#e6e1d6',
                        marginTop: 3,
                        minHeight: 16,
                      }}
                    />
                  )}
                </div>
                <div style={{ paddingBottom: 2 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{ev.title}</div>
                  <div style={{ fontSize: '11.5px', color: '#8a837a', marginTop: 2 }}>{ev.meta}</div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
