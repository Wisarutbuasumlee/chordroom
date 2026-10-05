-- Brave แจ้งว่าเครดิตหมด (รอบบิลของ Brave อาจไม่ตรงกับวันที่ 1) → หยุดถามชั่วคราวถึงเวลานี้ แล้วลองใหม่
alter table web_search_usage add column if not exists blocked_until timestamptz;
