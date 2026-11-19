"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Check, X, Plus, LogOut } from "lucide-react";
import ActivityCard from "./activity-card";
import { Button, LoadingScreen, EmptyState } from "./ui";
import { isPast } from "@/lib/activity";
import { useUser } from "./user-context";
import type { ActivityView } from "@/lib/types";

export default function ProfilePage() {
  const { user, setUser, refresh } = useUser();
  const [activities, setActivities] = useState<ActivityView[] | null>(null);

  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/activities", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setActivities(d.activities ?? []))
      .catch(() => setActivities([]));
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
      <section className="rounded-card bg-white border border-gray-100 shadow-card p-6">
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
                  className="rounded-xl border border-gray-200 px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-50"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="w-9 h-9 rounded-xl bg-gray-100 text-soft flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-ink">{user.nickname}</h1>
                  <button
                    onClick={startEdit}
                    className="w-7 h-7 rounded-lg bg-gray-100 text-soft flex items-center justify-center hover:bg-gray-200"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <p className="text-xs text-soft mt-0.5">用户名 + 密码登录</p>
              </div>
            )}
            {err && <p className="text-sm text-red-500 mt-1">{err}</p>}
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

      <ProfileSection title="我发起的" list={mine} empty="你还没有发起过活动" />
      <ProfileSection title="我参与的" list={joined} empty="你还没有报名参加任何活动" />
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
