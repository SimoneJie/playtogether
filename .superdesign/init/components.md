# Components — shared UI primitives

## Button / Badge / Toggle / EmptyState / LoadingScreen — `src/components/ui.tsx`
```tsx
"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm",
  secondary: "bg-primary-50 text-primary-700 hover:bg-primary-100",
  outline: "bg-white border border-gray-200 text-ink hover:border-primary/50 hover:bg-primary-50/40",
  ghost: "text-soft hover:bg-gray-100 hover:text-ink",
  danger: "bg-red-50 text-red-600 hover:bg-red-100",
};
const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-4 py-3 text-base rounded-xl gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant], SIZES[size], className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm text-ink">{label}</p>
        {hint && <p className="text-xs text-soft mt-0.5">{hint}</p>}
      </div>
      <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn("relative w-11 h-6 rounded-full transition-colors shrink-0", checked ? "bg-primary" : "bg-gray-200")}>
        <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

export function EmptyState({ icon, title, desc, action }: { icon?: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="rounded-card bg-white border border-dashed border-gray-200 px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">{icon}</div>}
      <h3 className="font-semibold text-ink">{title}</h3>
      {desc && <p className="mt-1 text-sm text-soft">{desc}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-soft">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="text-sm">加载中…</span>
      </div>
    </div>
  );
}
```

## TitleBadge — `src/components/title-badge.tsx`
Small pill showing the member's title (emoji + name) and optional leave title. Used on roster, members, ranking, profile.
```tsx
"use client";
import type { TitleTag } from "@/lib/types";
import { cn } from "@/lib/cn";

export function TitleBadge({ title, leave, className }: { title?: TitleTag | null; leave?: string | null; className?: string }) {
  if (!title && !leave) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal leading-none text-gray-500", className)}>
      {title && <span className="whitespace-nowrap">{title.emoji} {title.name}</span>}
      {leave && <span className="whitespace-nowrap text-accent-600">· 🏖️ {leave}</span>}
    </span>
  );
}
```

## ProbabilityBar — `src/components/probability-bar.tsx`
Horizontal progress bar for activity "成行概率" (success probability), with 0/50/100 markers and a countdown/closed hint. Green when ≥100% (or ≥1), amber when 50–99, red when <50. Uses `cn`.

## ActivityCard — `src/components/activity-card.tsx`
The activity tile: white rounded-card, cover emoji, category + status + group + visibility badges, title, date/location, 3-column stats (确定/暂定/成行概率), target line + "详情" link. Renders in a responsive grid `md:grid-cols-2`.

## SettlePanel — `src/components/settle-panel.tsx`
Amber panel shown to the organizer when an activity is pending settlement: per-member attended/absent toggles + "提交并结算积分" + "活动未成行 / 取消（不加减分）".

## PendingSettlementModal — `src/components/pending-settlement-modal.tsx`
Modal on login listing pending settlements with "去结算" links.
