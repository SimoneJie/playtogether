"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Plus, KeyRound, Loader2, Crown, ChevronRight } from "lucide-react";
import { Button, LoadingScreen, EmptyState } from "./ui";
import { TitleBadge } from "./title-badge";
import { useUser } from "./user-context";
import { formatScore } from "@/lib/activity";
import { cn } from "@/lib/cn";

export default function GroupsPage() {
  const { groups, refresh, loading } = useUser();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setErr("");
    if (name.trim().length < 2) {
      setErr("团体名称至少 2 个字");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "创建失败");
        return;
      }
      setName("");
      setDescription("");
      setShowCreate(false);
      await refresh();
      if (d.group?.id) window.location.href = `/groups/${d.group.id}`;
    } catch {
      setErr("网络错误");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    setErr("");
    if (!code.trim()) {
      setErr("请输入邀请码");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "加入失败");
        return;
      }
      setCode("");
      await refresh();
      if (d.group?.id) window.location.href = `/groups/${d.group.id}`;
    } catch {
      setErr("网络错误");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink">我的团体</h1>
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          <Plus size={16} /> 创建团体
        </Button>
      </div>

      {showCreate && (
        <section className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink">创建新团体</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="团体名称，例如：8333羽毛球俱乐部"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="团体简介（可选）"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
          />
          <div className="flex gap-2">
            <Button onClick={create} disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />} 创建
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              取消
            </Button>
          </div>
        </section>
      )}

      {/* 加入团体 */}
      <section className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-5">
        <h2 className="text-sm font-semibold text-ink mb-2 flex items-center gap-1.5">
          <KeyRound size={15} className="text-primary" /> 用邀请码加入团体
        </h2>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={16}
            placeholder="输入邀请码"
            className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <Button onClick={join} disabled={busy} variant="secondary">
            加入
          </Button>
        </div>
      </section>

      {err && <p className="text-sm text-red-500">{err}</p>}

      {groups.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7 text-primary" />}
          title="还没有加入团体"
          desc="创建一个团体当会长，或用邀请码加入朋友的团体"
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> 创建团体
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover flex items-center gap-3"
            >
              <span className="w-12 h-12 shrink-0 rounded-xl bg-primary-50 flex items-center justify-center text-2xl">
                {g.avatar || "👥"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-ink tracking-tight truncate">{g.name}</span>
                  {g.my_role === "owner" && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-50 px-1.5 py-0.5 text-[10px] text-accent-600">
                      <Crown size={10} /> 会长
                    </span>
                  )}
                  <TitleBadge
                    title={g.my_title}
                    leave={g.on_leave ? g.leave_title || "请假中" : null}
                  />
                </div>
                <div className="mt-0.5 text-xs text-soft flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} /> {g.member_count} 人
                  </span>
                  <span>我的积分 {formatScore(g.my_score)}</span>
                  {g.description && (
                    <span className="truncate max-w-[40%]">{g.description}</span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
