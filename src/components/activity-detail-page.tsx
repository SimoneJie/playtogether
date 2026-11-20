"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  MapPin,
  User as UserIcon,
  Users,
  Share2,
  Pencil,
  Trash2,
  Loader2,
  HelpCircle,
  Check,
  X,
} from "lucide-react";
import { Button, Badge, LoadingScreen } from "./ui";
import { ProbabilityBar } from "./probability-bar";
import {
  categoryEmoji,
  STATUS_LABEL,
  STATUS_BADGE,
  formatFullDate,
  formatTimeRange,
} from "@/lib/activity";
import { useHydrated } from "@/lib/use-hydrated";
import { useUser } from "./user-context";
import type { ActivityDetail, ParticipationStatus, RosterEntry } from "@/lib/types";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS: {
  value: ParticipationStatus;
  label: string;
  icon: typeof Check;
  activeClass: string;
}[] = [
  { value: "going", label: "确定参加", icon: Check, activeClass: "border-primary bg-primary-50 text-primary-700" },
  { value: "tentative", label: "暂定参加", icon: HelpCircle, activeClass: "border-accent-600 bg-accent-50 text-accent-600" },
  { value: "declined", label: "不参加", icon: X, activeClass: "border-gray-400 bg-gray-100 text-gray-500" },
];

