import { MONTHLY } from '../data.js';
import { fmt } from '../utils.js';

const CARD = { background: '#fff', border: '1px solid #ded8cc', borderRadius: 12 };

export default function DashboardScreen({ counts, perVehicle, onOpenVehicle }) {
  const maxM = Math.max(...MONTHLY.map((m) => m.v));
  const maxCost = Math.max(...perVehicle.map((v) => v.cost), 1);
  const frequent = [...perVehicle].sort((a, b) => b.count - a.count || b.cost - a.cost).slice(0, 5);

  const kpis = [
    { label: 'งานค้างทั้งหมด', value: counts['ทั้งหมด'] - counts['เสร็จแล้ว'], unit: 'ใบ', delta: '+2 จากเดือนก่อน', up: false },
    { label: 'รออะไหล่', value: counts['รออะไหล่'], unit: 'ใบ', delta: 'ค้างนานสุด 28 วัน', up: false },
    { label: 'ค่าซ่อมเดือนนี้', value: '88,300', unit: '฿', delta: '+70% จากเดือนก่อน', up: false },
    { label: 'เวลาซ่อมเฉลี่ย', value: '3.4', unit: 'วัน', delta: '−0.6 วัน ดีขึ้น', up: true },
  ];

  return (
    <div>
      <header style={{ background: '#f6f4ef', borderBottom: '1px solid #ded8cc', padding: '20px 28px' }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-0.3px' }}>ภาพรวมงานซ่อม</h1>
        <div style={{ fontSize: '12.5px', color: '#6f6860', marginTop: 3 }}>เดือนกรกฎาคม 2569 · เทียบกับเดือนก่อน</div>
      </header>

      <div style={{ padding: '22px 28px 44px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ ...CARD, padding: '15px 16px' }}>
              <div style={{ fontSize: 12, color: '#6f6860' }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
                {k.value}
                <span style={{ fontSize: 13, fontWeight: 500, color: '#8a837a', marginLeft: 4 }}>{k.unit}</span>
              </div>
              <div style={{ fontSize: '11.5px', marginTop: 7, color: k.up ? '#157347' : '#a8580c' }}>{k.delta}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <section style={{ ...CARD, padding: '16px 18px 20px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '14.5px', fontWeight: 600 }}>ค่าซ่อมรายเดือน</h2>
            <div style={{ fontSize: '11.5px', color: '#8a837a', marginBottom: 18 }}>หน่วยบาท</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 190 }}>
              {MONTHLY.map((m, k) => (
                <div
                  key={m.label}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}
                >
                  <div style={{ fontSize: 11, color: '#6f6860', fontVariantNumeric: 'tabular-nums' }}>{fmt(m.v)}</div>
                  <div
                    style={{
                      width: '100%',
                      borderRadius: '6px 6px 0 0',
                      background: k === MONTHLY.length - 1 ? '#b45309' : '#d9d2c4',
                      height: Math.round((m.v / maxM) * 140),
                    }}
                  />
                  <div style={{ fontSize: '11.5px', color: '#8a837a' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ ...CARD, padding: '16px 18px 18px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '14.5px', fontWeight: 600 }}>รถที่ซ่อมบ่อย</h2>
            <div style={{ fontSize: '11.5px', color: '#8a837a', marginBottom: 14 }}>6 เดือนย้อนหลัง</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {frequent.map((v) => (
                <div key={v.code} onClick={() => onOpenVehicle(v.code)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: 5 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{v.code}</span>
                    <span style={{ color: '#6f6860' }}>
                      {v.count} ครั้ง · {fmt(v.cost)} ฿
                    </span>
                  </div>
                  <div style={{ height: 7, background: '#eeeae1', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 4,
                        background: '#b45309',
                        width: `${Math.max(6, Math.round((v.cost / maxCost) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
