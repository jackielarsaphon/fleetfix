// ข้อมูลตัวอย่างของระบบ (ย้ายมาจากไฟล์ standalone เดิม)

export const JOBS = [
  {
    code: 'JR26-0148', vehicle: 'TS-028', mileage: 182450,
    symptom: 'กากะบาดขาด + เข้าเกียร์ยาก', rootCause: 'ชุดปั้กคัดตัวลุ่มสึก',
    status: 'รออะไหล่', tech: 'ช่างค่าหล้า + ช่างสะหมูนไท', pr: 'PR2605006',
    reportedAt: '06/05/2026', breakDate: '06/05/2026', doneDate: '—',
    reporter: 'พนักงานขับรถ สมชาย พ.', place: 'ศูนย์ซ่อมภายใน',
    note: 'รออะไหล่จอดซ่อม แจ้งซ่อมเปลี่ยนอาไหล่ ยืมรถ TS-031 ใช้ชั่วคราว',
    photos: 3, age: 5,
    parts: [
      { name: 'ชุดปั้กคัดตัวลุ่ม', partNo: '4301-1602512', qty: 1, unit: 'ชุด', unitPrice: 8450, disc: 5, pr: 'PR2605006' },
      { name: 'ชุดปั้กคาดตัวเทิ่ง', partNo: '66-11-1602300', qty: 1, unit: 'ชุด', unitPrice: 6200, disc: 5, pr: 'PR2605006' },
      { name: 'ค่าแรงถอด-ประกอบเกียร์', partNo: '—', qty: 6, unit: 'ชั่วโมง', unitPrice: 350, disc: 0, pr: 'PR2605009' },
    ],
  },
  {
    code: 'JR26-0151', vehicle: 'TS-031', mileage: 96120,
    symptom: 'ผ้าเบรกหมด มีเสียงดังตอนเบรก', rootCause: 'ผ้าเบรกหน้าสึกถึงหมุด',
    status: 'กำลังซ่อม', tech: 'ช่างบุญมี', pr: 'PR2605011',
    reportedAt: '18/06/2026', breakDate: '17/06/2026', doneDate: '—',
    reporter: 'หัวหน้าช่าง วิรัตน์', place: 'ศูนย์ซ่อมภายใน',
    note: 'อะไหล่มาถึงแล้ว กำลังถอดล้อหน้า',
    photos: 2, age: 2,
    parts: [
      { name: 'ผ้าเบรกหน้า', partNo: 'BP-2214', qty: 2, unit: 'ชุด', unitPrice: 1850, disc: 10 },
      { name: 'จานเบรกหน้า', partNo: 'DR-8890', qty: 2, unit: 'ชิ้น', unitPrice: 2400, disc: 0 },
    ],
  },
  {
    code: 'JR26-0153', vehicle: 'TS-014', mileage: 214880,
    symptom: 'แอร์ไม่เย็น มีน้ำหยดในห้องโดยสาร', rootCause: 'ตู้แอร์รั่ว (รอตรวจ)',
    status: 'แจ้งใหม่', tech: '—', pr: '',
    reportedAt: '28/07/2026', breakDate: '28/07/2026', doneDate: '—',
    reporter: 'พนักงานขับรถ ประเสริฐ ก.', place: 'รอประเมิน',
    note: 'ยังไม่ได้ประเมินราคา รอช่างตรวจวันจันทร์',
    photos: 2, age: 3,
    parts: [
      { name: 'น้ำยาแอร์ R134a', partNo: 'AC-134', qty: 2, unit: 'กระป๋อง', unitPrice: 450, disc: 0 },
    ],
  },
  {
    code: 'JR26-0139', vehicle: 'TS-022', mileage: 143210,
    symptom: 'ยางหน้าซ้ายรั่วซึม', rootCause: 'ตะปูตำดอกยาง',
    status: 'เสร็จแล้ว', tech: 'ช่างสมพงษ์', pr: 'PR2604082',
    reportedAt: '22/04/2026', breakDate: '22/04/2026', doneDate: '23/04/2026',
    reporter: 'พนักงานขับรถ อนันต์ ส.', place: 'อู่ภายนอก',
    note: 'ปะยางและถ่วงล้อใหม่ ใช้งานปกติ',
    photos: 2, age: 1,
    parts: [
      { name: 'ค่าปะยาง + ถ่วงล้อ', partNo: '—', qty: 1, unit: 'งาน', unitPrice: 600, disc: 0 },
    ],
  },
  {
    code: 'JR26-0142', vehicle: 'TS-028', mileage: 178900,
    symptom: 'ไฟหน้าขวาไม่ติด', rootCause: 'หลอดไฟขาด',
    status: 'เสร็จแล้ว', tech: 'ช่างค่าหล้า', pr: 'PR2604091',
    reportedAt: '02/05/2026', breakDate: '02/05/2026', doneDate: '02/05/2026',
    reporter: 'ธุรการ กนกวรรณ', place: 'ศูนย์ซ่อมภายใน',
    note: 'เปลี่ยนหลอดใหม่ ใช้งานได้ปกติ',
    photos: 1, age: 1,
    parts: [
      { name: 'หลอดไฟหน้า H4', partNo: 'H4-24V', qty: 2, unit: 'หลอด', unitPrice: 320, disc: 0 },
    ],
  },
  {
    code: 'JR26-0146', vehicle: 'TS-009', mileage: 265400,
    symptom: 'น้ำมันเครื่องรั่วที่ฝาครอบวาล์ว', rootCause: 'ปะเก็นฝาวาล์วเสื่อม',
    status: 'รออะไหล่', tech: 'ช่างสะหมูนไท', pr: 'PR2605003',
    reportedAt: '03/07/2026', breakDate: '02/07/2026', doneDate: '—',
    reporter: 'หัวหน้าช่าง วิรัตน์', place: 'ศูนย์ซ่อมภายใน',
    note: 'ปะเก็นของนอก รอสั่ง 7 วัน ระหว่างนี้เติมน้ำมันเครื่องทุกวัน',
    photos: 3, age: 28,
    parts: [
      { name: 'ปะเก็นฝาครอบวาล์ว', partNo: 'GK-4477', qty: 1, unit: 'ชิ้น', unitPrice: 1750, disc: 0 },
      { name: 'น้ำมันเครื่อง 15W-40', partNo: 'OIL-1540', qty: 12, unit: 'ลิตร', unitPrice: 190, disc: 8 },
    ],
  },
  {
    code: 'JR26-0152', vehicle: 'TS-031', mileage: 96450,
    symptom: 'คลัตช์ลื่น ออกตัวไม่มีกำลัง', rootCause: 'จานคลัตช์สึก',
    status: 'กำลังซ่อม', tech: 'ช่างบุญมี + ช่างเอก', pr: 'PR2605014',
    reportedAt: '25/07/2026', breakDate: '24/07/2026', doneDate: '—',
    reporter: 'พนักงานขับรถ สมชาย พ.', place: 'ศูนย์ซ่อมภายใน',
    note: 'ถอดเกียร์ลงแล้ว คาดว่าเสร็จศุกร์นี้',
    photos: 4, age: 6,
    parts: [
      { name: 'จานคลัตช์', partNo: 'CL-3300', qty: 1, unit: 'ชิ้น', unitPrice: 5400, disc: 5, pr: 'PR2605014' },
      { name: 'หวีคลัตช์', partNo: 'CL-3301', qty: 1, unit: 'ชิ้น', unitPrice: 4800, disc: 5, pr: 'PR2605014' },
      { name: 'ลูกปืนกดคลัตช์', partNo: 'CL-3305', qty: 1, unit: 'ชิ้น', unitPrice: 1250, disc: 0, pr: 'PR2605021' },
    ],
  },
  {
    code: 'JR26-0154', vehicle: 'TS-040', mileage: 41230,
    symptom: 'กระจกมองข้างขวาแตก', rootCause: 'เฉี่ยวเสาในลานจอด',
    status: 'แจ้งใหม่', tech: '—', pr: '',
    reportedAt: '30/07/2026', breakDate: '30/07/2026', doneDate: '—',
    reporter: 'พนักงานขับรถ ธีระ ว.', place: 'รอประเมิน',
    note: 'รอใบเสนอราคาจากร้านอะไหล่',
    photos: 1, age: 1,
    parts: [
      { name: 'กระจกมองข้างขวา', partNo: 'MR-7712', qty: 1, unit: 'ชุด', unitPrice: 2900, disc: 0 },
    ],
  },
];

