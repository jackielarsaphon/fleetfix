import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon.jsx';

const ROUND_BTN = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'rgba(28,27,24,0.65)',
  color: '#fff',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  padding: 0,
  flex: '0 0 auto',
};

/**
 * ดูรูปเต็มหน้าจอ
 *
 * items    : [{ src, caption }]
 * startAt  : ลำดับรูปที่เปิดก่อน
 * onClose  : ปิด (คลิกพื้นหลัง / ปุ่มกากบาท / Esc)
 * เลื่อนรูปด้วยปุ่มลูกศรบนจอหรือปุ่ม ← → บนคีย์บอร์ด
 */
export default function Lightbox({ items, startAt = 0, onClose }) {
  const [index, setIndex] = useState(startAt);
  const [failed, setFailed] = useState(false);
  const count = items.length;

  const go = useCallback(
    (step) => {
      setFailed(false);
      setIndex((i) => (i + step + count) % count);
    },
    [count]
  );

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && count > 1) go(-1);
      else if (e.key === 'ArrowRight' && count > 1) go(1);
    }
    window.addEventListener('keydown', onKey);
    // กันหน้าเว็บด้านหลังเลื่อนตามขณะเปิดดูรูป
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [count, go, onClose]);

  if (!count) return null;
  const current = items[Math.min(index, count - 1)];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(18, 17, 15, 0.88)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: '56px 20px 28px',
      }}
    >
      <button
        onClick={onClose}
        title="ปิด (Esc)"
        style={{ ...ROUND_BTN, position: 'absolute', top: 16, right: 18 }}
      >
        <Icon name="close" size={19} />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: 16, maxWidth: '100%', maxHeight: '100%' }}
      >
        {count > 1 && (
          <button onClick={() => go(-1)} title="รูปก่อนหน้า (←)" style={ROUND_BTN}>
            <Icon name="chevronLeft" size={20} />
          </button>
        )}

        {failed ? (
          <div
            style={{
              width: 'min(520px, 80vw)',
              padding: '48px 28px',
              borderRadius: 10,
              border: '1px dashed rgba(255,255,255,0.28)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e7e2d8',
              textAlign: 'center',
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            โหลดรูปไม่ขึ้น
            <br />
            <span style={{ color: '#a8a29a', fontSize: 12 }}>
              ลิงก์รูปอาจหมดอายุแล้ว — ปิดหน้านี้แล้วรีเฟรชหน้าเว็บอีกครั้ง
            </span>
          </div>
        ) : (
          <img
            src={current.src}
            alt={current.caption || 'รูปประกอบใบงาน'}
            onError={() => setFailed(true)}
            style={{
              maxWidth: 'min(1100px, 82vw)',
              maxHeight: '78vh',
              objectFit: 'contain',
              borderRadius: 10,
              boxShadow: '0 24px 70px rgba(0,0,0,0.55)',
              background: '#000',
            }}
          />
        )}

        {count > 1 && (
          <button onClick={() => go(1)} title="รูปถัดไป (→)" style={ROUND_BTN}>
            <Icon name="chevronRight" size={20} />
          </button>
        )}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ color: '#e7e2d8', fontSize: '12.5px', textAlign: 'center', lineHeight: 1.6 }}
      >
        {current.caption && <div style={{ fontWeight: 600 }}>{current.caption}</div>}
        <div style={{ color: '#a8a29a' }}>
          {count > 1 ? `${index + 1} / ${count} · ` : ''}คลิกพื้นหลังหรือกด Esc เพื่อปิด
        </div>
      </div>
    </div>
  );
}
