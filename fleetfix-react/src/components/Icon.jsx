/**
 * ชุดไอคอนของระบบ — เส้นสไตล์เดียวกันทั้งหมด
 * viewBox 24×24, เส้นโค้งมน, ใช้สีตามข้อความ (currentColor)
 *
 * <Icon name="truck" size={18} />
 */

const SHAPES = {
  // โลโก้ระบบ — ประแจ
  wrench: (
    <>
      <path d="M14.5 3.5a4.5 4.5 0 0 0 5.9 5.9l-9 9a3 3 0 1 1-4.2-4.2z" />
      <circle cx="6.7" cy="17.3" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),

  // แดชบอร์ด — แผงข้อมูล
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="9.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.6" />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.6" />
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="1.6" />
    </>
  ),

  // งานซ่อม — ใบงาน
  jobs: (
    <>
      <path d="M8 4.5H6.5A1.5 1.5 0 0 0 5 6v13.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H16" />
      <rect x="8" y="2.5" width="8" height="4" rx="1.3" />
      <path d="M8.75 11.5h6.5M8.75 15.5h4.25" />
    </>
  ),

  // ทะเบียนรถ — รถบรรทุก
  truck: (
    <>
      <path d="M2 6.5A1.5 1.5 0 0 1 3.5 5h8.6a1.5 1.5 0 0 1 1.5 1.5V16H2z" />
      <path d="M13.6 9h3.3a1.5 1.5 0 0 1 1.25.67l2.1 3.16a1.5 1.5 0 0 1 .25.83V16h-6.9" />
      <circle cx="6.6" cy="17.6" r="2.1" />
      <circle cx="17.4" cy="17.6" r="2.1" />
      <path d="M8.7 17.6h6.6" />
    </>
  ),

  // เพิ่มทะเบียนรถ — รถบรรทุก + เครื่องหมายบวก
  truckPlus: (
    <>
      <path d="M2 8.5A1.5 1.5 0 0 1 3.5 7h7.1a1.5 1.5 0 0 1 1.5 1.5V16H2z" />
      <path d="M12.1 10.5h2.8a1.5 1.5 0 0 1 1.25.67l1.6 2.4a1.5 1.5 0 0 1 .25.83V16h-5.9" />
      <circle cx="6" cy="17.6" r="2" />
      <circle cx="15.4" cy="17.6" r="2" />
      <path d="M8 17.6h5.4" />
      <path d="M18 5h4.5M20.25 2.75v4.5" />
    </>
  ),

  // สถานที่ซ่อม — โรงซ่อม
  garage: (
    <>
      <path d="M3 10.2 12 4l9 6.2V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M7.5 21v-6.5h9V21" />
      <path d="M7.5 17.9h9" />
    </>
  ),

  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="M15.4 15.4 20.5 20.5" />
    </>
  ),

  plus: <path d="M12 5.5v13M5.5 12h13" />,

  close: <path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6" />,

  check: <path d="M4.8 12.6 9.8 17.6 19.2 6.8" />,

  arrowLeft: (
    <>
      <path d="M19.5 12h-15" />
      <path d="M10.5 5.5 4.5 12l6 6.5" />
    </>
  ),

  // ช่องรูปภาพ
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.4" />
      <circle cx="8.6" cy="10" r="1.7" fill="currentColor" stroke="none" />
      <path d="M3.4 16.9l4.3-4.3a2 2 0 0 1 2.8 0l3.1 3.1 1.6-1.6a2 2 0 0 1 2.8 0l2.6 2.6" />
    </>
  ),

  printer: (
    <>
      <path d="M7 8.5V4.2a.7.7 0 0 1 .7-.7h8.6a.7.7 0 0 1 .7.7v4.3" />
      <path d="M6.5 8.5h11A2.5 2.5 0 0 1 20 11v4.5a1 1 0 0 1-1 1h-2M7 16.5H5a1 1 0 0 1-1-1V11a2.5 2.5 0 0 1 2.5-2.5" />
      <rect x="7" y="13.5" width="10" height="7" rx="1.2" />
    </>
  ),

  trash: (
    <>
      <path d="M4.5 6.8h15" />
      <path d="M9.7 6.8V4.6a1 1 0 0 1 1-1h2.6a1 1 0 0 1 1 1v2.2" />
      <path d="M6.6 6.8 7.5 19.4a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l.9-12.6" />
      <path d="M10.5 10.8v6M13.5 10.8v6" />
    </>
  ),

  // ขยายภาพเต็มจอ
  expand: (
    <>
      <path d="M9 3.5H5.5a2 2 0 0 0-2 2V9" />
      <path d="M15 3.5h3.5a2 2 0 0 1 2 2V9" />
      <path d="M20.5 15v3.5a2 2 0 0 1-2 2H15" />
      <path d="M3.5 15v3.5a2 2 0 0 0 2 2H9" />
    </>
  ),

  // เปลี่ยนรูป
  pencil: (
    <>
      <path d="M4 20h4L18.6 9.4a2.05 2.05 0 0 0-2.9-2.9L5 17.1V20z" />
      <path d="M14.8 7.2l2.9 2.9" />
    </>
  ),

  chevronLeft: <path d="M14.5 5.5 8 12l6.5 6.5" />,

  chevronRight: <path d="M9.5 5.5 16 12l-6.5 6.5" />,

  // อะไหล่ / รายการ
  part: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.6M12 18.6v2.6M4.9 7.4l2.25 1.3M16.85 15.3l2.25 1.3M4.9 16.6l2.25-1.3M16.85 8.7l2.25-1.3" />
    </>
  ),
};

export default function Icon({ name, size = 18, strokeWidth = 1.75, style, ...rest }) {
  const shape = SHAPES[name];
  if (!shape) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flex: '0 0 auto', ...style }}
      {...rest}
    >
      {shape}
    </svg>
  );
}
