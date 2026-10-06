export type SourceId = "dochord" | "chordzaa" | "chordtabs";

/** เพลงที่เลือกให้ห้อง (มาจาก index หรือจากลิงก์ที่วางเอง) */
export interface SongPick {
  songId: number | null;
  source: SourceId;
  url: string;
  title: string;
  artist: string | null;
}

/** หนึ่งแถวใน room_songs · เพลงปัจจุบัน = แถวล่าสุดที่ยังไม่ถูกย้อน */
export interface RoomSong extends SongPick {
  id: number;
  openedBy: string;
  openedAt: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  /** มีเจ้าของแล้ว (ห้องที่สร้างก่อนมีระบบเจ้าของยังไม่มี) */
  hasOwner: boolean;
}

export interface RoomSnapshot {
  room: Room;
  current: RoomSong | null;
  /** ใหม่สุดก่อน รวมเพลงปัจจุบันด้วย */
  history: RoomSong[];
  /** clientId ของแท็บที่เจ้าของห้องเตะออก · แท็บที่เห็น id ตัวเองในนี้จะออกจากห้อง */
  kicked: string[];
}

export interface SongRow {
  id: number;
  title: string;
  artist: string | null;
  source: SourceId;
  url: string;
}

export interface SearchHit {
  key: string;
  title: string;
  artist: string | null;
  sources: { source: SourceId; url: string; songId: number }[];
}

export interface Member {
  clientId: string;
  name: string;
  color: string;
  /** กำลังดูเพลงเดียวกับห้องอยู่ (เปิด "ติดตามห้อง") */
  following: boolean;
  /** กำลังนำการเลื่อน: คนที่ติดตามห้องเลื่อนหน้าคอร์ดตามคนนี้ (แท็บรุ่นเก่าไม่มีค่านี้) */
  leading?: boolean;
}
