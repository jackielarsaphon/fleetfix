import { chipStyle, decorate, fmt } from '../utils.js';
import Icon from '../components/Icon.jsx';

export default function FleetScreen({ perVehicle, selectedCode, onSelect, jobs, onOpenJob, onNewJob }) {
  const sel = perVehicle.find((v) => v.code === selectedCode) || perVehicle[0];
  const vehicleJobs = jobs
    .map((job, index) => ({ job, index }))
    .filter(({ job }) => job.vehicle === sel?.code)
    .map(({ job, index }) => ({ job: decorate(job), index }));

  return (
    <div>
      <header
        style={{
          background: '#f6f4ef',
          borderBottom: '1px solid #ded8cc',
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-0.3px' }}>ทะเบียนรถและประวัติซ่อม</h1>
          <div style={{ fontSize: '12.5px', color: '#6f6860', marginTop: 3 }}>
            ทั้งหมด {perVehicle.length} คัน · คลิกที่รถเพื่อดูประวัติซ่อมทั้งหมดของคันนั้น
          </div>
        </div>
      </header>

      <div style={{ padding: '22px 28px 44px', display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid #ded8cc', borderRadius: 12, overflow: 'hidden' }}>
          {perVehicle.map((v) => (
            <div
              key={v.code}
              onClick={() => onSelect(v.code)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
                padding: '12px 14px',
                cursor: 'pointer',
                borderBottom: '1px solid #efece4',
                borderLeft: `3px solid ${sel?.code === v.code ? '#b45309' : 'transparent'}`,
                background: sel?.code === v.code ? '#faf6f0' : '#fff',
              }}
            >
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="truck" size={17} style={{ color: sel?.code === v.code ? '#b45309' : '#a79f92' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600 }}>{v.code}</div>
                  <div style={{ fontSize: '11.5px', color: '#8a837a', marginTop: 2 }}>{v.plate ? `${v.model} · ${v.plate}` : v.model}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '11.5px', color: '#6f6860', flex: '0 0 auto', whiteSpace: 'nowrap' }}>
                <div>ซ่อม {v.count} ครั้ง</div>
                <div style={{ marginTop: 2 }}>{fmt(v.cost)} ฿</div>
              </div>
            </div>
          ))}
        </div>

        <section style={{ background: '#fff', border: '1px solid #ded8cc', borderRadius: 12, padding: '16px 18px 18px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              borderBottom: '1px solid #efece4',
              paddingBottom: 13,
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                {sel?.code} · {sel?.plate ? `${sel.model} · ทะเบียน ${sel.plate}` : sel?.model}
              </h2>
              <div style={{ fontSize: 12, color: '#6f6860', marginTop: 4 }}>
                เลขไมล์ล่าสุด {sel?.mileage ? fmt(sel.mileage) : '—'} กม. · ซ่อมครั้งล่าสุด {sel?.lastDate}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11.5px', color: '#8a837a' }}>ค่าซ่อมรวมทั้งคัน</div>
              <div style={{ fontSize: 19, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(sel?.cost || 0)} ฿</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {vehicleJobs.length === 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 11,
                  border: '1px dashed #d5cec2',
                  borderRadius: 10,
                  padding: '26px 16px',
                  color: '#8a837a',
                  fontSize: '12.5px',
                }}
              >
                <span>ยังไม่มีประวัติซ่อมสำหรับรถคันนี้</span>
                <button
                  className="hov-border"
                  onClick={onNewJob}
                  style={{
                    background: '#fff',
                    border: '1px solid #d8d1c4',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#b45309',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                >
                  <Icon name="plus" size={14} strokeWidth={2.1} /> แจ้งซ่อมใหม่
                </button>
              </div>
            )}
            {vehicleJobs.map(({ job, index }) => (
              <div
                key={job.code}
                className="hov-card"
                onClick={() => onOpenJob(index)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '96px minmax(0, 1fr) auto auto',
                  gap: 14,
                  alignItems: 'center',
                  padding: '11px 12px',
                  border: '1px solid #e8e3d8',
                  borderRadius: 9,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#6f6860', whiteSpace: 'nowrap' }}>{job.reportedAt}</div>
                <div style={{ fontSize: 13, minWidth: 0 }}>{job.symptom}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{job.totalText}</div>
                <span style={chipStyle(job.status)}>{job.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
