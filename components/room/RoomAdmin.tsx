"use client";

import { useState, type FormEvent } from "react";
import { CheckIcon, CloseIcon, CopyIcon, PencilIcon, TrashIcon } from "../Icons";
import { SectionLabel } from "../ui";
import { useRoomCtx } from "./RoomContext";

const smallBtn = "flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-edge text-ink";

/** ชื่อห้อง · เจ้าของกดดินสอเพื่อเปลี่ยนชื่อได้ */
export function RoomNameEditor({ id }: { id: string }) {
  const { room, isOwner, admin } = useRoomCtx();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(room.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const next = name.trim();
    if (!next || next === room.name) {
      setEditing(false);
      return;
    }
    setBusy(true);
    const err = await admin.rename(next);
    setBusy(false);
    if (err) setError(err);
    else setEditing(false);
  };

  if (!editing)
    return (
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <h2 id={id} className="m-0 min-w-0 truncate font-display text-[22px] font-bold">
          {room.name}
        </h2>
        {isOwner && (
          <button
            type="button"
            onClick={() => {
              setName(room.name);
              setError(null);
              setEditing(true);
            }}
            aria-label="เปลี่ยนชื่อห้อง"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted"
          >
            <PencilIcon size={18} />
          </button>
        )}
      </div>
    );

  return (
    <form onSubmit={save} className="flex min-w-0 flex-1 flex-col gap-1.5">
      <h2 id={id} className="sr-only">
        เปลี่ยนชื่อห้อง {room.name}
      </h2>
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
          aria-label="ชื่อห้องใหม่"
          className="h-11 min-w-0 flex-1 rounded-[14px] border-2 border-edge bg-bg px-3 text-[17px] font-bold text-ink"
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="บันทึกชื่อห้อง"
          className={`${smallBtn} bg-primary text-on-primary disabled:opacity-60`}
        >
          <CheckIcon size={18} />
        </button>
        <button type="button" onClick={() => setEditing(false)} aria-label="ยกเลิก" className={smallBtn}>
          <CloseIcon size={18} />
        </button>
      </div>
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-ink">
          {error}
        </p>
      )}
    </form>
  );
}

/** ท้ายหน้าชวนเพื่อน: เจ้าของเห็นลิงก์เจ้าของร่วมและปุ่มลบห้อง · ห้องเก่าที่ยังไม่มีเจ้าของมีปุ่มตั้งตัวเองเป็นเจ้าของ */
export function OwnerSection() {
  const { room, isOwner, admin } = useRoomCtx();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) {
    if (room.hasOwner) return null;
    return (
      <div className="flex flex-col gap-2 rounded-2xl border-2 border-line p-3.5">
        <SectionLabel>ห้องนี้ยังไม่มีเจ้าของ</SectionLabel>
        <p className="m-0 text-sm text-muted">
          เจ้าของห้องเปลี่ยนชื่อห้อง เชิญคนออก และลบห้องได้ · คนแรกที่กดได้เป็นเจ้าของ
        </p>
        <button
          type="button"
          onClick={() => void admin.claim()}
          className="h-12 rounded-full border-2 border-edge bg-surface text-[15px] font-bold text-ink"
        >
          ตั้งตัวเองเป็นเจ้าของห้อง
        </button>
      </div>
    );
  }

  const copyOwnerLink = async () => {
    const link = admin.ownerLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const remove = async () => {
    setBusy(true);
    setError(await admin.remove());
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border-2 border-line p-3.5">
      <SectionLabel>จัดการห้อง (คุณเป็นเจ้าของ)</SectionLabel>
      <button
        type="button"
        onClick={copyOwnerLink}
        className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-edge bg-surface text-[15px] font-bold text-ink"
      >
        {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
        {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์เจ้าของร่วม"}
      </button>
      <p className="m-0 text-xs text-muted">
        ส่งให้คนที่ช่วยดูแลห้องเท่านั้น · ใครเปิดลิงก์นี้จะเปลี่ยนชื่อ เชิญคนออก และลบห้องได้เหมือนคุณ
      </p>
      {confirming ? (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-sm font-semibold text-ink">
            ลบห้อง “{room.name}” และประวัติเพลงทั้งหมด? ทุกคนในห้องจะออกจากห้องทันที
          </p>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-12 flex-1 rounded-full border-2 border-edge bg-surface text-[15px] font-bold text-ink"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="h-12 flex-1 rounded-full border-2 border-edge bg-ink text-[15px] font-bold text-bg disabled:opacity-60"
            >
              {busy ? "กำลังลบ…" : "ลบห้องเลย"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-edge bg-surface text-[15px] font-bold text-ink"
        >
          <TrashIcon size={18} />
          ลบห้อง
        </button>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
