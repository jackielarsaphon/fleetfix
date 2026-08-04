import { fmt } from '../utils.js';

const CARD = { background: '#fff', border: '1px solid #ded8cc', borderRadius: 12 };

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** 'YYYY-MM' → 'ก.ค.' */
function monthLabel(key) {
  const m = Number(key.slice(5, 7));
  return THAI_MONTHS[m - 1] || key;
}

/** คืนคีย์ 'YYYY-MM' ของ n เดือนล่าสุด (เก่า → ใหม่) */
function lastMonthKeys(n) {
  const now = new Date();
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/** ข้อความเปรียบเทียบกับเดือนก่อน เช่น '+70% จากเดือนก่อน' */
function compareText(now, prev, unit = '%') {
  if (prev === null || prev === undefined || prev === 0) {
    return now > 0 ? 'เดือนก่อนไม่มีค่าซ่อม' : 'ยังไม่มีค่าซ่อมเดือนนี้';
  }
  const diff = ((now - prev) / prev) * 100;
  if (Math.abs(diff) < 0.5) return 'เท่ากับเดือนก่อน';
  return `${diff > 0 ? '+' : '−'}${Math.abs(Math.round(diff))}${unit} จากเดือนก่อน`;
}

export default function DashboardScreen({ counts, perVehicle, jobs, stats, onOpenVehicle }) {
  const monthly = stats?.monthly || [];
  const byMonth = new Map(monthly.map((m) => [m.month, m]));

  // เติมเดือนที่ไม่มีงานให้เป็น 0 เพื่อให้กราฟไม่ข้ามเดือน
  const chart = lastMonthKeys(6).map((key) => ({
    key,
    label: monthLabel(key),
    value: byMonth.get(key)?.totalCost ?? 0,
  }));

  const thisKey = chart[chart.length - 1].key;
  const prevKey = chart[chart.length - 2]?.key;
  const thisMonthCost = byMonth.get(thisKey)?.totalCost ?? 0;
  const prevMonthCost = prevKey ? (byMonth.get(prevKey)?.totalCost ?? 0) : 0;

  const maxM = Math.max(...chart.map((m) => m.value), 1);
  const maxCost = Math.max(...perVehicle.map((v) => v.cost), 1);
  const frequent = [...perVehicle].sort((a, b) => b.count - a.count || b.cost - a.cost).slice(0, 5);

  const open = counts['ทั้งหมด'] - counts['เสร็จแล้ว'];

  // งานรออะไหล่ที่ค้างนานที่สุด
  const oldestWaiting = jobs
    .filter((j) => j.status === 'รออะไหล่')
    .reduce((max, j) => Math.max(max, j.age || 0), 0);

  const avg = stats?.avgRepairDays;
  const avgPrev = stats?.avgRepairDaysPrev;
  const avgDelta =
    avg === null || avg === undefined
      ? 'เดือนนี้ยังไม่มีงานปิด'
      : avgPrev === null || avgPrev === undefined
        ? 'ยังไม่มีข้อมูลเดือนก่อนให้เทียบ'
        : Math.abs(avg - avgPrev) < 0.05
          ? 'เท่ากับเดือนก่อน'
          : `${avg < avgPrev ? '−' : '+'}${Math.abs(avg - avgPrev).toFixed(1)} วัน ${avg < avgPrev ? 'ดีขึ้น' : 'ช้าลง'}`;

  const kpis = [
    {
      label: 'งานค้างทั้งหมด',
      value: open,
      unit: 'ใบ',
      delta: `จากใบงานทั้งหมด ${counts['ทั้งหมด']} ใบ`,
      up: false,
    },
    {
      label: 'รออะไหล่',
      value: counts['รออะไหล่'],
      unit: 'ใบ',
      delta: oldestWaiting > 0 ? `ค้างนานสุด ${oldestWaiting} วัน` : 'ไม่มีงานค้าง',
      up: false,
    },
    {
      label: 'ค่าซ่อมเดือนนี้',
      value: fmt(thisMonthCost),
      unit: '฿',
      delta: compareText(thisMonthCost, prevMonthCost),
      up: thisMonthCost <= prevMonthCost,
    },
    {
      label: 'เวลาซ่อมเฉลี่ย',
      value: avg === null || avg === undefined ? '—' : avg.toFixed(1),
      unit: 'วัน',
      delta: avgDelta,
      up: avg !== null && avgPrev !== null && avg !== undefined && avgPrev !== undefined && avg < avgPrev,
    },
  ];

  const now = new Date();
  const headerMonth = `เดือน${['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][now.getMonth()]} ${now.getFullYear() + 543}`;

  return (
    <div>
      <header style={{ background: '#f6f4ef', borderBottom: '1px solid #ded8cc', padding: '20px 28px' }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-0.3px' }}>ภาพรวมงานซ่อม</h1>
        <div style={{ fontSize: '12.5px', color: '#6f6860', marginTop: 3 }}>{headerMonth} · เทียบกับเดือนก่อน</div>
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
            <div style={{ fontSize: '11.5px', color: '#8a837a', marginBottom: 18 }}>6 เดือนล่าสุด · หน่วยบาท</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 190 }}>
              {chart.map((m, k) => (
                <div
                  key={m.key}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}
                >
                  <div style={{ fontSize: 11, color: '#6f6860', fontVariantNumeric: 'tabular-nums' }}>
                    {m.value ? fmt(m.value) : '—'}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      borderRadius: '6px 6px 0 0',
                      background: k === chart.length - 1 ? '#b45309' : '#d9d2c4',
                      // เดือนที่ไม่มีค่าซ่อมยังโชว์แท่งบางไว้ให้เห็นว่ามีเดือนนั้น
                      height: m.value ? Math.max(4, Math.round((m.value / maxM) * 140)) : 2,
                    }}
                  />
                  <div style={{ fontSize: '11.5px', color: '#8a837a' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ ...CARD, padding: '16px 18px 18px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '14.5px', fontWeight: 600 }}>รถที่ซ่อมบ่อย</h2>
            <div style={{ fontSize: '11.5px', color: '#8a837a', marginBottom: 14 }}>นับจากใบงานทั้งหมดในระบบ</div>
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
              {frequent.length === 0 && (
                <div style={{ fontSize: '12.5px', color: '#a29a90', textAlign: 'center', padding: '14px 0' }}>ยังไม่มีข้อมูล</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
