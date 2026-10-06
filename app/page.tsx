import { HomeActions, MyRooms } from "@/components/HomeActions";
import ThemeToggle from "@/components/ThemeToggle";
import { Logo } from "@/components/ui";
import { SOURCES } from "@/lib/sources";

const STEPS = [
  { title: "สร้างห้อง", body: "ใส่แค่ชื่อเล่น ไม่ต้องสมัครสมาชิก" },
  { title: "ส่งลิงก์หรือ QR ให้เพื่อน", body: "เพื่อนเปิดจากอุปกรณ์ไหนก็ได้" },
  { title: "ค้นเพลง แล้วทุกคนเห็นพร้อมกัน", body: "ใครก็เลือกเพลงได้ กดย้อนกลับได้ถ้าพลาด" },
];

/** B-Home / B-THome / B-DHome */
export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1200px] flex-col gap-6 px-5 pt-[max(20px,env(safe-area-inset-top))] pb-7 lg:px-10">
      <header className="flex items-center gap-2.5">
        <div className="flex-1">
          <Logo />
        </div>
        <ThemeToggle />
      </header>

      <main className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-center md:gap-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="m-0 font-display text-4xl leading-[1.2] font-bold md:text-5xl">
              เปิดคอร์ดเพลงเดียว <span className="rounded-lg bg-hl px-2 whitespace-nowrap text-on-hl">ทั้งวง</span>{" "}
              เห็นพร้อมกัน
            </h1>
            <p className="m-0 text-base leading-relaxed text-muted md:text-lg">
              ค้นคอร์ดจาก dochord, chordzaa และ chordtabs ในช่องเดียว ใครเลือกเพลง ทุกคนในห้องก็เห็นทันที
            </p>
          </div>
          <HomeActions />
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <span
                key={s.id}
                className="rounded-full border-2 border-edge bg-surface px-3 py-1.5 text-[13px] font-semibold"
              >
                {s.host}
              </span>
            ))}
          </div>
          <p className="m-0 hidden text-sm text-muted md:block">ไม่ต้องสมัครสมาชิก · ใช้ได้ทั้งมือถือ ไอแพด และคอม</p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="hidden flex-col gap-4 rounded-[24px] border-2 border-edge bg-surface p-6 shadow-hard md:flex">
            <div className="font-display text-xl font-bold">ใช้ง่ายใน 3 ขั้น</div>
            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-hl font-mono font-bold text-on-hl">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-bold">{s.title}</div>
                    <div className="text-sm text-muted">{s.body}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <MyRooms />
        </div>
      </main>
    </div>
  );
}