export default function ActivityDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useUser();
  const hydrated = useHydrated();

  const [data, setData] = useState<ActivityDetail | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formStatus, setFormStatus] = useState<ParticipationStatus>("going");
  const [probability, setProbability] = useState(50);
  const [count, setCount] = useState(1);
  const [remark, setRemark] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/activities/${id}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "加载失败");
        return;
      }
      setData(d);
      const my = d.myRegistration;
      if (my) {
        setFormStatus(my.participation_status);
        setProbability(my.probability || 50);
        setCount(my.participant_count || 1);
        setRemark(my.remark || "");
      }
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

  if (!data && !error) return <LoadingScreen />;
  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <p className="text-soft mb-4">{error}</p>
        <Link href="/">
          <Button>返回活动大厅</Button>
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const a = data.activity;
  const { stats, probability: prob, stillNeeded, roster, myRegistration, isMine } = data;
  const closed =
    a.status === "ended" || a.status === "cancelled";
  const deadlinePassed = a.status === "deadline_passed";

  const goingList = roster.filter((r) => r.registration.participation_status === "going");
  const tentativeList = roster.filter((r) => r.registration.participation_status === "tentative");

  async function submitRegistration() {
    setBusy(true);
    try {
      const r = await fetch(`/api/activities/${id}/registration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: formStatus,
          probability,
          participantCount: count,
          remark,
          password,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "提交失败");
        setBusy(false);
        return;
      }
      setShowForm(false);
      await load();
      flash("报名已更新");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!window.confirm("确定退出报名吗？")) return;
    setBusy(true);
    try {
      await fetch(`/api/activities/${id}/registration`, { method: "DELETE" });
      setShowForm(false);
      await load();
      flash("已退出报名");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setBusy(false);
    }
  }

  async function cancelActivity() {
    if (!window.confirm("确定取消这场活动吗？取消后所有成员将看到「已取消」。")) return;
    setBusy(true);
    try {
      await fetch(`/api/activities/${id}`, { method: "DELETE" });
      await load();
      flash("活动已取消");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setBusy(false);
    }
  }

  async function deleteActivityHard() {
    if (!window.confirm("确定永久删除这场活动吗？删除后不可恢复，相关报名记录也会一并删除。")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/activities/${id}/delete`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "删除失败");
        setBusy(false);
        return;
      }
      flash("活动已删除");
      window.location.href = "/";
    } catch {
      setError("网络错误，请重试");
      setBusy(false);
    }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash("链接已复制，快去分享给群友吧");
    } catch {
      flash("复制失败，请手动复制地址栏链接");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] bg-ink text-white text-sm px-4 py-2 rounded-full shadow-lg text-center">
          {toast}
        </div>
      )}

      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-soft hover:text-ink"
      >
        <ArrowLeft size={16} /> 返回活动大厅
      </Link>

      {/* Header */}
      <section className="rounded-card bg-white border border-gray-100 shadow-card overflow-hidden">
        {a.status === "cancelled" && (
          <div className="bg-red-50 text-red-600 text-sm px-5 py-2.5 font-medium">
            该活动已被发起人取消
          </div>
        )}
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-primary-50 flex items-center justify-center text-4xl">
              {a.cover || categoryEmoji(a.category)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className="bg-gray-100 text-soft">{a.category}</Badge>
                <Badge className={STATUS_BADGE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
              </div>
              <h1 className="mt-2 text-2xl font-bold text-ink">{a.title}</h1>
            </div>
            <Button variant="outline" size="sm" onClick={share}>
              <Share2 size={15} /> 分享
            </Button>
          </div>

          <div className="mt-5 grid gap-2.5 text-sm text-soft md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              {hydrated ? (
                <>
                  {formatFullDate(a.start_time)} · {formatTimeRange(a.start_time, a.end_time)}
                </>
              ) : (
                "\u00a0"
              )}
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              <span className="truncate">{a.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserIcon size={16} className="text-primary" />
              发起人：{roster.find((r) => r.user?.id === a.creator_id)?.user?.nickname ?? "我"}
            </div>
            {a.deadline && hydrated && (
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                报名截止：{formatFullDate(a.deadline)}
              </div>
            )}
            {a.expected_cost && (
              <div className="flex items-center gap-2 md:col-span-2">
                <span className="text-primary">💰</span>
                预计人均：{a.expected_cost}
              </div>
            )}
          </div>

          {a.description && (
            <p className="mt-4 text-sm text-ink whitespace-pre-wrap leading-relaxed">
              {a.description}
            </p>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="rounded-card bg-white border border-gray-100 shadow-card p-5 md:p-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-primary-50/60 py-3">
            <div className="text-2xl font-bold text-primary">{stats.confirmed}</div>
            <div className="text-xs text-soft">确定参加</div>
          </div>
          <div className="rounded-xl bg-accent-50/60 py-3">
            <div className="text-2xl font-bold text-accent-600">{stats.tentative}</div>
            <div className="text-xs text-soft">暂定参加</div>
          </div>
          <div className="rounded-xl bg-gray-50 py-3">
            <div className="text-2xl font-bold text-gray-400">{stats.declined}</div>
            <div className="text-xs text-soft">不参加</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-gray-50/70 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-soft">预计参与人数</span>
            <span className="font-semibold text-ink">
              {Math.round(stats.expected)} 人
            </span>
          </div>
          <div className="mt-3">
            <ProbabilityBar
              probability={prob}
              stillNeeded={stillNeeded}
              target={a.target_participants}
              confirmed={stats.confirmed}
            />
          </div>
        </div>
      </section>

      {/* Registration */}
      <section className="rounded-card bg-white border border-gray-100 shadow-card p-5 md:p-6">
        <h2 className="text-sm font-semibold text-ink mb-3">我的报名</h2>

        {closed ? (
          <p className="text-sm text-soft">活动已结束，无法报名。</p>
        ) : deadlinePassed ? (
          <p className="text-sm text-soft">报名已截止。</p>
        ) : !myRegistration ? (
          !showForm ? (
            <Button onClick={() => setShowForm(true)} size="lg" className="w-full md:w-auto">
              <Users size={18} /> 我要报名
            </Button>
          ) : (
            <RegisterForm
              status={formStatus}
              setStatus={setFormStatus}
              probability={probability}
              setProbability={setProbability}
              count={count}
              setCount={setCount}
              remark={remark}
              setRemark={setRemark}
              allowTentative={a.allow_tentative}
              requirePassword={a.require_password}
              password={password}
              setPassword={setPassword}
              onSubmit={submitRegistration}
              onCancel={() => setShowForm(false)}
              busy={busy}
            />
          )
        ) : !showForm ? (
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
                  myRegistration.participation_status === "going" && "bg-primary-50 text-primary-700",
                  myRegistration.participation_status === "tentative" && "bg-accent-50 text-accent-600",
                  myRegistration.participation_status === "declined" && "bg-gray-100 text-gray-500"
                )}
              >
                {myRegistration.participation_status === "going" && <Check size={15} />}
                {myRegistration.participation_status === "tentative" && <HelpCircle size={15} />}
                {myRegistration.participation_status === "declined" && <X size={15} />}
                {STATUS_OPTIONS.find((o) => o.value === myRegistration.participation_status)?.label}
                {myRegistration.participation_status === "tentative" &&
                  ` · ${myRegistration.probability}%`}
                {myRegistration.participant_count > 1 && ` · 共 ${myRegistration.participant_count} 人`}
              </span>
              {a.allow_status_change && (
                <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                  修改
                </Button>
              )}
            </div>
            {myRegistration.remark && (
              <p className="mt-2 text-sm text-soft">备注：{myRegistration.remark}</p>
            )}
            {!a.allow_status_change && (
              <p className="mt-2 text-xs text-soft">发起人已关闭「报名后修改」，如需调整请联系发起人。</p>
            )}
          </div>
        ) : (
          <RegisterForm
            status={formStatus}
            setStatus={setFormStatus}
            probability={probability}
            setProbability={setProbability}
            count={count}
            setCount={setCount}
            remark={remark}
            setRemark={setRemark}
            allowTentative={a.allow_tentative}
            requirePassword={a.require_password}
            password={password}
            setPassword={setPassword}
            onSubmit={submitRegistration}
            onCancel={() => setShowForm(false)}
            busy={busy}
            onWithdraw={withdraw}
          />
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </section>

      {/* Roster */}
      <section className="rounded-card bg-white border border-gray-100 shadow-card p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">
            参与名单
            <span className="ml-2 text-soft font-normal">
              共 {roster.filter((r) => r.registration.participation_status !== "declined").length} 人报名
            </span>
          </h2>
        </div>

        {!a.public_roster && !isMine ? (
          <p className="text-sm text-soft">发起人已隐藏参与名单。</p>
        ) : (
          <div className="space-y-5">
            <RosterGroup title="确定参加" color="text-primary" list={goingList} />
            <RosterGroup title="暂定参加" color="text-accent-600" list={tentativeList} />
            {goingList.length === 0 && tentativeList.length === 0 && (
              <p className="text-sm text-soft">还没有人报名，快来第一个报名吧。</p>
            )}
          </div>
        )}
      </section>

      {/* Creator actions */}
      {isMine && !closed && (
        <section className="flex gap-3">
          <Link href={`/activity/${id}/edit`}>
            <Button variant="outline">
              <Pencil size={16} /> 编辑活动
            </Button>
          </Link>
          <Button variant="danger" onClick={cancelActivity} disabled={busy}>
            <Trash2 size={16} /> 取消活动
          </Button>
        </section>
      )}

      {/* Admin actions */}
      {user?.is_admin && (
        <section className="flex gap-3">
          <Button variant="danger" onClick={deleteActivityHard} disabled={busy}>
            <Trash2 size={16} /> 删除活动（管理员）
          </Button>
        </section>
      )}
    </div>
  );
}

function RegisterForm({
  status,
  setStatus,
  probability,
  setProbability,
  count,
  setCount,
  remark,
  setRemark,
  allowTentative,
  requirePassword,
  password,
  setPassword,
  onSubmit,
  onCancel,
  onWithdraw,
  busy,
}: {
  status: ParticipationStatus;
  setStatus: (s: ParticipationStatus) => void;
  probability: number;
  setProbability: (n: number) => void;
  count: number;
  setCount: (n: number) => void;
  remark: string;
  setRemark: (s: string) => void;
  allowTentative: boolean;
  requirePassword: boolean;
  password: string;
  setPassword: (s: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onWithdraw?: () => void;
  busy: boolean;
}) {
  const pct = Math.round(((probability - 10) / 80) * 100);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {STATUS_OPTIONS.filter((o) => o.value !== "tentative" || allowTentative).map((o) => {
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setStatus(o.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-medium transition-colors",
                status === o.value
                  ? o.activeClass
                  : "border-gray-200 text-soft hover:border-gray-300"
              )}
            >
              <Icon size={18} />
              {o.label}
            </button>
          );
        })}
      </div>

      {status === "tentative" && (
        <div className="rounded-xl bg-accent-50/50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink">你预计参加的概率</span>
            <span className="font-bold text-accent-600 text-lg">{probability}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={probability}
            onChange={(e) => setProbability(Number(e.target.value))}
            className="prob mt-3"
            style={{ ["--val" as string]: `${pct}%` }}
          />
          <div className="flex justify-between text-xs text-soft mt-1">
            <span>10% 不太确定</span>
            <span>90% 基本能来</span>
          </div>
        </div>
      )}

      {status !== "declined" && requirePassword && (
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            报名密码 <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={16}
            placeholder="请输入活动报名密码"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      )}

      {status !== "declined" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              同行人数（含自己）
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">备注（可选）</label>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              maxLength={200}
              placeholder="例如：带球拍"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={onSubmit} disabled={busy} className="flex-1">
          {busy && <Loader2 size={16} className="animate-spin" />}
          提交报名
        </Button>
        {onWithdraw ? (
          <Button variant="ghost" onClick={onWithdraw} disabled={busy}>
            退出报名
          </Button>
        ) : (
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
        )}
      </div>
    </div>
  );
}

