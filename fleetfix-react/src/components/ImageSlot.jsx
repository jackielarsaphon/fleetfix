import { useRef, useState } from 'react';
import Icon from './Icon.jsx';

const OVERLAY_BTN = {
  width: 20,
  height: 20,
  borderRadius: '50%',
  border: 0,
  background: 'rgba(28,27,24,0.6)',
  color: '#fff',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  padding: 0,
};

/**
 * ช่องใส่รูป — คลิกเพื่อเลือกไฟล์ หรือลากรูปมาวาง
 *
 * ใช้ได้ 3 แบบ
 *   1. src + onDelete  → แสดงรูปที่อัปโหลดไว้แล้ว (ลบได้)
 *   2. onUpload        → อัปโหลดทันทีที่เลือกไฟล์ (หน้ารายละเอียดใบงาน)
 *   3. onPick          → เก็บไฟล์ไว้ในฟอร์มก่อน ค่อยอัปโหลดหลังบันทึก (ฟอร์มแจ้งซ่อมใหม่)
 *   ถ้าไม่ส่งอะไรเลย จะเป็นตัวอย่างรูปในเครื่องเท่านั้น (ยังไม่บันทึกขึ้นเซิร์ฟเวอร์)
 *
 * เมื่อมีรูปแล้ว: คลิกที่รูป = ขยายเต็มจอ (ถ้าส่ง onExpand มา) และเปลี่ยนรูปได้จากปุ่มมุมขวา
 */
export default function ImageSlot({
  placeholder = 'ลากรูปมาวาง',
  radius = 8,
  src,
  onUpload,
  onPick,
  onDelete,
  onExpand,
}) {
  const [localSrc, setLocalSrc] = useState(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const shown = src || localSrc;

  async function accept(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('ไฟล์ต้องเป็นรูปภาพ');
      return;
    }
    setError('');

    // แสดงตัวอย่างในเครื่องทันที ไม่ต้องรอเซิร์ฟเวอร์
    if (!src) {
      const reader = new FileReader();
      reader.onload = (e) => setLocalSrc(e.target.result);
      reader.readAsDataURL(file);
    }

    if (onPick) onPick(file);

    if (onUpload) {
      setBusy(true);
      try {
        await onUpload(file);
        setLocalSrc(null); // พาเรนต์จะส่ง src ของรูปจริงกลับมาแทน
      } catch (err) {
        setError(err.message || 'อัปโหลดไม่สำเร็จ');
        setLocalSrc(null);
      } finally {
        setBusy(false);
      }
    }
  }

  async function remove(e) {
    e.stopPropagation();
    if (onDelete) {
      setBusy(true);
      try {
        await onDelete();
      } catch (err) {
        setError(err.message || 'ลบไม่สำเร็จ');
      } finally {
        setBusy(false);
      }
      return;
    }
    setLocalSrc(null);
    if (onPick) onPick(null);
  }

  const canExpand = Boolean(shown && onExpand);

  function openPicker() {
    if (!busy) inputRef.current?.click();
  }

  return (
    <div
      onClick={() => {
        if (busy) return;
        if (canExpand) onExpand(shown);
        else openPicker();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        accept(e.dataTransfer.files?.[0]);
      }}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: radius,
        border: `1px dashed ${error ? '#b3261e' : over ? '#b45309' : '#cbc4b6'}`,
        background: shown ? '#000' : over ? '#fdf7ec' : '#faf8f4',
        color: error ? '#b3261e' : '#8a837a',
        fontSize: '11.5px',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        cursor: busy ? 'wait' : 'pointer',
        textAlign: 'center',
        padding: 6,
        position: 'relative',
      }}
      title={error || (canExpand ? 'คลิกเพื่อดูรูปเต็มจอ' : shown ? 'คลิกเพื่อเปลี่ยนรูป' : placeholder)}
    >
      {shown ? (
        <>
          <img src={shown} alt={placeholder} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {canExpand && !busy && (
            <span
              style={{
                position: 'absolute',
                bottom: 4,
                left: 4,
                width: 20,
                height: 20,
                borderRadius: 5,
                background: 'rgba(28,27,24,0.6)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <Icon name="expand" size={11} strokeWidth={2.2} />
            </span>
          )}
        </>
      ) : (
        <span style={{ lineHeight: 1.4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <Icon name="image" size={18} style={{ opacity: 0.55 }} />
          {error || placeholder}
        </span>
      )}

      {busy && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(28,27,24,0.55)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11,
          }}
        >
          กำลังอัปโหลด...
        </span>
      )}

      {shown && !busy && (
        <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
          {canExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openPicker();
              }}
              title="เปลี่ยนรูปนี้"
              style={OVERLAY_BTN}
            >
              <Icon name="pencil" size={11} strokeWidth={2.2} />
            </button>
          )}
          <button onClick={remove} title={onDelete ? 'ลบรูปนี้ออกจากใบงาน' : 'ล้างรูป'} style={OVERLAY_BTN}>
            <Icon name="close" size={11} strokeWidth={2.4} />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => accept(e.target.files?.[0])}
      />
    </div>
  );
}
