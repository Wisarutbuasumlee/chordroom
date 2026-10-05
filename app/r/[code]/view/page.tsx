import { redirect } from "next/navigation";

/** หน้าดูคอร์ดแยกเลิกใช้แล้ว (ห้องเป็นหน้าเดียวจบ) · ลิงก์เก่าพากลับไปหน้าห้อง */
export default async function ViewerPage({ params }: PageProps<"/r/[code]/view">) {
  const { code } = await params;
  redirect(`/r/${code}`);
}
