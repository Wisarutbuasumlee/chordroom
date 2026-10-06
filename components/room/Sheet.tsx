"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "../Icons";
import { useRoomCtx } from "./RoomContext";

/** หน้าต่างของห้อง: มือถือเป็น bottom sheet · จอใหญ่เป็นหน้าต่างกลางจอ · Esc / แตะพื้นหลัง = ปิด */
export default function Sheet({
  titleId,
  title,
  subtitle,
  actions,
  onClose,
  children,
}: {
  titleId: string;
  /** หัวเรื่อง (ต้องมี element ที่ id = titleId อยู่ข้างใน) */
  title: ReactNode;
  subtitle?: ReactNode;
  /** ปุ่มเพิ่มเติมก่อนปุ่มปิด */
  actions?: ReactNode;
  onClose(): void;
  children: ReactNode;
}) {
  const { info } = useRoomCtx();
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheet = info.layout === "phone";

  useEffect(() => {
    const prev = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-50 flex ${sheet ? "items-end" : "items-center justify-center p-4"}`}>
      <button
        type="button"
        aria-label="ปิด"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-dim/85"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex max-h-full w-full flex-col gap-[18px] overflow-y-auto border-edge bg-surface ${
          sheet
            ? "sheet-in rounded-t-[28px] border-t-2 px-5 pt-3 pb-8"
            : "pop-in max-w-[460px] rounded-[28px] border-2 p-6 shadow-hard-xl"
        }`}
      >
        {sheet && <div className="h-[5px] w-11 self-center rounded-full bg-edge" aria-hidden="true" />}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {title}
            {subtitle && <div className="text-[13px] text-muted">{subtitle}</div>}
          </div>
          {actions}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-edge text-ink"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
