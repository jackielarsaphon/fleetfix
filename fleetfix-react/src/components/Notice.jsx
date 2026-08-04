import Icon from './Icon.jsx';

/** ข้อความเต็มหน้าจอ: กำลังโหลด / ตั้งค่าไม่ครบ / ยังไม่ได้ apply migration / error */
export default function Notice({ title, children, tone = 'info', onRetry }) {
  const accent = tone === 'error' ? '#b3261e' : tone === 'warn' ? '#b45309' : '#0f5f5c';
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#edeae3' }}>
      <div
        style={{
          width: 620,
          maxWidth: '100%',
          background: '#fff',
          border: '1px solid #ded8cc',
          borderLeft: `4px solid ${accent}`,
          borderRadius: 12,
          padding: '22px 24px 24px',
          boxShadow: '0 12px 40px rgba(28,27,24,0.08)',
        }}
      >
        <h1 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: accent }}>{title}</h1>
        <div style={{ fontSize: '13.5px', lineHeight: 1.75, color: '#4b453e' }}>{children}</div>
        {onRetry && (
          <button
            className="hov-orange"
            onClick={onRetry}
            style={{
              marginTop: 18,
              background: '#b45309',
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
            <Icon name="check" size={15} strokeWidth={2.1} /> ลองอีกครั้ง
          </button>
        )}
      </div>
    </div>
  );
}
