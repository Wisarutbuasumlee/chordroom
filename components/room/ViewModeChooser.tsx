"use client";

import { useState, useSyncExternalStore } from "react";
import { openChord } from "@/lib/chordWindow";
import { ColumnsIcon, PipIcon } from "../Icons";
import { pipSupported } from "./FloatWindow";
import { useRoomCtx } from "./RoomContext";

const noop = () => () => {};

/** คอม: เลือกวิธีดูคอร์ดคู่กับห้อง (จำค่าที่เลือกไว้) */
export default function ViewModeChooser({ onOpenFloat }: { onOpenFloat(): void }) {
  const { viewMode, setViewMode, current, toast } = useRoomCtx();
  const canPip = useSyncExternalStore(noop, pipSupported, () => false);
  const [sideHint, setSideHint] = useState(false);

  const openSide = () => {
    setViewMode("side");
    if (!current) {
      toast("เลือกเพลงก่อน แล้วค่อยจัดหน้าต่าง");
      return;
    }
    const r = openChord(current.url, { side: true });
    if (r.blocked) toast("เบราว์เซอร์บล็อกหน้าต่างใหม่ อนุญาตป๊อปอัปให้เว็บนี้ก่อน");
    setSideHint(true);
  };

  const card = (selected: boolean) =>
    `flex flex-[1_1_260px] gap-4 rounded-[20px] border-2 p-4 ${
      selected ? "border-edge bg-soft shadow-hard-sm" : "border-line bg-surface"
    }`;

  return (
    <section aria-labelledby="viewmode-title" className="flex flex-col gap-4">
      <h2 id="viewmode-title" className="m-0 font-display text-xl font-bold">
        ดูคอร์ดพร้อมกับห้อง ไม่ต้องสลับไปมา
      </h2>
      <div className="flex flex-wrap gap-4">
        {canPip && (
          <div className={card(viewMode === "float")}>
            <div aria-hidden="true" className="relative h-[72px] w-[88px] shrink-0 rounded-xl border-2 border-edge bg-bg">
              <span className="absolute right-1.5 bottom-1.5 h-7 w-9 rounded-md border-2 border-edge bg-primary" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2 font-bold">
                หน้าต่างลอย
                <span className="rounded-full border-2 border-edge bg-hl px-2 text-[11px] font-bold text-on-hl">แนะนำ</span>
              </div>
              <div className="text-[13px] text-muted">ห้องลอยอยู่บนหน้าคอร์ดตลอด · Chrome, Edge</div>
              <button
                type="button"
                onClick={() => {
                  setViewMode("float");
                  onOpenFloat();
                }}
                className="mt-1 flex h-11 items-center justify-center gap-2 self-start rounded-full border-2 border-edge bg-primary px-4 text-sm font-bold text-on-primary"
              >
                <PipIcon size={18} /> เปิดหน้าต่างลอย
              </button>
            </div>
          </div>
        )}
        <div className={card(viewMode === "side" || !canPip)}>
          <div aria-hidden="true" className="flex h-[72px] w-[88px] shrink-0 gap-1 rounded-xl border-2 border-edge bg-bg p-1.5">
            <span className="w-1/3 rounded-md border-2 border-edge bg-primary" />
            <span className="flex-1 rounded-md border-2 border-edge bg-surface" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="font-bold">วางสองหน้าต่างคู่กัน</div>
            <div className="text-[13px] text-muted">ห้องแคบด้านซ้าย คอร์ดเต็มด้านขวา · ทุกเบราว์เซอร์</div>
            <button
              type="button"
              onClick={openSide}
              className="mt-1 flex h-11 items-center justify-center gap-2 self-start rounded-full border-2 border-edge bg-surface px-4 text-sm font-bold text-ink"
            >
              <ColumnsIcon size={18} /> จัดหน้าต่างให้
            </button>
          </div>
        </div>
      </div>
      {sideHint && (
        <p className="m-0 rounded-2xl border-2 border-edge bg-hl p-3 text-sm text-on-hl" role="status">
          ถ้าหน้าต่างคอร์ดไม่ไปอยู่ด้านขวาเอง ให้ลากหน้าต่างนี้ไปไว้ซ้ายของจอ (ประมาณ 1 ใน 3) แล้วลากหน้าต่างคอร์ดไปทางขวา
          หรือใช้ปุ่ม Windows + ← / Windows + → เพื่อจัดครึ่งจอ
        </p>
      )}
      <p className="m-0 text-[13px] text-muted">
        ทั้งสองแบบ: พอมีคนเปลี่ยนเพลง หน้าคอร์ดจะเปลี่ยนตามเอง เว็บจำแบบที่คุณเลือกไว้ครั้งหน้า
      </p>
    </section>
  );
}

/** ไอแพดเต็มจอ: แนะนำ Split View แทนหน้าต่างลอย */
export function SplitViewTip() {
  return (
    <section className="flex flex-col gap-2 rounded-[20px] border-2 border-dashed border-primary bg-soft p-4">
      <h2 className="m-0 font-display text-lg font-bold">ดูคอร์ดคู่กับห้องบนไอแพด</h2>
      <p className="m-0 text-sm leading-relaxed">
        <b>แนวนอน:</b> เปิด Split View ให้เว็บนี้อยู่ซ้าย (แคบ) และ Safari หน้าคอร์ดอยู่ขวา หน้าขวาจะเปลี่ยนตามห้องเอง
        <br />
        <b>แนวตั้ง:</b> เปิดเว็บนี้แบบ Slide Over ลอยบนหน้าคอร์ด ปัดออกไปขอบจอเมื่อไม่ใช้
      </p>
    </section>
  );
}
