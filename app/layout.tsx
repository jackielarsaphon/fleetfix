import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fleet Fix | ระบบแจ้งซ่อมรถบริการ",
  description: "ติดตามงานซ่อม อะไหล่ ช่าง และสถานะรถบริการจากข้อมูลจริงใน Excel",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
