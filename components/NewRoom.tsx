"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createRoom } from "@/lib/createRoom";
import { saveProfile } from "@/lib/profile";
import ProfileForm from "./ProfileForm";
import ThemeToggle from "./ThemeToggle";
import { Logo } from "./ui";

/** สร้างห้องครั้งแรก (ยังไม่มีชื่อในเครื่อง): ใส่ชื่อห้อง ชื่อเล่น สี → ได้รหัส → หน้าชวนเพื่อน */
export default function NewRoom() {
  const router = useRouter();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-[22px] px-5 pt-[max(20px,env(safe-area-inset-top))] pb-7 md:justify-center">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex-1 text-ink no-underline" aria-label="ChordRoom หน้าแรก">
          <Logo size={30} textClass="text-base" />
        </Link>
        <ThemeToggle />
      </div>
      <h1 className="m-0 font-display text-[28px] font-bold">สร้างห้องใหม่</h1>
      <ProfileForm
        roomName
        submitLabel="สร้างห้อง"
        busyLabel="กำลังสร้างห้อง…"
        onSubmit={async (p, roomName) => {
          saveProfile(p);
          const r = await createRoom(roomName || `ห้องของ${p.name}`);
          if ("error" in r) return r.error;
          router.push(`/r/${r.room.code}?invite=1`);
          return null;
        }}
      />
    </div>
  );
}
