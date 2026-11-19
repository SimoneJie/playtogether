"use client";

import Link from "next/link";
import { Clock, MapPin, ArrowRight } from "lucide-react";
import type { ActivityView } from "@/lib/types";
import {
  categoryEmoji,
  STATUS_LABEL,
  STATUS_BADGE,
  formatDateTime,
} from "@/lib/activity";
import { useHydrated } from "@/lib/use-hydrated";
import { Badge } from "./ui";

export default function ActivityCard({ a }: { a: ActivityView }) {
  const hydrated = useHydrated();
  const emoji = a.cover || categoryEmoji(a.category);
  return (
    <Link href={`/activity/${a.id}`} className="block group h-full">
      <div className="h-full rounded-card bg-white p-5 border border-gray-100 shadow-card hover:shadow-md transition-shadow flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-primary-50 flex items-center justify-center text-2xl">
              {emoji}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className="bg-gray-100 text-soft">{a.category}</Badge>
                <Badge className={STATUS_BADGE[a.status]}>
                  {STATUS_LABEL[a.status]}
                </Badge>
              </div>
              <h3 className="mt-1 font-semibold text-ink truncate">{a.title}</h3>
            </div>
          </div>
          {a.myStatus === "going" && (
            <Badge className="bg-primary-50 text-primary-700 shrink-0">已报名</Badge>
          )}
          {a.myStatus === "tentative" && (
            <Badge className="bg-accent-50 text-accent-600 shrink-0">已暂定</Badge>
          )}
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-soft">
          <div className="flex items-center gap-1.5">
            <Clock size={15} className="shrink-0" />
            {hydrated ? formatDateTime(a.start_time) : "\u00a0"}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={15} className="shrink-0" />
            <span className="truncate">{a.location}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-gray-50/70 py-3 text-center">
          <div>
            <div className="text-xl font-bold text-primary">{a.stats.confirmed}</div>
            <div className="text-xs text-soft">确定参加</div>
          </div>
          <div>
            <div className="text-xl font-bold text-accent-600">
              {a.stats.tentative}
            </div>
            <div className="text-xs text-soft">暂定参加</div>
          </div>
          <div>
            <div className="text-xl font-bold text-ink">
              {a.probability != null ? `${a.probability}%` : "—"}
            </div>
            <div className="text-xs text-soft">成行概率</div>
          </div>
        </div>

        <div className="mt-4 pt-1 flex items-center justify-between text-sm mt-auto">
          <div className="text-soft">
            {a.target_participants ? (
              a.stillNeeded != null && a.stillNeeded > 0 ? (
                <>
                  还差{" "}
                  <span className="font-semibold text-accent-600">
                    {a.stillNeeded}
                  </span>{" "}
                  人（目标 {a.target_participants} 人）
                </>
              ) : (
                <>已达标（目标 {a.target_participants} 人）</>
              )
            ) : (
              <>预计参与 {Math.round(a.stats.expected)} 人</>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-primary font-medium group-hover:gap-1.5 transition-all">
            详情
            <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}