function RosterGroup({
  title,
  color,
  list,
}: {
  title: string;
  color: string;
  list: RosterEntry[];
}) {
  if (list.length === 0) return null;
  return (
    <div>
      <div className={cn("text-sm font-semibold mb-2", color)}>
        {title}（{list.length}）
      </div>
      <ul className="space-y-2">
        {list.map(({ registration, user }) => (
          <li key={registration.id} className="flex items-center gap-3">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
              style={{ backgroundColor: user?.color ?? "#9ca3af" }}
            >
              {(user?.nickname ?? "?").slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="min-w-0 leading-snug">
                <span className="text-sm font-medium text-ink">
                  {user?.nickname ?? "未知"}
                </span>
                {user?.signature && (
                  <span className="ml-1.5 text-[11px] font-normal italic text-gray-400 break-words">
                    {user.signature}
                  </span>
                )}
                {registration.participant_count > 1 && (
                  <span className="ml-1 text-xs text-soft">×{registration.participant_count}</span>
                )}
                {registration.participation_status === "tentative" && (
                  <Badge className="ml-1 bg-accent-50 text-accent-600">
                    {registration.probability}%
                  </Badge>
                )}
              </div>
              {registration.remark && (
                <p className="text-xs text-soft truncate">{registration.remark}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
