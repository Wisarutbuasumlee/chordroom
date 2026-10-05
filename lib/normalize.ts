/**
 * ทำข้อความให้เทียบกันได้: ตัดช่องว่าง เครื่องหมาย และตัวอักษรล่องหน
 * เก็บสระและวรรณยุกต์ไทยไว้ (\p{M}) เพราะภาษาไทยต้องใช้แยกคำ
 */
export function normalize(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[​-‍⁠﻿]/g, "")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "");
}

/** คีย์รวมเพลงเดียวกันจากหลายเว็บ: ไม่สนวงเล็บท้ายชื่อ เช่น (อะคูสติก) */
export function songKey(title: string, artist: string | null): string {
  const bareTitle = title.replace(/\(.*?\)|\[.*?\]/g, " ");
  return `${normalize(bareTitle) || normalize(title)}|${normalize(artist)}`;
}
