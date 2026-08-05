import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { TONE_SOFT, TONE_BORDER, type Tone } from "./tone";

export function AlertCard({
  tone,
  title,
  description,
  icon: Icon,
  action,
}: {
  tone: Tone;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; href: string };
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${TONE_BORDER[tone]} ${TONE_SOFT[tone]} p-4`}>
      {Icon && (
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-pill"
          style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }}
        >
          <Icon size={18} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display text-title-sm font-semibold">{title}</p>
        {description && <p className="mt-0.5 text-body-sm opacity-80">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="shrink-0 rounded-lg border border-current px-3 py-1.5 text-label-md font-semibold hover:opacity-80"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
