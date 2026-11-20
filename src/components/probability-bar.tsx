"use client";

import { cn } from "@/lib/cn";

export function ProbabilityBar({
  probability,
  stillNeeded,
  target,
  confirmed,
}: {
  probability: number | null;
  stillNeeded: number | null;
  target: number | null;
  confirmed: number;
}) {
  if (probability == null) {
    return (
      <div className="text-sm text-soft">
        {target ? `目标 ${target} 人` : "未设置目标人数"}
      </div>
    );
  }
  const color =
    probability >= 80
      ? "bg-primary"
      : probability >= 50
        ? "bg-accent"
        : "bg-gray-300";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-soft">成行概率</span>
        <span className="text-2xl font-bold text-ink">{probability}%</span>
      </div>
      <div className="mt-2 h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${probability}%` }}
        />
      </div>
      <div className="mt-1.5 text-xs text-soft">
        {target && stillNeeded != null
          ? stillNeeded > 0
            ? `目标 ${target} 人 · 还差 ${stillNeeded} 人`
            : confirmed >= target
              ? `目标 ${target} 人 · 已达到 🎉`
              : `目标 ${target} 人 · 即将达到`
          : "基于报名意向的估算值，仅供参考"}
      </div>
    </div>
  );
}
