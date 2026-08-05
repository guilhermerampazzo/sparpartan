import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { TONE_SOFT, TONE_ACCENT, type Tone } from "./tone";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "neutral",
  href,
  active = false,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  tone?: Tone | "primary";
  href?: string;
  active?: boolean;
}) {
  const valueClass = tone === "primary" || tone === "neutral" ? "text-primary" : TONE_ACCENT[tone];
  const iconClass = tone === "primary" ? "bg-primary-container text-on-primary-container" : TONE_SOFT[tone as Tone];

  const content = (
    <div
      className={`group flex flex-col gap-2 rounded-xl border ${
        active ? "border-primary" : "border-outline-variant"
      } bg-surface-container-lowest p-6 shadow-card transition-shadow hover:shadow-card-hover`}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono-caps text-label-sm uppercase text-outline">{label}</p>
        {Icon && (
          <span className={`rounded-pill p-2.5 ${iconClass}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      <p className={`font-display text-headline-md font-semibold ${valueClass}`}>{value}</p>
      {hint && <p className="text-body-sm text-on-surface-variant">{hint}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
