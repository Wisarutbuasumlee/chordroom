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
}

export interface RoomSnapshot {
  room: Room;
  current: RoomSong | null;
  /** ใหม่สุดก่อน รวมเพลงปัจจุบันด้วย */
  history: RoomSong[];
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
  /** แท็บคอร์ดของคนนี้ตามเพลงของห้องอยู่ไหม · null = ยังไม่ได้เปิดแท็บคอร์ด */
  following: boolean | null;
}
