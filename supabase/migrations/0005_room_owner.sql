-- เจ้าของห้อง: เก็บแค่ sha256 ของรหัสเจ้าของ (รหัสจริงอยู่ในเครื่องคนสร้างห้อง/คนที่ได้ลิงก์เจ้าของร่วม)
-- ห้องที่สร้างก่อนมีระบบนี้ owner_hash เป็น null → คนแรกที่กด "ตั้งตัวเองเป็นเจ้าของ" ได้เป็นเจ้าของ
alter table rooms add column if not exists owner_hash text;

-- แท็บที่ถูกเชิญออก (clientId สุ่มใหม่ทุกครั้งที่โหลดหน้า จึงเปิดลิงก์ห้องใหม่แล้วกลับเข้ามาได้) · เก็บแค่ล่าสุด 50 รายการ
alter table rooms add column if not exists kicked text[] not null default '{}';
