"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shield, Loader2 } from "lucide-react";
import ActivityCard from "./activity-card";
import { LoadingScreen, EmptyState } from "./ui";
import { fetchCached } from "@/lib/client-cache";
import { cn } from "@/lib/cn";
import type { ActivityView } from "@/lib/types";

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "pending", label: "待结算" },
  { key: "settled", label: "已结算" },
  { key: "past", label: "历史" },
] as const;

export default function AdminPage() {
  const [activities, setActivities] = useState<ActivityView[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [groupFilter, setGroupFilter] = useState("all");

  useEffect(() => {
    fetchCached<{ activities: ActivityView[] }>("/api/activities")
      .then((d) => setActivities(d.activities ?? []))
      .catch(() => setActivities([]));
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of activities ?? []) {
      if (a.group) map.set(a.group.id, a.group.name);
    }
    return Array.from(map.entries());
  }, [activities]);

  const list = useMemo(() => {
    let l = activities ?? [];
    if (filter === "active")
      l = l.filter((a) => a.status === "open" || a.status === "upcoming");
    else if (filter === "pending")
      l = l.filter((a) => a.status === "pending_settlement");
    else if (filter === "settled")
      l = l.filter((a) => a.status === "settled");
    else if (filter === "past")
      l = l.filter(
        (a) =>
          a.status === "ended" ||
          a.status === "settled" ||
          a.status === "not_held" ||
          a.status === "cancelled"
      );
    if (groupFilter !== "all")
      l = l.filter((a) => a.group?.id === groupFilter);
    return l;
  }, [activities, filter, groupFilter]);

  if (!activities) return <LoadingScreen />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={20} className="text-primary" />
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink">全站活动管理</h1>
      </div>
      <p className="text-sm text-soft">
        管理员可查看所有团体的公开与私有活动；点击活动可进入详情并删除。
      </p>

      <div className="flex flex-wrap gap-2 items-center">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm border transition-colors",
              filter === f.key
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-soft border-gray-200"
            )}
          >
            {f.label}
          </button>
        ))}
        {groups.length > 0 && (
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="ml-auto rounded-lg border border-gray-200 px-2 py-1.5 text-sm bg-white text-soft"
          >
            <option value="all">全部团体</option>
            {groups.map(([gid, name]) => (
              <option key={gid} value={gid}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-7 w-7 text-primary" />}
          title="没有符合条件的活动"
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
