"use client";

import ProfileForm from "../ProfileForm";
import { SectionLabel } from "../ui";
import { MemberList } from "./People";
import { OwnerSection, RoomNameEditor } from "./RoomAdmin";
import { useRoomCtx } from "./RoomContext";
import Sheet from "./Sheet";

/** แก้ไขห้อง: ชื่อห้อง (เจ้าของ) · ชื่อและสีของเรา · คนในห้อง (เจ้าของเตะออกได้) · จัดการห้อง */
export default function SettingsSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  if (!open) return null;
  return <Settings onClose={onClose} />;
}

function Settings({ onClose }: { onClose(): void }) {
  const { isOwner, room, updateProfile, toast } = useRoomCtx();
  return (
    <Sheet
      titleId="settings-title"
      title={
        <h2 id="settings-title" className="m-0 font-display text-[22px] font-bold">
          แก้ไขห้อง
        </h2>
      }
      subtitle={isOwner ? "คุณเป็นเจ้าของห้องนี้" : room.hasOwner ? "เฉพาะเจ้าของห้องเปลี่ยนชื่อห้องได้" : undefined}
      onClose={onClose}
    >
      <div className="flex flex-col gap-1.5">
        <SectionLabel>ชื่อห้อง</SectionLabel>
        <RoomNameEditor id="settings-room-name" />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border-2 border-line p-3.5">
        <SectionLabel>ชื่อของฉันในห้อง</SectionLabel>
        <ProfileForm
          submitLabel="บันทึกชื่อของฉัน"
          busyLabel="กำลังบันทึก…"
          keepBusy={false}
          onSubmit={async (p) => {
            updateProfile(p);
            toast(`เปลี่ยนชื่อเป็น ${p.name} แล้ว`);
            return null;
          }}
        />
      </div>

      <MemberList title />
      <OwnerSection />
    </Sheet>
  );
}
