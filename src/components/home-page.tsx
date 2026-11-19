"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, CalendarDays, Sparkles } from "lucide-react";
import ActivityCard from "./activity-card";
import { Button, LoadingScreen, EmptyState } from "./ui";
import { CATEGORIES, isPast, isThisWeek } from "@/lib/activity";
import type { ActivityView } from "@/lib/types";
import { cn } from "@/lib/cn";

const TABS = ["全部", "本周", "我发起的", "我参与的"] as const;
type Tab = (typeof TABS)[number];

export default function HomePage() {
  const [activities, setActivities] = useState<ActivityView[] | null>(null);
  const [tab, setTab] = useState<Tab>("全部");
  const [cat, setCat] = useState("全部");
  const [error, setError] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/activities", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "加载失败");
        return;
      }
      setActivities(d.activities ?? []);
    } catch {
      setError("网络错误，请刷新重试");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const list = useMemo(() => {
    if (!activities) return [];
    let l = activities;
    if (tab === "全部") l = l.filter((a) => !isPast(a));
    else if (tab === "本周")
      l = l.filter((a) => !isPast(a) && isThisWeek(a.start_time));
    else if (tab === "我发起的") l = l.filter((a) => a.isMine);
    else if (tab === "我参与的")
      l = l.filter((a) => a.myStatus === "going" || a.myStatus === "tentative");

    if (cat !== "全部") l = l.filter((a) => a.category === cat);

    const current = l
      .filter((a) => !isPast(a))
      .sort((x, y) => x.start_time - y.start_time);
    const past = l
      .filter((a) => isPast(a))
      .sort((x, y) => y.start_time - x.start_time);
    return [...current, ...past];
  }, [activities, tab, cat]);

  if (!activities) return <LoadingScreen />;

  const currentCount = activities.filter((a) => !isPast(a)).length;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="rounded-card bg-gradient-to-br from-primary to-primary-700 text-white p-6 md:p-8 shadow-card">
        <div className="flex items-center gap-2 text-primary-100 text-sm">
          <Sparkles size={16} /> 本周，约一场活动
        </div>
        <h1 className="mt-2 text-2xl md:text-3xl font-bold">这个周末，约起来！</h1>
        <p className="mt-1.5 text-primary-100 text-sm md:text-base">
          已有 {currentCount} 场活动正在组织，看看有没有你感兴趣的。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white text-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary-50 transition-colors"
          >
            <Plus size={16} /> 发起新活动
          </Link>
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 text-white px-4 py-2.5 text-sm font-medium hover:bg-white/20 transition-colors"
          >
            查看历史
          </Link>
        </div>
      </section>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {["全部", ...CATEGORIES.map((c) => c.value)].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm border transition-colors",
              cat === c
                ? "bg-primary text-white border-primary"
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

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              tab === t ? "bg-primary-50 text-primary" : "text-soft hover:bg-gray-50"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {list.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-7 w-7 text-primary" />}
          title={tab === "全部" ? "还没有活动" : "这里空空如也"}
          desc={
            tab === "全部"
              ? "成为第一个发起活动的人吧"
              : "换个筛选条件看看，或去发起一场新活动"
          }
          action={
            <Link href="/new">
              <Button>
                <Plus size={16} /> 发起活动
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((a) => (
            <ActivityCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}
