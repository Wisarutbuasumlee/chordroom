import type { ReactNode } from "react";
import { initial } from "@/lib/profile";
import { LogoIcon } from "./Icons";

export function Avatar({
  name,
  color,
  size = 34,
  className = "",
  title,
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title ?? name}
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-edge font-bold text-member-ink ${className}`}
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.41) }}
    >
      {initial(name)}
    </span>
  );
}

export function AvatarStack({
  people,
  size = 30,
  max = 4,
}: {
  people: { name: string; color: string; key: string }[];
  size?: number;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="flex" aria-hidden="true">
      {shown.map((p, i) => (
        <Avatar key={p.key} name={p.name} color={p.color} size={size} className={i ? "-ml-2" : ""} />
      ))}
      {extra > 0 && (
        <span
          className="-ml-2 flex items-center justify-center rounded-full border-2 border-edge bg-surface text-xs font-bold text-ink"
          style={{ width: size, height: size }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center border-2 border-edge bg-primary text-on-primary"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      aria-hidden="true"
    >
      <LogoIcon size={Math.round(size * 0.55)} strokeWidth={2} />
    </span>
  );
}

export function Logo({ size = 40, textClass = "text-[21px]" }: { size?: number; textClass?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className={`font-display font-bold ${textClass}`}>ChordRoom</span>
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[22px] border-2 border-edge bg-surface shadow-hard ${className}`}>{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[13px] font-semibold text-muted">{children}</div>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-lg border-2 border-edge bg-hl px-2 py-0.5 font-mono text-xs font-bold text-on-hl">
      {children}
    </kbd>
  );
}
