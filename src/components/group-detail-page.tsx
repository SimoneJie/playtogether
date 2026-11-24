"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Users,
  Plus,
  Crown,
  Loader2,
  Trash2,
  ArrowRightLeft,
  CalendarDays,
  Trophy,
  AlertTriangle,
  Settings,
  Copy,
  KeyRound,
  Palmtree,
} from "lucide-react";
import ActivityCard from "./activity-card";
import { Button, ConfirmDialog, LoadingScreen, EmptyState } from "./ui";
import { TitleBadge } from "./title-badge";
import { useUser } from "./user-context";
import { formatScore } from "@/lib/activity";
import { cn } from "@/lib/cn";
import type {
  ActivityView,
  Group,
  GroupInvite,
  GroupMemberView,
} from "@/lib/types";
import { validateTitleRules, type TitleRule } from "@/lib/titles";

interface GroupData {
  group: Group;
  members: GroupMemberView[];
  invites: GroupInvite[];
  activities: ActivityView[];
  isOwner: boolean;
}

type Tab = "activities" | "members" | "ranking" | "settings";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { refresh, user } = useUser();
  const [data, setData] = useState<GroupData | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("activities");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/groups/${id}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "加载失败");
        return;
      }
      setData(d);
    } catch {
      setError("网络错误，请刷新重试");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  async function memberAction(
    body: Record<string, unknown>,
    successMsg = "操作成功"
  ): Promise<boolean> {
    setBusy(true);
    setToast("");
    try {
      const r = await fetch(`/api/groups/${id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        flash(d.error || "操作失败");
        return false;
      }
      await load();
      await refresh();
      if (body.action === "leave") {
        window.location.href = "/groups";
        return true;
      }
      flash(successMsg);
      return true;
    } catch {
      flash("网络错误");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveLeave(v: {
    leaveUntil: number | null;
    leaveTitle: string;
  }) {
    const ok = await memberAction(
      { action: "setLeave", leaveUntil: v.leaveUntil, leaveTitle: v.leaveTitle },
      v.leaveUntil ? "请假状态已更新" : "已结束请假"
    );
    if (ok) setLeaveOpen(false);
  }

  if (!data) {
    if (error)
      return (
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-soft mb-4">{error}</p>
          <Link href="/groups">
            <Button>返回我的团体</Button>
          </Link>
        </div>
      );
    return <LoadingScreen />;
  }

  const { group, members, invites, activities } = data;
  const amOwner = group.owner_id === user?.id;
  const isAdmin = !!user?.is_admin;
  const canManage = amOwner || isAdmin;
  const me = members.find((m) => m.user.id === user?.id) ?? null;
  const myOnLeave = me ? me.on_leave : group.on_leave;
  const myLeaveTitle = me ? me.leave_title : group.leave_title;
  const leaveCount = members.filter((m) => m.on_leave).length;

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "activities", label: "活动", icon: CalendarDays },
    { key: "members", label: "成员", icon: Users },
    { key: "ranking", label: "积分榜", icon: Trophy },
    ...(canManage
      ? [{ key: "settings" as Tab, label: "设置", icon: Settings }]
      : []),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] bg-ink text-white text-sm px-4 py-2 rounded-full shadow-lg text-center">
          {toast}
        </div>
      )}

      {/* Group header */}
      <section className="relative isolate overflow-hidden rounded-[26px] bg-gradient-to-br from-primary-600 via-primary to-primary-700 text-white p-6 md:p-8 shadow-card">
        <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 shrink-0 rounded-2xl bg-white/15 flex items-center justify-center text-3xl">
            {group.avatar || "👥"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">
                {group.name}
              </h1>
              {amOwner && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-[11px]">
                  <Crown size={11} /> 会长
                </span>
              )}
            </div>
            <p className="text-primary-100 text-xs mt-1">
              {group.member_count} 人
              {leaveCount > 0 && ` · 请假 ${leaveCount} 人`}
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <TitleBadge
                // title={group.my_title}
                // leave={myOnLeave ? myLeaveTitle || "请假中" : null}
                className="bg-white/15 text-white"
              />
              {/* <button
                type="button"
                disabled={busy}
                onClick={() => setLeaveOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] text-white/90 transition-colors hover:bg-white/25 disabled:opacity-50"
              >
                <Palmtree size={11} />
                {myOnLeave ? "请假中 · 修改" : "设置请假"}
              </button> */}
            </div>
          </div>
        </div>
        {group.description && (
          <p className="mt-3 text-sm text-primary-100">{group.description}</p>
        )}
        {group.announcement && (
          <div className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm">
            📢 {group.announcement}
          </div>
        )}
      </section>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/70 rounded-2xl p-1.5 border border-gray-100 shadow-sm">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5",
                tab === t.key
                  ? "bg-primary-50 text-primary"
                  : "text-soft hover:bg-gray-50"
              )}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "activities" && (
        <ActivitiesTab groupId={id} activities={activities} />
      )}
      {tab === "members" && (
        <MembersTab
          groupId={id}
          members={members}
          amOwner={amOwner}
          myId={user?.id ?? ""}
          busy={busy}
          onAction={memberAction}
          onEditLeave={() => setLeaveOpen(true)}
        />
      )}
      {tab === "ranking" && (
        <RankingTab members={members} myId={user?.id ?? ""} />
      )}
      {tab === "settings" && canManage && (
        <SettingsTab
          group={group}
          invites={invites}
          amOwner={amOwner}
          onSaved={async () => {
            await load();
            await refresh();
          }}
          flash={flash}
        />
      )}

      <LeaveDialog
        open={leaveOpen}
        busy={busy}
        current={{
          on_leave: myOnLeave,
          leave_title: myLeaveTitle,
          leave_until: me?.leave_until ?? group.leave_until,
        }}
        onCancel={() => setLeaveOpen(false)}
        onSave={saveLeave}
      />
    </div>
  );
}

function ActivitiesTab({
  groupId,
  activities,
}: {
  groupId: string;
  activities: ActivityView[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">
          团体活动
          <span className="ml-1.5 text-soft font-normal">
            （{activities.length}）
          </span>
        </h2>
        <Link href={`/new?groupId=${groupId}`}>
          <Button size="sm">
            <Plus size={16} /> 发起活动
          </Button>
        </Link>
      </div>
      {activities.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-7 w-7 text-primary" />}
          title="还没有团体活动"
          desc="发起一场活动，邀请成员报名吧"
          action={
            <Link href={`/new?groupId=${groupId}`}>
              <Button>
                <Plus size={16} /> 发起活动
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activities.map((a) => (
            <ActivityCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function MembersTab({
  members,
  amOwner,
  myId,
  busy,
  onAction,
  onEditLeave,
}: {
  groupId: string;
  members: GroupMemberView[];
  amOwner: boolean;
  myId: string;
  busy: boolean;
  onAction: (b: Record<string, unknown>) => void;
  onEditLeave: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-4 md:p-5">
      <h2 className="text-sm font-semibold text-ink mb-3">
        成员
        <span className="ml-1.5 text-soft font-normal">（{members.length}）</span>
      </h2>
      <ul className="space-y-2">
        {members.map((m) => {
          const isSelf = m.user.id === myId;
          const canManage = amOwner && !m.is_owner;
          return (
            <li
              key={m.user.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5"
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                style={{ backgroundColor: m.user.color }}
              >
                {m.user.nickname.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium text-ink truncate">
                    {m.user.nickname}
                  </span>
                  {m.is_owner && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-50 px-1.5 py-0.5 text-[10px] text-accent-600">
                      <Crown size={10} /> 会长
                    </span>
                  )}
                  <TitleBadge
                    title={m.title}
                    leave={m.on_leave ? m.leave_title || "请假中" : null}
                  />
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    title="转让会长"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          `确定把会长转让给「${m.user.nickname}」吗？转让后你将变为普通成员。`
                        )
                      )
                        onAction({ action: "transfer", userId: m.user.id });
                    }}
                    className="w-8 h-8 rounded-lg bg-gray-100 text-soft flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
                  >
                    <ArrowRightLeft size={15} />
                  </button>
                  <button
                    title="移除成员"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`确定移除「${m.user.nickname}」吗？`))
                        onAction({ action: "remove", userId: m.user.id });
                    }}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
              {isSelf && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onEditLeave}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {m.on_leave ? "销假" : "请假"}
                  </button>
                  {!amOwner && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("确定退出该团体吗？历史积分会保留。"))
                          onAction({ action: "leave" });
                      }}
                      className="text-xs text-soft hover:text-red-500 disabled:opacity-50"
                    >
                      退出
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RankingTab({ members, myId }: { members: GroupMemberView[]; myId: string }) {
  const sorted = [...members].sort((a, b) => b.score - a.score);
  const myIndex = sorted.findIndex((m) => m.user.id === myId);
  const mine = myIndex >= 0 ? sorted[myIndex] : null;
  return (
    <section className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-4 md:p-5">
      <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-1.5">
        <Trophy size={15} className="text-accent-600" /> 积分排行榜
        <span className="ml-auto text-[11px] text-soft font-normal">
          积分仅本人可见
        </span>
      </h2>
      {mine && (
        <div className="mb-3 rounded-xl bg-primary-50 px-3 py-2 text-xs text-primary-700">
          我的积分：{formatScore(mine.score)} · 当前第 {myIndex + 1} 名
        </div>
      )}
      <ul className="space-y-1.5">
        {sorted.map((m, i) => (
          <li
            key={m.user.id}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2",
              i === 0
                ? "bg-accent-50"
                : i === 1
                  ? "bg-gray-50"
                  : i === 2
                    ? "bg-primary-50/50"
                    : ""
            )}
          >
            <span
              className={cn(
                "w-6 text-center text-sm font-bold shrink-0",
                i === 0
                  ? "text-accent-600"
                  : i === 1
                    ? "text-gray-500"
                    : i === 2
                      ? "text-primary"
                      : "text-soft"
              )}
            >
              {i + 1}
            </span>
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
              style={{ backgroundColor: m.user.color }}
            >
              {m.user.nickname.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium text-ink truncate">
                  {m.user.nickname}
                </span>
                <TitleBadge
                  title={m.title}
                  leave={m.on_leave ? m.leave_title || "请假中" : null}
                />
              </div>
            </div>
            {m.user.id === myId ? (
              <span className="text-sm font-bold text-primary shrink-0">
                {formatScore(m.score)}
              </span>
            ) : (
              <span
                className="text-xs text-gray-300 shrink-0"
                title="积分仅本人可见"
              >
                🔒
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SettingsTab({
  group,
  invites,
  amOwner,
  onSaved,
  flash,
}: {
  group: Group;
  invites: GroupInvite[];
  amOwner: boolean;
  onSaved: () => Promise<void>;
  flash: (s: string) => void;
}) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [announcement, setAnnouncement] = useState(group.announcement);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<TitleRule[] | null>(null);
  const [savingRules, setSavingRules] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetch(`/api/groups/${group.id}/title-rules`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRules(d.rules ?? []))
      .catch(() => setRules([]));
  }, [group.id]);

  async function saveInfo() {
    setSaving(true);
    try {
      const r = await fetch(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, announcement }),
      });
      const d = await r.json();
      if (!r.ok) {
        flash(d.error || "保存失败");
        return;
      }
      await onSaved();
      flash("团体信息已保存");
    } catch {
      flash("网络错误");
    } finally {
      setSaving(false);
    }
  }

  async function createInvite() {
    const r = await fetch(`/api/groups/${group.id}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const d = await r.json();
    if (!r.ok) {
      flash(d.error || "生成失败");
      return;
    }
    await onSaved();
    flash("已生成新邀请码");
  }

  async function toggleInvite(inv: GroupInvite) {
    await fetch(`/api/groups/${group.id}/invites`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId: inv.id, enabled: !inv.enabled }),
    });
    await onSaved();
  }

  async function copyLink(code: string) {
    const url = `${window.location.origin}/groups/join?code=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("邀请链接已复制");
    } catch {
      flash(url);
    }
  }

  async function saveRules() {
    if (!rules) return;
    const invalid = validateTitleRules(rules);
    if (invalid) {
      flash(invalid);
      return;
    }
    setSavingRules(true);
    try {
      const r = await fetch(`/api/groups/${group.id}/title-rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: rules.map((x) => ({
            min: Number(x.min),
            max: x.max == null ? null : Number(x.max),
            name: x.name,
            emoji: x.emoji,
          })),
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        flash(d.error || "保存失败");
        return;
      }
      await onSaved();
      flash("称号已更新");
    } catch {
      flash("网络错误");
    } finally {
      setSavingRules(false);
    }
  }

  function updateRule(i: number, patch: Partial<TitleRule>) {
    setRules((prev) =>
      prev ? prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) : prev
    );
  }

  async function disband() {
    setDeleting(true);
    try {
      const r = await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) {
        flash(d.error || "删除失败");
        setDeleting(false);
        setConfirmDelete(false);
        return;
      }
      window.location.href = "/groups";
    } catch {
      flash("网络错误");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="space-y-4">
      {!amOwner && (
        <div className="rounded-2xl bg-primary-50 border border-primary-100 px-4 py-3 text-xs text-primary-700 leading-relaxed">
          你以管理员身份进入。团体资料、邀请码与称号规则由会长维护；如需删除团体，可在下方操作。
        </div>
      )}

      {amOwner && (
        <>
          <section className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-4 md:p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink">团体信息</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="团体简介"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="团体公告"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
            <Button onClick={saveInfo} disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />} 保存
            </Button>
          </section>

          <section className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                <KeyRound size={15} className="text-primary" /> 邀请码
              </h2>
              <Button size="sm" variant="secondary" onClick={createInvite}>
                <Plus size={14} /> 生成
              </Button>
            </div>
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2"
                >
                  <span className="font-mono tracking-wider text-sm text-ink">
                    {inv.code}
                  </span>
                  <span className="text-xs text-soft">
                    已用 {inv.used_count}
                    {inv.max_uses != null ? `/${inv.max_uses}` : ""}
                    {!inv.enabled ? " · 已禁用" : ""}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => copyLink(inv.code)}
                      className="w-8 h-8 rounded-lg bg-gray-100 text-soft flex items-center justify-center hover:bg-gray-200"
                      title="复制邀请链接"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => toggleInvite(inv)}
                      className={cn(
                        "px-2 h-8 rounded-lg text-xs",
                        inv.enabled
                          ? "bg-red-50 text-red-500 hover:bg-red-100"
                          : "bg-primary-50 text-primary hover:bg-primary-100"
                      )}
                    >
                      {inv.enabled ? "禁用" : "启用"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-soft">
              分享邀请链接或邀请码，成员加入后自动获得 100 初始积分。
            </p>
          </section>

          <section className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-4 md:p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink">称号规则</h2>
            {!rules ? (
              <p className="text-sm text-soft">加载中…</p>
            ) : (
              <div className="space-y-2">
                {rules.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={r.min}
                      onChange={(e) => updateRule(i, { min: Number(e.target.value) })}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      placeholder="最低"
                    />
                    <span className="text-xs text-soft">–</span>
                    <input
                      type="number"
                      value={r.max == null ? "" : r.max}
                      onChange={(e) =>
                        updateRule(i, {
                          max: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      placeholder="∞"
                    />
                    <input
                      value={r.emoji}
                      onChange={(e) => updateRule(i, { emoji: e.target.value })}
                      className="w-12 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm"
                      placeholder="🙂"
                      maxLength={8}
                    />
                    <input
                      value={r.name}
                      onChange={(e) => updateRule(i, { name: e.target.value })}
                      className="flex-1 min-w-0 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      placeholder="称号名称"
                      maxLength={20}
                    />
                    <button
                      onClick={() =>
                        setRules((prev) =>
                          prev ? prev.filter((_, idx) => idx !== i) : prev
                        )
                      }
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setRules((prev) => [
                        ...(prev ?? []),
                        { min: 300, max: null, name: "新称号", emoji: "✨" },
                      ])
                    }
                  >
                    <Plus size={14} /> 添加等级
                  </Button>
                  <Button size="sm" onClick={saveRules} disabled={savingRules}>
                    {savingRules && <Loader2 size={14} className="animate-spin" />}{" "}
                    保存称号
                  </Button>
                </div>
                <p className="text-xs text-soft">
                  积分区间需从 0 开始、不重叠、且最后一档上限留空（覆盖最高分）。
                </p>
              </div>
            )}
          </section>
        </>
      )}

      <section className="rounded-2xl bg-white border border-red-100 shadow-card p-4 md:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
          <AlertTriangle size={15} /> 危险操作
        </h2>
        <p className="text-xs text-soft">
          解散团体将永久删除团体、团体活动、成员积分、积分流水、邀请码和称号规则，且不可恢复。
        </p>
        <Button
          variant="dangerSolid"
          onClick={() => setConfirmDelete(true)}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
          解散团体
        </Button>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        destructive
        loading={deleting}
        title={`解散团体「${group.name}」？`}
        description={
          <>
            团体活动、成员积分、积分流水、邀请码和称号规则都会一并删除，
            <span className="font-medium text-red-600">且不可恢复</span>。
          </>
        }
        confirmText="确认解散"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={disband}
      />
    </div>
  );
}

