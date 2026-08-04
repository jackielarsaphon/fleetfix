import { ORDER, STATUS } from '../constants.js';
import { chipStyle } from '../utils.js';
import Icon from '../components/Icon.jsx';

const TABS = [
  { key: 'table', label: 'ตาราง', hint: 'แบบ A · ตารางแบบ Excel' },
  { key: 'cards', label: 'การ์ด', hint: 'แบบ B · การ์ดต่อใบงาน' },
  { key: 'board', label: 'คิวสถานะ', hint: 'แบบ C · คิวตามสถานะ' },
];

const TH = {
  padding: '11px 14px',
  fontWeight: 600,
  fontSize: '11.5px',
  color: '#6f6860',
  letterSpacing: '0.3px',
  borderBottom: '1px solid #ded8cc',
};

const TD = { padding: '12px 14px', verticalAlign: 'top' };

export default function JobListScreen({
  jobs,
  counts,
  totalJobs,
  pendingCost,
  filter,
  setFilter,
  query,
  setQuery,
  view,
  setView,
  onOpenJob,
  onNewJob,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: '#f6f4ef',
          borderBottom: '1px solid #ded8cc',
          padding: '20px 28px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-0.3px' }}>รายการงานซ่อม</h1>
            <div style={{ fontSize: '12.5px', color: '#6f6860', marginTop: 3 }}>
              แสดง {jobs.length} จาก {totalJobs} ใบงาน · ค่าซ่อมค้างอนุมัติ {pendingCost} บาท
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหา เบอร์รถ / อาการ / เลข PR"
                style={{
                  width: 268,
                  padding: '9px 12px 9px 32px',
                  border: '1px solid #d8d1c4',
                  borderRadius: 8,
                  background: '#fff',
                  fontSize: 13,
                }}
              />
              <Icon
                name="search"
                size={15}
                style={{ position: 'absolute', left: 10, top: 10, color: '#8a837a', pointerEvents: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', background: '#e7e2d8', borderRadius: 8, padding: 3, gap: 2 }}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setView(t.key)}
                  title={t.hint}
                  style={{
                    border: 0,
                    cursor: 'pointer',
                    padding: '7px 13px',
                    borderRadius: 6,
                    fontSize: '12.5px',
                    fontWeight: view === t.key ? 600 : 400,
                    background: view === t.key ? '#fff' : 'transparent',
                    color: view === t.key ? '#1c1b18' : '#6f6860',
                    boxShadow: view === t.key ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              className="hov-orange"
              onClick={onNewJob}
              style={{
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
                whiteSpace: 'nowrap',
              }}
            >
              <Icon name="plus" size={15} strokeWidth={2.1} /> แจ้งซ่อมใหม่
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {['ทั้งหมด', ...ORDER].map((s) => {
            const on = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  border: 0,
                  borderBottom: `2px solid ${on ? '#b45309' : 'transparent'}`,
                  background: 'none',
                  cursor: 'pointer',
                  padding: '8px 12px 10px',
                  fontSize: 13,
                  fontWeight: on ? 600 : 400,
                  color: on ? '#1c1b18' : '#6f6860',
                }}
              >
                {s} <span style={{ opacity: 0.55, fontVariantNumeric: 'tabular-nums' }}>{counts[s]}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div style={{ padding: '22px 28px 40px' }}>
        {view === 'table' && <TableView jobs={jobs} onOpenJob={onOpenJob} />}
        {view === 'cards' && <CardsView jobs={jobs} onOpenJob={onOpenJob} />}
        {view === 'board' && <BoardView jobs={jobs} counts={counts} onOpenJob={onOpenJob} />}
      </div>
    </div>
  );
}

function TableView({ jobs, onOpenJob }) {
  return (
    <>
      <div style={{ background: '#fff', border: '1px solid #ded8cc', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 1040, fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f6f4ef', textAlign: 'left' }}>
              <th style={TH}>เลขที่ / วันที่แจ้ง</th>
              <th style={TH}>เบอร์รถ</th>
              <th style={TH}>อาการแจ้งซ่อม</th>
              <th style={TH}>อะไหล่</th>
              <th style={TH}>ช่างที่ทำ</th>
              <th style={TH}>PR</th>
              <th style={{ ...TH, textAlign: 'right' }}>รวมเงิน</th>
              <th style={TH}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(({ job, index }) => (
              <tr
                key={job.code}
                className="hov-row"
                onClick={() => onOpenJob(index)}
                style={{ cursor: 'pointer', borderBottom: '1px solid #efece4' }}
              >
                <td style={TD}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', fontWeight: 500 }}>{job.code}</div>
                  <div style={{ fontSize: '11.5px', color: '#8a837a', marginTop: 2 }}>{job.reportedAt}</div>
                </td>
                <td style={TD}>
                  <div
                    style={{
                      display: 'inline-block',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '12.5px',
                      fontWeight: 600,
                      background: '#eceadf',
                      padding: '3px 7px',
                      borderRadius: 5,
                    }}
                  >
                    {job.vehicle}
                  </div>
                  <div style={{ fontSize: 11, color: '#8a837a', marginTop: 4 }}>{job.mileageText} กม.</div>
                </td>
                <td style={{ ...TD, maxWidth: 280 }}>
                  <div style={{ lineHeight: 1.5, textWrap: 'pretty' }}>{job.symptom}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    {job.photoDots.map((d) => (
                      <span key={d} style={{ width: 22, height: 16, borderRadius: 3, background: '#dcd6c9', display: 'inline-block' }} />
                    ))}
                    <span style={{ fontSize: '10.5px', color: '#968f85', marginLeft: 2 }}>{job.photoLabel}</span>
                  </div>
                </td>
                <td style={{ ...TD, fontSize: '12.5px', color: '#4b453e' }}>{job.partsSummary}</td>
                <td style={{ ...TD, fontSize: '12.5px' }}>{job.tech}</td>
                <td style={{ ...TD, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#0f5f5c' }}>{job.prText}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{job.totalText}</td>
                <td style={TD}>
                  <span style={chipStyle(job.status)}>{job.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, fontSize: '11.5px', color: '#8a837a' }}>
        แบบ A · ตารางเดียวจบ ใกล้เคียง Excel เดิม เหมาะกับการคีย์ต่อเนื่องและตรวจยอดเงิน
      </div>
    </>
  );
}

function CardsView({ jobs, onOpenJob }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 14 }}>
        {jobs.map(({ job, index }) => (
          <div
            key={job.code}
            className="hov-card"
            onClick={() => onOpenJob(index)}
            style={{
              background: '#fff',
              border: '1px solid #ded8cc',
              borderRadius: 12,
              cursor: 'pointer',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', gap: 10, padding: '13px 14px 12px', borderBottom: '1px solid #efece4', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 62,
                  height: 48,
                  borderRadius: 7,
                  background: '#e7e2d7',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#a79f92',
                  flex: '0 0 auto',
                }}
              >
                <Icon name="image" size={20} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '12.5px',
                      fontWeight: 600,
                      background: '#eceadf',
                      padding: '2px 6px',
                      borderRadius: 5,
                    }}
                  >
                    {job.vehicle}
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#8a837a', fontFamily: "'IBM Plex Mono', monospace" }}>{job.code}</span>
                </div>
                <div style={{ fontSize: '13.5px', lineHeight: 1.45, marginTop: 5, textWrap: 'pretty' }}>{job.symptom}</div>
              </div>
              <span style={chipStyle(job.status)}>{job.status}</span>
            </div>
            <div style={{ padding: '11px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 12px', fontSize: 12 }}>
              <div>
                <div style={{ color: '#8a837a', fontSize: 11 }}>ช่างที่ทำ</div>
                {job.tech}
              </div>
              <div>
                <div style={{ color: '#8a837a', fontSize: 11 }}>อะไหล่</div>
                {job.partsCountText}
              </div>
              <div>
                <div style={{ color: '#8a837a', fontSize: 11 }}>เลข PR</div>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#0f5f5c' }}>{job.prText}</span>
              </div>
              <div>
                <div style={{ color: '#8a837a', fontSize: 11 }}>รวมเงิน</div>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{job.totalText}</span>
              </div>
            </div>
            <div
              style={{
                padding: '9px 14px',
                background: '#faf8f4',
                borderTop: '1px solid #efece4',
                fontSize: '11.5px',
                color: '#6f6860',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>แจ้ง {job.reportedAt}</span>
              <span>{job.ageText}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: '11.5px', color: '#8a837a' }}>
        แบบ B · การ์ดต่อใบงาน เห็นรูปและข้อมูลสำคัญพร้อมกัน เหมาะกับการไล่ดูงานเร็ว ๆ
      </div>
    </>
  );
}

function BoardView({ jobs, counts, onOpenJob }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, alignItems: 'start' }}>
        {ORDER.map((status) => {
          const colJobs = jobs.filter(({ job }) => job.status === status);
          return (
            <div key={status} style={{ background: '#f6f4ef', border: '1px solid #ded8cc', borderRadius: 12, padding: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 3px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS[status].dot }} />
                  {status}
                </div>
                <span style={{ fontSize: '11.5px', color: '#8a837a', fontVariantNumeric: 'tabular-nums' }}>{counts[status]}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colJobs.map(({ job, index }) => (
                  <div
                    key={job.code}
                    className="hov-card"
                    onClick={() => onOpenJob(index)}
                    style={{ background: '#fff', border: '1px solid #e3ded2', borderRadius: 9, padding: '11px 12px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600 }}>{job.vehicle}</span>
                      <span style={{ fontSize: 11, color: '#8a837a' }}>{job.ageText}</span>
                    </div>
                    <div style={{ fontSize: '12.5px', lineHeight: 1.45, marginTop: 6, textWrap: 'pretty' }}>{job.symptom}</div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 9,
                        paddingTop: 8,
                        borderTop: '1px dashed #e8e3d8',
                        fontSize: '11.5px',
                        color: '#6f6860',
                      }}
                    >
                      <span>{job.partsCountText}</span>
                      <span style={{ fontWeight: 600, color: '#1c1b18', fontVariantNumeric: 'tabular-nums' }}>{job.totalText}</span>
                    </div>
                  </div>
                ))}
                {colJobs.length === 0 && (
                  <div style={{ fontSize: '11.5px', color: '#a29a90', textAlign: 'center', padding: '14px 0' }}>ไม่มีงานในคิวนี้</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: '11.5px', color: '#8a837a' }}>
        แบบ C · คิวตามสถานะ เห็นว่างานติดอยู่ขั้นไหน เหมาะกับการตามงานรายวัน
      </div>
    </>
  );
}