export const VEHICLES = [
  { code: 'TS-028', model: 'ISUZU FVM 6 ล้อ', mileage: 182450, lastDate: '06/05/2026' },
  { code: 'TS-031', model: 'HINO FG 6 ล้อ', mileage: 96450, lastDate: '25/07/2026' },
  { code: 'TS-014', model: 'ISUZU NPR 4 ล้อ', mileage: 214880, lastDate: '28/07/2026' },
  { code: 'TS-022', model: 'TOYOTA HIACE ตู้', mileage: 143210, lastDate: '23/04/2026' },
  { code: 'TS-009', model: 'MITSUBISHI FUSO 10 ล้อ', mileage: 265400, lastDate: '03/07/2026' },
  { code: 'TS-040', model: 'ISUZU D-MAX กระบะ', mileage: 41230, lastDate: '30/07/2026' },
];

export const PLACES = [
  { name: 'ศูนย์ซ่อมภายใน', kind: 'อู่ในบริษัท', contact: 'หัวหน้าช่าง วิรัตน์', phone: '081-234-5678', address: 'อาคารซ่อมบำรุง ลานจอดรถ B' },
  { name: 'อู่ภายนอก', kind: 'อู่คู่สัญญา', contact: 'ช่างสมพงษ์', phone: '089-777-1234', address: 'ถนนสายเอเชีย กม.14' },
  { name: 'ซ่อมหน้างาน', kind: 'รถโมบายล์', contact: 'ทีมช่างเคลื่อนที่', phone: '02-555-0100', address: 'ออกหน้างานตามจุดเสีย' },
];

// ค่าซ่อมรายเดือน (ใช้ในแดชบอร์ด)
export const MONTHLY = [
  { label: 'ก.พ.', v: 42800 },
  { label: 'มี.ค.', v: 58400 },
  { label: 'เม.ย.', v: 31200 },
  { label: 'พ.ค.', v: 74600 },
  { label: 'มิ.ย.', v: 51900 },
  { label: 'ก.ค.', v: 88300 },
];
