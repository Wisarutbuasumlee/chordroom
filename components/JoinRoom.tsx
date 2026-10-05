"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveProfile } from "@/lib/profile";
import type { RoomSnapshot } from "@/lib/types";
import ProfileForm from "./ProfileForm";
import ThemeToggle from "./ThemeToggle";
import { Logo } from "./ui";

/** B-Join / B-TJoin / B-DJoin: เข้าห้องจากลิงก์ → ใส่ชื่อเล่น + เลือกสี */
export default function JoinRoom({ code }: { code: string }) {
  const router = useRouter();
  const [snap, setSnap] = useState<RoomSnapshot | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/rooms/${code}`, { cache: "no-store" })
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 404) setMissing(true);
        else if (res.ok) setSnap(await res.json());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [code]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-[22px] px-5 pt-[max(20px,env(safe-area-inset-top))] pb-7 md:justify-center">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex-1 text-ink no-underline" aria-label="ChordRoom หน้าแรก">
          <Logo size={30} textClass="text-base" />
        </Link>
        <ThemeToggle />
      </div>

      {missing ? (
        <div className="flex flex-col gap-3 rounded-[22px] border-2 border-edge bg-surface p-5 shadow-hard">
          <h1 className="m-0 font-display text-2xl font-bold">ไม่พบห้อง {code}</h1>
          <p className="m-0 text-muted">ลองเช็กรหัสห้องกับเพื่อนอีกครั้ง</p>
          <Link href="/" className="font-bold text-primary">
            กลับหน้าแรก
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3.5 rounded-[22px] border-2 border-edge bg-surface p-5 shadow-hard">
            <div>
              <div className="text-sm text-muted">เพื่อนชวนคุณเข้าห้อง</div>
              <h1 className="m-0 font-display text-2xl font-bold break-words">{snap?.room.name ?? "…"}</h1>
              <div className="font-mono text-sm font-bold tracking-wider text-muted">{code}</div>
            </div>
            {snap?.current && (
              <div className="rounded-[14px] border-2 border-edge bg-hl p-3 text-on-hl">
                <div className="text-xs font-semibold">กำลังเปิดในห้อง</div>
                <div className="text-[15px] font-bold break-words">
                  {snap.current.title} · {snap.current.source}
                </div>
              </div>
            )}
          </div>

          <ProfileForm
            submitLabel="เข้าห้องเลย"
            busyLabel="กำลังเข้าห้อง…"
            onSubmit={async (p) => {
              saveProfile(p);
              router.replace(`/r/${code}`);
              return null;
            }}
          />
        </>
      )}
    </div>
  );
}
