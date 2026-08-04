import { useEffect } from 'react';
import Icon from './Icon.jsx';

const TONES = {
  success: { accent: '#157347', bg: '#e4f2e8', icon: 'check' },
  warn: { accent: '#b45309', bg: '#fdf0da', icon: 'plus' },
  error: { accent: '#b3261e', bg: '#fdecea', icon: 'close' },
};

/**
 * กล่องข้อความกลางจอ — ใช้แจ้งผลการบันทึกหรือถามยืนยัน
 * ปิดด้วยปุ่ม, คลิกพื้นหลัง หรือกด Esc
 */
export default function Dialog({ title, tone = 'success', children, actions, onClose }) {
  const t = TONES[tone] || TONES.success;

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(28, 27, 24, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: '100%',
          background: '#fff',
          border: '1px solid #ded8cc',
          borderRadius: 14,
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 22px 16px', display: 'flex', gap: 13, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: t.bg,
              color: t.accent,
              display: 'grid',
              placeItems: 'center',
              flex: '0 0 auto',
            }}
          >
            <Icon name={t.icon} size={18} strokeWidth={2.3} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700 }}>{title}</h2>
            <div style={{ fontSize: '12.5px', color: '#4b453e', lineHeight: 1.7, marginTop: 8 }}>{children}</div>
          </div>
          <button
            className="hov-dark"
            onClick={onClose}
            title="ปิด (Esc)"
            style={{ background: 'none', border: 0, color: '#8a837a', cursor: 'pointer', padding: 2, display: 'grid' }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div
          style={{
            padding: '13px 22px',
            borderTop: '1px solid #efece4',
            background: '#f6f4ef',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 9,
          }}
        >
          {actions}
        </div>
      </div>
    </div>
  );
}
