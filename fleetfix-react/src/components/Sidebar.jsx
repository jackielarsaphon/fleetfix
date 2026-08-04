import Icon from './Icon.jsx';

const NAV = [
  { key: 'dash', icon: 'dashboard', label: 'แดชบอร์ด' },
  { key: 'list', icon: 'jobs', label: 'งานซ่อม', useBadge: true },
  { key: 'fleet', icon: 'truck', label: 'ทะเบียนรถ' },
  { key: 'vehNew', icon: 'truckPlus', label: 'เพิ่มทะเบียนรถ' },
  { key: 'places', icon: 'garage', label: 'สถานที่ซ่อม' },
];

export default function Sidebar({ screen, openCount, onNavigate, onReload, busy, sourceLabel = 'ข้อมูลผ่าน Go API' }) {
  return (
    <aside
      style={{
        background: '#1c1b18',
        color: '#f2efe8',
        padding: '22px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 26,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: '#b45309',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="wrench" size={15} strokeWidth={2} style={{ color: '#fff' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px' }}>ระบบแจ้งซ่อมรถ</div>
        </div>
        <div style={{ fontSize: 11, color: '#8f887c', paddingLeft: 35 }}>ฝ่ายบริการยานยนต์</div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV.map((n) => {
          const active = screen === n.key || (n.key === 'list' && screen === 'detail');
          const badge = n.useBadge ? openCount : 0;
          return (
            <button
              key={n.key}
              className="hov-nav"
              onClick={() => onNavigate(n.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                textAlign: 'left',
                border: 0,
                cursor: 'pointer',
                padding: '9px 11px',
                borderRadius: 8,
                fontSize: '13.5px',
                fontWeight: active ? 600 : 400,
                color: active ? '#fff' : '#c3bcb0',
                background: active ? '#33302a' : 'transparent',
              }}
            >
              <Icon name={n.icon} size={17} style={{ opacity: active ? 1 : 0.75 }} />
              <span>{n.label}</span>
              {badge > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    background: '#b45309',
                    color: '#fff',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: 999,
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: 'auto',
          fontSize: '10.5px',
          color: '#78716a',
          lineHeight: 1.6,
          borderTop: '1px solid #2e2c27',
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div>{busy ? <span style={{ color: '#b45309' }}>กำลังซิงก์ข้อมูล...</span> : sourceLabel}</div>
        <button
          className="hov-nav"
          onClick={onReload}
          disabled={busy}
          style={{
            background: 'transparent',
            border: '1px solid #2e2c27',
            borderRadius: 7,
            color: '#c3bcb0',
            fontSize: 11.5,
            padding: '7px 9px',
            cursor: busy ? 'wait' : 'pointer',
            textAlign: 'left',
          }}
        >
          โหลดข้อมูลใหม่
        </button>
      </div>
    </aside>
  );
}
