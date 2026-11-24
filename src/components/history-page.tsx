"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { History as HistoryIcon, Plus } from "lucide-react";
import ActivityCard from "./activity-card";
import { Button, LoadingScreen, EmptyState } from "./ui";
import { CATEGORIES, isPast, formatFullDate } from "@/lib/activity";
import { fetchCached } from "@/lib/client-cache";
import { useHydrated } from "@/lib/use-hydrated";
import type { ActivityView } from "@/lib/types";
import { cn } from "@/lib/cn";

function monthLabel(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

export default function HistoryPage() {
  const [activities, setActivities] = useState<ActivityView[] | null>(null);
  const [cat, setCat] = useState("全部");
  const [month, setMonth] = useState("全部");
  const hydrated = useHydrated();

  useEffect(() => {
    fetchCached<{ activities: ActivityView[] }>("/api/activities")
      .then((d) => setActivities(d.activities ?? []))
      .catch(() => setActivities([]));
  }, []);

  const past = useMemo(
    () =>
      (activities ?? [])
        .filter((a) => isPast(a))
        .sort((x, y) => y.start_time - x.start_time),
    [activities]
  );

  const months = useMemo(
    () => Array.from(new Set(past.map((a) => monthLabel(a.start_time)))),
    [past]
  );

  const list = useMemo(() => {
    let l = past;
    if (cat !== "全部") l = l.filter((a) => a.category === cat);
    if (month !== "全部") l = l.filter((a) => monthLabel(a.start_time) === month);
    return l;
  }, [past, cat, month]);

  if (!activities) return <LoadingScreen />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink">历史活动</h1>
        <Link href="/new">
          <Button size="sm">
            <Plus size={16} /> 发起活动
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {["全部", ...CATEGORIES.map((c) => c.value)].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm border transition-colors",
              cat === c
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-soft border-gray-200 hover:border-primary/40"
            )}
          >
            {c !== "全部" && (
              <span>{CATEGORIES.find((x) => x.value === c)?.emoji}</span>
            )}
            {c}
          </button>
        ))}
      </div>

      {months.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          <button
            onClick={() => setMonth("全部")}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm border transition-colors",
              month === "全部"
                ? "bg-ink text-white border-ink"
                : "bg-white text-soft border-gray-200"
            )}
          >
            全部月份
          </button>
          {months.map((m) => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm border transition-colors",
                month === m
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-soft border-gray-200"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="h-7 w-7 text-primary" />}
          title="还没有历史活动"
          desc="已结束、已截止或已取消的活动会出现在这里"
          action={
            <Link href="/">
              <Button variant="secondary">去活动大厅看看</Button>
            </Link>
          }
        />
      ) : (
        <>
          {hydrated && (
            <p className="text-xs text-soft">
              共 {list.length} 场已结束、已截止或已取消的活动
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((a) => (
              <ActivityCard key={a.id} a={a} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
