"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useSearch, type SourceFilter } from "@/hooks/useSearch";
import { SearchIcon } from "../Icons";
import { useRoomCtx } from "./RoomContext";
import SearchResults, { FilterChips } from "./SearchResults";

/** Ctrl/⌘ + K บนคอม (B-DSearch) */
export default function SearchPalette({ open, onClose }: { open: boolean; onClose(): void }) {
  if (!open) return null;
  return <Palette onClose={onClose} />;
}

function Palette({ onClose }: { onClose(): void }) {
  const id = useId();
  const { pick, info } = useRoomCtx();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [sel, setSel] = useState({ row: 0, source: 0, key: "" });
  const search = useSearch(query, filter);
  const restoreFocus = useRef<Element | null>(null);

  // เลือกแถวแรกใหม่ทุกครั้งที่ผลค้นหาเปลี่ยน
  const resultKey = search.hits.map((h) => h.key).join(",");
  const selected = sel.key === resultKey ? sel : { row: 0, source: 0, key: resultKey };

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector("[data-selected]")?.scrollIntoView({ block: "nearest" });
  }, [selected.row, resultKey]);

  useEffect(() => {
    restoreFocus.current = document.activeElement;
    return () => {
      if (restoreFocus.current instanceof HTMLElement) restoreFocus.current.focus();
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const hits = search.hits;
    const move = (row: number, source: number) => setSel({ row, source, key: resultKey });
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown" && hits.length) {
      e.preventDefault();
      move(Math.min(selected.row + 1, hits.length - 1), 0);
    } else if (e.key === "ArrowUp" && hits.length) {
      e.preventDefault();
      move(Math.max(selected.row - 1, 0), 0);
    } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && hits[selected.row]) {
      const n = hits[selected.row].sources.length;
      if (n < 2) return;
      e.preventDefault();
      move(selected.row, (selected.source + (e.key === "ArrowRight" ? 1 : n - 1)) % n);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (search.urlPick) void pick({ url: search.urlPick.url }).then((ok) => ok && onClose());
      const s = hits[selected.row]?.sources[selected.source];
      if (s) void pick({ songId: s.songId }).then((ok) => ok && onClose());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <button
        type="button"
        aria-label="ปิดช่องค้นหา"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-dim/80"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ค้นหาเพลง"
        className="pop-in relative flex max-h-[80vh] w-full max-w-[640px] flex-col gap-3 overflow-hidden rounded-[24px] border-2 border-edge bg-surface p-4 shadow-hard-xl"
      >
        <div className="relative flex items-center">
          <SearchIcon className="pointer-events-none absolute left-3.5" />
          <label htmlFor={id} className="sr-only">
            ค้นหาเพลงหรือศิลปิน
          </label>
          <input
            id={id}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ค้นหาเพลงหรือศิลปิน จาก 3 เว็บ"
            autoComplete="off"
            className="h-14 w-full rounded-2xl border-2 border-edge bg-bg pr-16 pl-11 text-lg font-medium text-ink"
          />
          <span className="pointer-events-none absolute right-3 rounded-md border-2 border-edge px-1.5 font-mono text-xs font-bold text-muted">
            esc
          </span>
        </div>
        <FilterChips value={filter} onChange={setFilter} />
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
          <SearchResults
            {...search}
            filter={filter}
            onPicked={onClose}
            selected={selected}
            onHover={(row) => row !== selected.row && setSel({ row, source: 0, key: resultKey })}
          />
        </div>
        <div className="flex flex-wrap gap-4 border-t-2 border-line pt-3 text-[13px] text-muted">
          <span>
            <b className="font-mono text-ink">↑ ↓</b> เลือกเพลง
          </span>
          <span>
            <b className="font-mono text-ink">← →</b> เปลี่ยนเว็บ
          </span>
          <span>
            <b className="font-mono text-ink">↵</b> เปิดให้ทั้งห้อง
          </span>
          <span className="ml-auto">{info.isMac ? "⌘ K" : "Ctrl K"} เปิดช่องนี้จากหน้าไหนก็ได้</span>
        </div>
      </div>
    </div>
  );
}
