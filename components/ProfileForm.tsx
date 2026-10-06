"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { initial, loadProfile, MEMBER_COLORS, type Profile } from "@/lib/profile";
import { CheckIcon } from "./Icons";

/** ใส่ชื่อเล่น + เลือกสี (จำไว้ในเครื่อง) · ใช้ทั้งตอนเข้าห้องและสร้างห้อง */
export default function ProfileForm({
  submitLabel,
  busyLabel,
  roomName = false,
  keepBusy = true,
  onSubmit,
}: {
  submitLabel: string;
  busyLabel: string;
  roomName?: boolean;
  /** สำเร็จแล้วยังกดซ้ำไม่ได้ (ใช้ตอนพาไปหน้าอื่นต่อ) · false = กดบันทึกใหม่ได้ */
  keepBusy?: boolean;
  onSubmit(p: Profile, roomName: string): Promise<string | null>;
}) {
  const nameId = useId();
  const roomId = useId();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(MEMBER_COLORS[3].value);
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = loadProfile();
    if (!p) return;
    /* eslint-disable react-hooks/set-state-in-effect -- เติมค่าที่จำไว้ในเครื่องหลัง mount */
    setName(p.name);
    setColor(p.color);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const letter = initial(name);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      setError("ใส่ชื่อก่อนนะ");
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onSubmit({ name: n, color }, room.trim());
    if (err) setError(err);
    if (err || !keepBusy) setBusy(false);
  };

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-[22px]" noValidate>
      {roomName && (
        <div className="flex flex-col gap-2">
          <label htmlFor={roomId} className="text-[15px] font-bold">
            ชื่อห้อง <span className="font-normal text-muted">(ไม่ใส่ก็ได้)</span>
          </label>
          <input
            id={roomId}
            value={room}
            maxLength={40}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="เช่น ซ้อมวันเสาร์"
            className="h-14 rounded-2xl border-2 border-edge bg-surface px-4 text-lg font-medium text-ink shadow-hard-sm"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={nameId} className="text-[15px] font-bold">
          ให้เพื่อนเห็นคุณชื่ออะไร
        </label>
        <input
          id={nameId}
          value={name}
          maxLength={24}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!error && !name.trim()}
          className="h-14 rounded-2xl border-2 border-edge bg-surface px-4 text-lg font-medium text-ink shadow-hard-sm"
        />
        <div className="text-[13px] text-muted">จำไว้ในเครื่องนี้ ครั้งหน้าไม่ต้องกรอกใหม่</div>
      </div>

      <fieldset className="m-0 border-0 p-0">
        <legend className="pb-2.5 text-[15px] font-bold">สีของคุณ</legend>
        <div className="flex gap-3">
          {MEMBER_COLORS.map((c) => {
            const on = c.value === color;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                aria-pressed={on}
                aria-label={c.label}
                className={`relative flex size-[50px] items-center justify-center rounded-full text-lg font-bold text-member-ink ${
                  on ? "border-[3px] border-edge shadow-hard-sm" : "border-2 border-line"
                }`}
                style={{ background: c.value }}
              >
                {letter}
                {on && (
                  <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-edge bg-surface text-ink">
                    <CheckIcon size={11} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p
          role="alert"
          className="m-0 rounded-xl border-2 border-edge bg-hl px-3 py-2 text-sm font-semibold text-on-hl"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-auto h-[58px] rounded-full border-2 border-edge bg-primary font-display text-lg font-semibold text-on-primary disabled:opacity-60"
      >
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  );
}
