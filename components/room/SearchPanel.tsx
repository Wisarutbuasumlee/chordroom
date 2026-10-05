"use client";

import { useId, useState } from "react";
import { useSearch, type SourceFilter } from "@/hooks/useSearch";
import { SearchIcon } from "../Icons";
import SearchResults, { FilterChips } from "./SearchResults";

/** ช่องค้นหาแบบฝังในหน้า (มือถือแท็บค้นหา, แผงแคบของไอแพด/คอม) */
export default function SearchPanel({
  onPicked,
  compact = false,
  autoFocus = false,
}: {
  onPicked?(): void;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SourceFilter>("all");
  const search = useSearch(query, filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex items-center">
        <SearchIcon className="pointer-events-none absolute left-3.5" />
        <label htmlFor={id} className="sr-only">
          ค้นหาเพลงหรือศิลปิน หรือวางลิงก์เพลง
        </label>
        <input
          id={id}
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={compact ? "ค้นหาเพลง" : "ค้นหาเพลง ศิลปิน หรือวางลิงก์"}
          enterKeyHint="search"
          autoComplete="off"
          className={`w-full min-w-0 rounded-2xl border-2 border-edge bg-surface pr-4 pl-11 text-[17px] font-medium text-ink shadow-hard-sm ${
            compact ? "h-12" : "h-[54px]"
          }`}
        />
      </div>
      {!compact && <FilterChips value={filter} onChange={setFilter} />}
      <SearchResults {...search} filter={filter} onPicked={onPicked} />
    </div>
  );
}
