import { STATUS } from './constants.js';

/** จัดรูปแบบตัวเลขแบบมีคอมมา (ปัดเป็นจำนวนเต็ม) */
export function fmt(n) {
  return Math.round(n).toLocaleString('en-US');
}

/** สไตล์ของชิปสถานะงาน */
export function chipStyle(status) {
  const s = STATUS[status] || STATUS['แจ้งใหม่'];
  return {
    display: 'inline-block',
    whiteSpace: 'nowrap',
    fontSize: '11.5px',
    fontWeight: 600,
    padding: '4px 9px',
    borderRadius: 999,
    color: s.fg,
    background: s.bg,
  };
}

/** ยอดรวมของใบงาน: ก่อนหักส่วนลด, ส่วนลด และรวมทั้งสิ้น (ไม่คิด VAT) */
export function totals(job) {
  let sub = 0;
  let disc = 0;
  job.parts.forEach((p) => {
    const gross = p.qty * p.unitPrice;
    sub += gross;
    disc += (gross * (p.disc || 0)) / 100;
  });
  const net = sub - disc;
  return { sub, disc, net, grand: net };
}

/** รายการเลข PR ที่ไม่ซ้ำของใบงาน */
export function prList(job) {
  const out = [];
  job.parts.forEach((p) => {
    const v = (p.pr || '').trim();
    if (v && out.indexOf(v) === -1) out.push(v);
  });
  if (!out.length && job.pr) out.push(job.pr);
  return out;
}

/** เติมข้อมูลที่ใช้แสดงผลให้ใบงาน */
export function decorate(job) {
  const t = totals(job);
  const prs = prList(job);
  return {
    ...job,
    prText: prs.length ? (prs.length > 1 ? `${prs[0]} +${prs.length - 1}` : prs[0]) : '—',
    prCountText: prs.length > 1 ? `${prs.length} ใบสั่งซื้อ` : prs.length ? '1 ใบสั่งซื้อ' : 'ยังไม่ออก PR',
    totalText: fmt(t.grand),
    partsSummary: job.parts.map((p) => p.name).join(', '),
    partsCountText: `อะไหล่ ${job.parts.length} รายการ`,
    photoLabel: `${job.photos} รูป`,
    photoDots: Array.from({ length: Math.min(job.photos, 3) }, (_, k) => k),
    mileageText: fmt(job.mileage),
    ageText: job.status === 'เสร็จแล้ว' ? 'ปิดงานแล้ว' : `ค้าง ${job.age} วัน`,
  };
}

/** กรองใบงานตามสถานะและคำค้น */
export function filterJobs(jobs, filter, query) {
  const q = query.trim().toLowerCase();
  return jobs
    .map((j, i) => ({ job: j, index: i }))
    .filter(({ job }) => {
      if (filter !== 'ทั้งหมด' && job.status !== filter) return false;
      if (!q) return true;
      const haystack = [
        job.vehicle,
        job.symptom,
        job.pr,
        prList(job).join(' '),
        job.code,
        job.tech,
        job.parts.map((p) => `${p.partNo} ${p.name}`).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
}
