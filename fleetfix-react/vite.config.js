import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages เสิร์ฟที่ https://<user>.github.io/<repo>/ จึงต้องตั้ง base ให้ตรง
// ตอนพัฒนาในเครื่องปล่อยว่างไว้ (= '/')
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: { port: 5173, open: true },
});
