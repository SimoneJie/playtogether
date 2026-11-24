"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, X } from "lucide-react";
import { Button } from "./ui";
import { formatDateTime } from "@/lib/activity";
import { useHydrated } from "@/lib/use-hydrated";
import type { PendingSettlement } from "@/lib/types";

export function PendingSettlementModal({
  items,
}: {
  items: PendingSettlement[];
}) {
  const [dismissed, setDismissed] = useState(false);
  const hydrated = useHydrated();
  if (dismissed || items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-5 space-y-3 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-ink flex items-center gap-1.5">
              <AlertCircle size={18} className="text-accent-600" />
              有活动待确认出勤
            </h2>
            <p className="text-sm text-soft mt-1">
              活动已经结束，来确认一下大家的出勤情况吧！
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="w-8 h-8 shrink-0 rounded-lg bg-gray-100 text-soft flex items-center justify-center hover:bg-gray-200"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        <ul className="space-y-2">
          {items.map((p) => (
            <li
              key={p.activity_id}
              className="rounded-xl border border-gray-100 p-3"
            >
              <div className="font-medium text-ink truncate">{p.title}</div>
              <div className="text-xs text-soft mt-0.5">
                {p.group_name ? `${p.group_name} · ` : ""}
                {hydrated ? formatDateTime(p.start_time) : ""} ·{" "}
                {p.signup_count} 人报名
              </div>
              <Link href={`/activity/${p.activity_id}`}>
                <Button size="sm" className="mt-2">
                  去结算
                </Button>
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-xs text-amber-600">
          ⚠️ 完成出勤确认前，将无法创建新活动。
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="w-full text-xs text-soft py-1 hover:text-ink"
        >
          稍后再说
        </button>
      </div>
    </div>
  );
}
