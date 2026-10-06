"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon, CopyIcon } from "../Icons";
import ThemeToggle from "../ThemeToggle";
import { HistoryList, MemberList } from "./People";
import { OwnerSection, RoomNameEditor } from "./RoomAdmin";
import { useRoomCtx } from "./RoomContext";

/** ชวนเพื่อน: มือถือเป็น bottom sheet · จอใหญ่เป็นหน้าต่างกลางจอ */
export default function InviteSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  if (!open) return null;
  return <Sheet onClose={onClose} />;
}

function Sheet({ onClose }: { onClose(): void }) {
  const { code, room, info } = useRoomCtx();
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/r/${code}`;
  const sheet = info.layout === "phone";

  useEffect(() => {
    let alive = true;
    QRCode.toString(link, { type: "svg", margin: 1, color: { dark: "#0F1A2B", light: "#FFFFFF" } })
      .then((svg) => alive && setQr(svg))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [link]);

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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shareText = `มาเปิดคอร์ดด้วยกันที่ห้อง “${room.name}” · รหัส ${code}\n${link}`;
  const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(shareText)}`;

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
        aria-labelledby="invite-title"
        className={`relative flex max-h-full w-full flex-col gap-[18px] overflow-y-auto border-edge bg-surface ${
          sheet
            ? "sheet-in rounded-t-[28px] border-t-2 px-5 pt-3 pb-8"
            : "pop-in max-w-[460px] rounded-[28px] border-2 p-6 shadow-hard-xl"
        }`}
      >
        {sheet && <div className="h-[5px] w-11 self-center rounded-full bg-edge" aria-hidden="true" />}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <RoomNameEditor id="invite-title" />
            <div className="text-[13px] text-muted">ชวนเพื่อนเข้าห้อง</div>
          </div>
          <ThemeToggle />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex size-11 items-center justify-center rounded-full border-2 border-edge text-ink"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div
          className="flex size-[200px] items-center justify-center self-center overflow-hidden rounded-[22px] border-2 border-edge bg-white p-3 shadow-hard [&>svg]:size-full"
          role="img"
          aria-label={`QR ของลิงก์ห้อง ${link}`}
          dangerouslySetInnerHTML={{ __html: qr }}
        />

        <div className="text-center">
          <div className="text-[13px] text-muted">หรือบอกรหัสห้อง</div>
          <div className="font-mono text-[32px] font-bold tracking-[0.08em]">
            <span className="rounded-[10px] bg-hl px-2.5 text-on-hl">{code}</span>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={copy}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full border-2 border-edge bg-surface text-[15px] font-bold text-ink"
          >
            {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
            {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
          </button>
          <a
            href={lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 flex-1 items-center justify-center rounded-full border-2 border-edge bg-primary text-[15px] font-bold text-on-primary no-underline"
          >
            แชร์ไป LINE
          </a>
        </div>

        <div className="pt-1">
          <MemberList title />
        </div>
        <HistoryList limit={6} onPicked={onClose} />
        <OwnerSection />
      </section>
    </div>
  );
}
