"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Check, X, Plus, LogOut, Users, Trophy } from "lucide-react";
import ActivityCard from "./activity-card";
import { Button, LoadingScreen, EmptyState } from "./ui";
import { TitleBadge } from "./title-badge";
import { isPast, formatScore, formatDateTime } from "@/lib/activity";
import { fetchCached } from "@/lib/client-cache";
import { useUser } from "./user-context";
import type { ActivityView, CreditEntry } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function ProfilePage() {
  const { user, setUser, refresh, groups } = useUser();
  const [activities, setActivities] = useState<ActivityView[] | null>(null);
  const [credits, setCredits] = useState<CreditEntry[] | null>(null);

  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [editingSig, setEditingSig] = useState(false);
  const [signature, setSignature] = useState("");
  const [savingSig, setSavingSig] = useState(false);
  const [sigErr, setSigErr] = useState("");

  useEffect(() => {
    fetchCached<{ activities: ActivityView[] }>("/api/activities")
      .then((d) => setActivities(d.activities ?? []))
      .catch(() => setActivities([]));
  }, []);

  useEffect(() => {
    fetchCached<{ entries: CreditEntry[] }>("/api/me/credits", 5000)
      .then((d) => setCredits(d.entries ?? []))
      .catch(() => setCredits([]));
  }, []);

  const mine = useMemo(
    () => (activities ?? []).filter((a) => a.isMine),
    [activities]
  );
  const joined = useMemo(
    () =>
      (activities ?? []).filter(
        (a) => a.myStatus === "going" || a.myStatus === "tentative"
      ),
    [activities]
  );
  const tentative = useMemo(
    () => (activities ?? []).filter((a) => a.myStatus === "tentative"),
    [activities]
  );

  function startEdit() {
    setNickname(user?.nickname ?? "");
    setErr("");
    setEditing(true);
  }
  async function saveEdit() {
    const name = nickname.trim();
    if (!name) {
      setErr("用户名不能为空");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const r = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: name }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "保存失败");
        return;
      }
      setUser(d.user);
      setEditing(false);
    } catch {
      setErr("网络错误");
    } finally {
      setSaving(false);
    }
  }

  function startEditSig() {
    setSignature(user?.signature ?? "");
    setSigErr("");
    setEditingSig(true);
  }
  async function saveEditSig() {
    setSavingSig(true);
    setSigErr("");
    try {
      const r = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: signature.trim() }),
      });
      const d = await r.json();
      if (!r.ok) {
        setSigErr(d.error || "保存失败");
        return;
      }
      setUser(d.user);
      setEditingSig(false);
    } catch {
      setSigErr("网络错误");
    } finally {
      setSavingSig(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      await refresh();
    }
  }

  if (!activities || !user) return <LoadingScreen />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile card */}
      <section className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
            style={{ backgroundColor: user.color }}
          >
            {user.nickname.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={24}
                  autoFocus
                  className="w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="w-9 h-9 shrink-0 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-50"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="w-9 h-9 shrink-0 rounded-xl bg-gray-100 text-soft flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink">{user.nickname}</h1>
                <button
                  onClick={startEdit}
                  className="w-7 h-7 shrink-0 rounded-lg bg-gray-100 text-soft flex items-center justify-center hover:bg-gray-200"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}

            {editingSig ? (
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  maxLength={20}
                  autoFocus
                  placeholder="写一句个性签名"
                  className="w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  onClick={saveEditSig}
                  disabled={savingSig}
                  className="w-8 h-8 shrink-0 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-50"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setEditingSig(false)}
                  className="w-8 h-8 shrink-0 rounded-lg bg-gray-100 text-soft flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-1.5 mt-1">
                <p
                  className={cn(
                    "text-[13px] leading-snug break-words flex-1 min-w-0",
                    user.signature ? "text-soft" : "text-gray-400"
                  )}
                >
                  {user.signature || "未设置个性签名"}
                </p>
                <button
                  onClick={startEditSig}
                  className="w-6 h-6 shrink-0 mt-0.5 rounded-md bg-gray-100 text-soft flex items-center justify-center hover:bg-gray-200"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
            {err && <p className="text-sm text-red-500 mt-1">{err}</p>}
            {sigErr && <p className="text-sm text-red-500 mt-1">{sigErr}</p>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-gray-50/70 py-3 text-center">
          <div>
            <div className="text-xl font-bold text-ink">{mine.length}</div>
            <div className="text-xs text-soft">我发起的</div>
          </div>
          <div>
            <div className="text-xl font-bold text-ink">{joined.length}</div>
            <div className="text-xs text-soft">我参与的</div>
          </div>
          <div>
            <div className="text-xl font-bold text-accent-600">{tentative.length}</div>
            <div className="text-xs text-soft">我暂定的</div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut size={15} /> 退出登录
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-1.5">
          <Users size={15} /> 我的团体
          <span className="ml-1 text-soft font-normal">({groups.length})</span>
        </h2>
        {groups.length === 0 ? (
          <div className="rounded-card bg-white border border-dashed border-gray-200 px-6 py-6 text-center text-sm text-soft">
            还没有加入团体
            <div className="mt-3 flex justify-center">
              <Link href="/groups">
                <Button size="sm" variant="secondary">
                  <Plus size={15} /> 去创建 / 加入团体
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-3 flex items-center gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span className="w-10 h-10 shrink-0 rounded-xl bg-primary-50 flex items-center justify-center text-xl">
                  {g.avatar || "👥"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-ink truncate">
                      {g.name}
                    </span>
                    <TitleBadge
                      title={g.my_title}
                      leave={g.on_leave ? g.leave_title || "请假中" : null}
                    />
                  </div>
                  <div className="text-xs text-soft">
                    积分 {formatScore(g.my_score)} · {g.member_count} 人
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <ProfileSection title="我发起的" list={mine} empty="你还没有发起过活动" />
      <ProfileSection title="我参与的" list={joined} empty="你还没有报名参加任何活动" />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-1.5">
          <Trophy size={15} className="text-accent-600" /> 积分明细
        </h2>
        {!credits || credits.length === 0 ? (
          <div className="rounded-card bg-white border border-dashed border-gray-200 px-6 py-6 text-center text-sm text-soft">
            还没有积分变化记录
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-gray-100/70 shadow-card divide-y divide-gray-100">
            {credits.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink truncate">
                    {c.activity_title || c.reason || "积分调整"}
                  </div>
                  <div className="text-[11px] text-soft truncate">
                    {formatDateTime(c.created_at)} · {c.reason}
                  </div>
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold shrink-0",
                    c.change_amount >= 0 ? "text-primary" : "text-red-500"
                  )}
                >
                  {c.change_amount >= 0 ? "+" : ""}
                  {formatScore(c.change_amount)}
                </div>
                <div className="text-xs text-soft shrink-0 w-14 text-right">
                  余 {formatScore(c.balance_after)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileSection({
  title,
  list,
  empty,
}: {
  title: string;
  list: ActivityView[];
  empty: string;
}) {
  const upcoming = list.filter((a) => !isPast(a)).sort((x, y) => x.start_time - y.start_time);
  const past = list.filter((a) => isPast(a)).sort((x, y) => y.start_time - x.start_time);
  const ordered = [...upcoming, ...past];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-ink">
        {title}
        <span className="ml-1.5 text-soft font-normal">({list.length})</span>
      </h2>
      {ordered.length === 0 ? (
        <div className="rounded-card bg-white border border-dashed border-gray-200 px-6 py-8 text-center text-sm text-soft">
          {empty}
          <div className="mt-3 flex justify-center">
            <Link href="/new">
              <Button size="sm" variant="secondary">
                <Plus size={15} /> 发起活动
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ordered.map((a) => (
            <ActivityCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </section>
  );
}