const LEAVE_DURATIONS = [3, 7, 14, 30] as const;

function LeaveDialog({
  open,
  busy,
  current,
  onCancel,
  onSave,
}: {
  open: boolean;
  busy: boolean;
  current: {
    on_leave: boolean;
    leave_title: string;
    leave_until: number | null;
  };
  onCancel: () => void;
  onSave: (v: { leaveUntil: number | null; leaveTitle: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<number>(7);

  useEffect(() => {
    if (open) {
      setTitle(current.leave_title || "");
      setDays(7);
    }
  }, [open, current.leave_title]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/45 flex items-end sm:items-center justify-center sm:p-4"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-ink flex items-center gap-1.5">
          <Palmtree size={16} className="text-primary" /> 设置我的请假状态
        </h3>
        <p className="mt-1 text-xs text-soft leading-relaxed">
          设置后，团体内的所有成员都能在成员列表和积分榜看到你的请假状态，到期自动结束。
        </p>
        {current.on_leave && current.leave_until && (
          <p className="mt-1 text-[11px] text-soft">
            当前请假至{" "}
            {new Date(current.leave_until).toLocaleDateString("zh-CN")}
          </p>
        )}

        <label
          htmlFor="leave-title"
          className="mt-4 block text-xs font-medium text-ink"
        >
          状态说明
        </label>
        <input
          id="leave-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={20}
          placeholder="例如：出差 / 生病休息 / 暂停活动"
          className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium text-ink">请假时长</span>
          <span className="text-[11px] text-soft">到期自动结束</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {LEAVE_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                "rounded-xl border px-2 py-2 text-xs transition-colors",
                days === d
                  ? "border-primary bg-primary-50 font-medium text-primary"
                  : "border-gray-200 text-soft hover:bg-gray-50"
              )}
            >
              {d} 天
            </button>
          ))}
        </div>

        {current.on_leave && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave({ leaveUntil: null, leaveTitle: "" })}
            className="mt-4 w-full rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            结束请假
          </button>
        )}

        <div className="mt-2 flex gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            onClick={() =>
              onSave({
                leaveUntil: Date.now() + days * 86400000,
                leaveTitle: title.trim() || "请假中",
              })
            }
            disabled={busy}
            className="flex-1"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Palmtree size={16} />
            )}
            {current.on_leave ? "更新状态" : "开始请假"}
          </Button>
        </div>
      </div>
    </div>
  );
}
