"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, Loader2, Users, Trash2, Crown } from "lucide-react";
import ActivityCard from "./activity-card";
import { LoadingScreen, EmptyState, ConfirmDialog } from "./ui";
import { fetchCached, invalidateCache } from "@/lib/client-cache";
import { cn } from "@/lib/cn";
import type { ActivityView, AdminGroup } from "@/lib/types";

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "pending", label: "待结算" },
  { key: "settled", label: "已结算" },
  { key: "past", label: "历史" },
] as const;

export default function AdminPage() {
  const [view, setView] = useState<"activities" | "groups">("activities");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={20} className="text-primary" />
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink">
          全站管理
        </h1>
      </div>

      <div className="flex gap-1 bg-white/70 backdrop-blur rounded-2xl p-1.5 border border-gray-100/80 shadow-sm">
        <button
          onClick={() => setView("activities")}
          className={cn(
            "flex-1 rounded-xl py-2 text-sm font-medium transition-all duration-200 inline-flex items-center justify-center gap-1.5",
            view === "activities"
              ? "bg-primary-50 text-primary"
              : "text-soft hover:bg-gray-50"
          )}
        >
          <Shield size={15} /> 活动管理
        </button>
        <button
          onClick={() => setView("groups")}
          className={cn(
            "flex-1 rounded-xl py-2 text-sm font-medium transition-all duration-200 inline-flex items-center justify-center gap-1.5",
            view === "groups"
              ? "bg-primary-50 text-primary"
              : "text-soft hover:bg-gray-50"
          )}
        >
          <Users size={15} /> 团体管理
        </button>
      </div>

      {view === "activities" ? <ActivitiesAdmin /> : <GroupsAdmin />}
    </div>
  );
}

function ActivitiesAdmin() {
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
      <p className="text-sm text-soft">
        管理员可查看所有团体的公开与私有活动；点击活动可进入详情并删除。
      </p>

      <div className="flex flex-wrap gap-2 items-center">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm border transition-all duration-200",
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

function GroupsAdmin() {
  const [groups, setGroups] = useState<AdminGroup[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<AdminGroup | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/admin/groups", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setGroups(d.groups ?? []))
      .catch(() => setGroups([]));
  }, []);

  async function remove(g: AdminGroup) {
    setBusyId(g.id);
    setToast("");
    try {
      const r = await fetch(`/api/groups/${g.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) {
        setToast(d.error || "删除失败");
        return;
      }
      invalidateCache("/api/activities");
      setGroups((prev) => prev?.filter((x) => x.id !== g.id) ?? null);
      setToast(`已删除团体「${g.name}」`);
    } catch {
      setToast("网络错误");
    } finally {
      setBusyId(null);
      setPending(null);
    }
  }

  if (!groups) return <LoadingScreen />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-soft">
        管理员可删除任意团体。删除会一并清空该团体的活动、成员积分与积分流水，且不可恢复。
      </p>
      {toast && <p className="text-sm text-primary">{toast}</p>}

      {groups.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7 text-primary" />}
          title="还没有团体"
          desc="暂无任何团体"
        />
      ) : (
        <div className="grid gap-3">
          {groups.map((g) => (
            <div
              key={g.id}
              className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-4 flex items-center gap-3"
            >
              <span className="w-11 h-11 shrink-0 rounded-xl bg-primary-50 flex items-center justify-center text-2xl">
                {g.avatar || "👥"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-ink truncate">
                    {g.name}
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-50 px-1.5 py-0.5 text-[10px] text-accent-600">
                    <Crown size={10} /> {g.owner_nickname}
                  </span>
                </div>
                <div className="text-xs text-soft mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} /> {g.member_count} 人
                  </span>
                  {g.description && (
                    <span className="truncate max-w-[50%]">
                      {g.description}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPending(g)}
                disabled={busyId === g.id}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-red-600 text-white px-3 h-9 text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {busyId === g.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        destructive
        loading={!!pending && busyId === pending.id}
        title={pending ? `删除团体「${pending.name}」？` : ""}
        description={
          <>
            团体活动、成员积分、积分流水、邀请码和称号规则都会一并删除，
            <span className="font-medium text-red-600">且不可恢复</span>。
          </>
        }
        confirmText="确认删除"
        onCancel={() => setPending(null)}
        onConfirm={() => pending && remove(pending)}
      />
    </div>
  );
}
