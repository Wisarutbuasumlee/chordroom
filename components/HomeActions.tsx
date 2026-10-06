"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { createRoom } from "@/lib/createRoom";
import { loadOwnerKey, loadProfile, loadRooms, type SavedRoom } from "@/lib/profile";
import { normalizeRoomCode } from "@/lib/roomCode";
import { ChevronRightIcon, PlusIcon } from "./Icons";

export function HomeActions() {
  const router = useRouter();
  const codeId = useId();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // มีชื่อในเครื่องแล้ว: สร้างห้องได้เลย แล้วเปิดหน้าชวนเพื่อนทันที
  const create = async () => {
    const p = loadProfile();
    if (!p) {
      router.push("/new");
      return;
    }
    setBusy(true);
    setError(null);
    const r = await createRoom(`ห้องของ${p.name}`);
    if ("error" in r) {
      setError(r.error);
      setBusy(false);
      return;
    }
    router.push(`/r/${r.room.code}?invite=1`);
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    const c = normalizeRoomCode(code);
    if (!c) {
      setError("รหัสห้องมี 6 ตัว เช่น KX7-42Q");
      return;
    }
    router.push(`/r/${c}`);
  };

  return (
    <div className="flex flex-col gap-4 rounded-[22px] border-2 border-edge bg-surface p-5 shadow-hard">
      <button
        type="button"
        onClick={create}
        disabled={busy}
        className="flex h-14 items-center justify-center gap-2 rounded-full border-2 border-edge bg-primary font-display text-lg font-semibold text-on-primary disabled:opacity-60"
      >
        <PlusIcon />
        {busy ? "กำลังสร้างห้อง…" : "สร้างห้องใหม่"}
      </button>
      <div className="flex items-center gap-2.5 text-[13px] text-muted" aria-hidden="true">
        <span className="h-0.5 flex-1 bg-line" />
        หรือใส่รหัสห้องเพื่อน
        <span className="h-0.5 flex-1 bg-line" />
      </div>
      <form onSubmit={join} className="flex gap-2" noValidate>
        <label htmlFor={codeId} className="sr-only">
          รหัสห้อง
        </label>
        <input
          id={codeId}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="KX7-42Q"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={9}
          className="h-[52px] min-w-0 flex-1 rounded-[14px] border-2 border-edge bg-bg px-3.5 font-mono text-lg tracking-[0.08em] text-ink uppercase"
        />
        <button
          type="submit"
          className="h-[52px] rounded-[14px] border-2 border-edge bg-hl px-[18px] font-bold text-on-hl"
        >
          เข้าห้อง
        </button>
      </form>
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-ink">
          {error}
        </p>
      )}
    </div>
  );
}

/** ห้องที่เคยเข้า (ซ้อมหลายวง แต่ละวงคนละห้อง) · เข้าล่าสุดก่อน */
export function MyRooms() {
  const [rooms, setRooms] = useState<(SavedRoom & { owner: boolean })[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลัง mount เท่านั้น
    setRooms(loadRooms().map((r) => ({ ...r, owner: Boolean(loadOwnerKey(r.code)) })));
  }, []);
  if (!rooms.length) return null;
  return (
    <section className="flex flex-col gap-2" aria-labelledby="my-rooms">
      <h2 id="my-rooms" className="m-0 text-[13px] font-semibold text-muted">
        ห้องของฉัน
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rooms.map((r) => (
          <li key={r.code}>
            <Link
              href={`/r/${r.code}`}
              className="flex items-center gap-3 rounded-[18px] border-2 border-edge bg-surface p-3.5 text-ink no-underline"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold">{r.name}</div>
                <div className="font-mono text-[13px] text-muted">
                  {r.code}
                  {r.owner && <span className="font-sans"> · เจ้าของ</span>}
                </div>
              </div>
              <ChevronRightIcon />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
