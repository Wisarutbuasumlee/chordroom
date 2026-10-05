"use client";

import { useState } from "react";
import type { SourceFilter } from "@/hooks/useSearch";
import { dochordSearchUrl, SOURCE_BY_ID, SOURCES } from "@/lib/sources";
import type { SearchHit, SourceId } from "@/lib/types";
import { ExternalIcon, PasteIcon } from "../Icons";
import { useRoomCtx } from "./RoomContext";

/** หน้าต่างที่ถูกกด (หน้าหลักหรือหน้าต่างลอย) ต้องเป็นตัวเปิดแท็บ เพราะสิทธิ์เปิดแท็บผูกกับหน้าต่างนั้น */
export function hostOf(e: { currentTarget: Element }): Window | undefined {
  return e.currentTarget.ownerDocument.defaultView ?? undefined;
}

export function FilterChips({ value, onChange }: { value: SourceFilter; onChange(v: SourceFilter): void }) {
  const items: { id: SourceFilter; label: string }[] = [
    { id: "all", label: "ทุกเว็บ" },
    ...SOURCES.map((s) => ({ id: s.id as SourceFilter, label: s.label })),
  ];
  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="เลือกเว็บ">
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(it.id)}
            className={`h-9 shrink-0 rounded-full border-2 border-edge px-3.5 text-sm whitespace-nowrap ${
              on ? "bg-ink font-semibold text-bg" : "bg-surface text-ink"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export interface ResultsProps {
  q: string;
  filter: SourceFilter;
  hits: SearchHit[];
  loading: boolean;
  failed: boolean;
  isUrl: boolean;
  urlPick: { source: SourceId; url: string } | null;
  onPicked?(): void;
  /** คีย์ลัดในหน้าต่างค้นหาบนคอม */
  selected?: { row: number; source: number };
  onHover?(row: number): void;
}

export default function SearchResults(props: ResultsProps) {
  const { q, filter, hits, loading, failed, isUrl, urlPick, selected, onHover } = props;
  const { current, pick, openInChordTab } = useRoomCtx();
  const [busy, setBusy] = useState<string | null>(null);
  const [pastedTitle, setPastedTitle] = useState("");

  const choose = async (
    key: string,
    input: { songId: number } | { url: string; title?: string },
    open: { url: string; host?: Window },
  ) => {
    setBusy(key);
    const ok = await pick(input, open);
    setBusy(null);
    if (ok) props.onPicked?.();
  };

  if (!q) {
    return (
      <p className="px-1 text-[15px] leading-relaxed text-muted">
        พิมพ์ชื่อเพลงหรือศิลปิน หรือวางลิงก์เพลงจาก dochord, chordzaa, chordtabs ได้เลย
      </p>
    );
  }

  if (isUrl) {
    return urlPick ? (
      <div className="flex flex-col gap-3 rounded-[18px] border-2 border-edge bg-surface p-3.5">
        <div className="flex items-center gap-2 font-semibold">
          <PasteIcon size={18} /> ลิงก์จาก {SOURCE_BY_ID[urlPick.source].host}
        </div>
        <div className="truncate font-mono text-xs text-muted">{urlPick.url}</div>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          ชื่อเพลง <span className="font-normal text-muted">(ไม่ใส่ก็ได้ เราจะลองอ่านจากหน้าเว็บ แต่ dochord มักไม่ให้อ่าน)</span>
          <input
            value={pastedTitle}
            maxLength={120}
            onChange={(e) => setPastedTitle(e.target.value)}
            placeholder="เช่น ซมซาน - โลโซ"
            className="h-11 rounded-xl border-2 border-edge bg-bg px-3 text-[15px] font-normal text-ink"
          />
        </label>
        <button
          type="button"
          disabled={busy !== null}
          onClick={(e) =>
            choose(
              "url",
              { url: urlPick.url, ...(pastedTitle.trim() ? { title: pastedTitle.trim() } : {}) },
              { url: urlPick.url, host: hostOf(e) },
            ).then(() => setPastedTitle(""))
          }
          className="h-12 rounded-full border-2 border-edge bg-primary font-display font-semibold text-on-primary disabled:opacity-60"
        >
          {busy ? "กำลังตั้งเพลง…" : "ตั้งเป็นเพลงของห้อง"}
        </button>
      </div>
    ) : (
      <p className="rounded-[18px] border-2 border-edge bg-surface p-3.5 text-[15px]">
        รับเฉพาะลิงก์จาก dochord.com, chordzaa.com หรือ chordtabs.in.th
      </p>
    );
  }

  const dochordRow = (
    <div className="flex flex-col gap-2 rounded-[18px] border-2 border-dashed border-edge bg-surface p-3.5">
      <div className="text-sm text-muted">
        dochord ไม่เปิดให้ทำ index · ค้นบนเว็บเขาในแท็บใหม่ เจอเพลงแล้วคัดลอกลิงก์มาวางในช่องค้นหานี้
      </div>
      <button
        type="button"
        onClick={() => openInChordTab(dochordSearchUrl(q))}
        className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-edge bg-soft text-sm font-semibold text-ink"
      >
        ค้น “{q}” ใน dochord.com <ExternalIcon size={16} />
      </button>
    </div>
  );

  if (filter === "dochord") return dochordRow;

  return (
    <div className="flex flex-col gap-3" aria-busy={loading}>
      {failed && <p className="px-1 text-[15px] text-muted">ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง</p>}
      {loading && hits.length === 0 && <p className="px-1 text-[15px] text-muted">กำลังค้นหา…</p>}
      {!loading && !failed && hits.length === 0 && (
        <p className="px-1 text-[15px] text-muted">ไม่พบ “{q}” ใน chordzaa และ chordtabs</p>
      )}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {hits.map((hit, row) => {
          const playing = hit.sources.some((s) => s.url === current?.url);
          const rowSelected = selected?.row === row;
          const meta = [
            hit.artist,
            `พบใน ${hit.sources.length} เว็บ`,
            playing ? "เปิดอยู่ในห้อง" : null,
          ].filter(Boolean);
          return (
            <li
              key={hit.key}
              onMouseMove={() => onHover?.(row)}
              data-selected={rowSelected || undefined}
              className={`flex flex-col gap-3 rounded-[18px] border-2 border-edge p-3.5 ${
                rowSelected ? "bg-soft" : "bg-surface"
              }`}
            >
              <div>
                <div className="font-display text-[17px] font-semibold break-words">{hit.title}</div>
                <div className="text-[13px] text-muted">{meta.join(" · ")}</div>
              </div>
              <div className="flex gap-2">
                {hit.sources.map((s, i) => {
                  const isCurrent = s.url === current?.url;
                  const kbd = rowSelected && selected?.source === i;
                  return (
                    <button
                      key={s.source}
                      type="button"
                      disabled={busy !== null}
                      onClick={(e) => choose(`${hit.key}:${s.source}`, { songId: s.songId }, { url: s.url, host: hostOf(e) })}
                      aria-label={`เปิด ${hit.title} จาก ${SOURCE_BY_ID[s.source].host} ให้ทั้งห้อง`}
                      className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border-2 border-edge text-sm disabled:opacity-60 ${
                        isCurrent || kbd ? "bg-primary font-bold text-on-primary" : "bg-soft font-semibold text-ink"
                      }`}
                    >
                      {busy === `${hit.key}:${s.source}` ? "…" : SOURCE_BY_ID[s.source].label}
                      {kbd && <span aria-hidden="true"> ↵</span>}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
      {dochordRow}
    </div>
  );
}
