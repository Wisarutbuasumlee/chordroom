"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, PencilIcon } from "../Icons";
import ThemeToggle from "../ThemeToggle";
import { HistoryList, MemberList } from "./People";
import { useRoomCtx } from "./RoomContext";
import Sheet from "./Sheet";

/** ชวนเพื่อน: QR รหัสห้อง ลิงก์ · คนในห้อง · ประวัติ */
export default function InviteSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  if (!open) return null;
  return <Invite onClose={onClose} />;
}

function Invite({ onClose }: { onClose(): void }) {
  const { code, room, openSettings } = useRoomCtx();
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/r/${code}`;

  useEffect(() => {
    let alive = true;
    QRCode.toString(link, { type: "svg", margin: 1, color: { dark: "#0F1A2B", light: "#FFFFFF" } })
      .then((svg) => alive && setQr(svg))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [link]);

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
    <Sheet
      titleId="invite-title"
      title={
        <h2 id="invite-title" className="m-0 truncate font-display text-[22px] font-bold">
          {room.name}
        </h2>
      }
      subtitle="ชวนเพื่อนเข้าห้อง"
      actions={<ThemeToggle />}
      onClose={onClose}
    >
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
      <button
        type="button"
        onClick={() => {
          onClose();
          openSettings();
        }}
        className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-edge bg-surface text-[15px] font-bold text-ink"
      >
        <PencilIcon size={18} />
        แก้ไขห้องและชื่อของฉัน
      </button>
    </Sheet>
  );
}
