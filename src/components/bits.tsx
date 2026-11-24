"use client";

import { OATHS, TRUST, KINDS } from "@/lib/lore";
import type { OathId, PlaceKind, Trust } from "@/lib/types";

export function Ascii({ art, className = "", label }: { art: string; className?: string; label?: string }) {
  return (
    <pre
      className={`ascii ${className}`}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {art.replace(/^\n/, "")}
    </pre>
  );
}

const trustStyle: Record<Trust, string> = {
  sworn: "bg-moss text-on-moss",
  rumour: "bg-vellum text-ink border-dashed",
  beware: "bg-door text-on-moss",
};

export function OathBadge({ oath, trust, showTrust = true }: { oath: OathId; trust?: Trust; showTrust?: boolean }) {
  const o = OATHS[oath];
  const t = trust ? TRUST[trust] : null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink px-2.5 py-0.5 text-[0.9rem] font-bold ${
        trust ? trustStyle[trust] : "bg-vellum text-ink"
      }`}
      title={t ? `${o.name}: ${t.name}. ${t.plain}` : `${o.name} (${o.plain})`}
    >
      <span aria-hidden>{o.glyph}</span>
      {o.name}
      {showTrust && t && (
        <span className="font-normal italic opacity-90">
          <span className="sr-only">,</span> {t.mark} {t.name}
        </span>
      )}
    </span>
  );
}

export function Coins({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Price: ${n} of 3 coins`}>
      {[1, 2, 3].map((i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <circle
            cx="8"
            cy="8"
            r="6.5"
            fill={i <= n ? "var(--gold)" : "none"}
            stroke="var(--ink)"
            strokeWidth="1.5"
            strokeDasharray={i <= n ? undefined : "2 2"}
          />
          {i <= n && <circle cx="8" cy="8" r="3" fill="none" stroke="var(--ink)" strokeWidth="1" />}
        </svg>
      ))}
    </span>
  );
}

export function Stars({ value }: { value: number | null }) {
  if (value == null) return <span className="hint">No Quest Logs yet</span>;
  const full = Math.round(value);
  return (
    <span role="img" aria-label={`${value.toFixed(1)} out of 5 stars`} className="tracking-wide">
      <span aria-hidden className="text-gold [text-shadow:0_0_0_var(--ink)]">
        {"★".repeat(full)}
        <span className="text-ink-soft">{"☆".repeat(5 - full)}</span>
      </span>{" "}
      <span className="text-ink-soft text-sm">{value.toFixed(1)}</span>
    </span>
  );
}

export function KindLabel({ kind }: { kind: PlaceKind }) {
  const k = KINDS[kind];
  return (
    <span className="italic text-ink-soft">
      {k.name} <span className="text-sm">({k.plain})</span>
    </span>
  );
}

export function Avatar({ face, size = "md" }: { face: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "text-2xl px-4 py-3" : size === "sm" ? "text-xs px-1.5 py-0.5" : "text-base px-2.5 py-1.5";
  return (
    <span
      aria-hidden
      className={`sketch inline-block bg-vellum-light font-[family-name:var(--font-ascii)] whitespace-nowrap ${s}`}
    >
      {face}
    </span>
  );
}

export function SampleNote() {
  return (
    <p className="hint not-italic text-sm border-l-4 border-gold pl-3">
      This is a made-up sample place. Replace it with a real one.
    </p>
  );
}

/* Tiny inline icons (SVG, never emoji) */
const ic = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
export const Icon = {
  sun: () => (
    <svg {...ic}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
    </svg>
  ),
  moon: () => (
    <svg {...ic}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  ),
  sound: () => (
    <svg {...ic}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  ),
  mute: () => (
    <svg {...ic}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </svg>
  ),
  close: () => (
    <svg {...ic}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  flag: () => (
    <svg {...ic}>
      <path d="M5 21V4M5 4.5c4-2 7 2 11 0v8c-4 2-7-2-11 0" />
    </svg>
  ),
  list: () => (
    <svg {...ic}>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  ),
  map: () => (
    <svg {...ic}>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4zM9 4v14M15 6v14" />
    </svg>
  ),
  filter: () => (
    <svg {...ic}>
      <path d="M4 5h16l-6 7.5V19l-4-2v-4.5z" />
    </svg>
  ),
  people: () => (
    <svg {...ic}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c.8-3.4 3.2-5 6-5s5.2 1.6 6 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16.5 14.6c2.4.2 4 1.6 4.5 4.4" />
    </svg>
  ),
  hoard: () => (
    <svg {...ic}>
      <path d="M4 10h16v9H4zM4 10l2-4h12l2 4M10 14h4" />
    </svg>
  ),
};
