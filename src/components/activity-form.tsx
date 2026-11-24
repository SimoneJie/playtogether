"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button, Toggle } from "./ui";
import {
  CATEGORIES,
  COVER_EMOJIS,
  categoryEmoji,
  formatDuration,
} from "@/lib/activity";
import { useUser } from "./user-context";
import { invalidateCache } from "@/lib/client-cache";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/cn";

type FormActivity = Omit<Activity, "status">;

interface FormState {
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  deadline: string;
  target: string;
  max: string;
  cost: string;
  cover: string;
  description: string;
  allow_tentative: boolean;
  allow_status_change: boolean;
  public_roster: boolean;
  require_password: boolean;
  password: string;
  group_id: string;
  visibility: "group" | "public";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function toDateStr(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toTimeStr(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toDateTimeLocal(ms: number): string {
  return `${toDateStr(ms)}T${toTimeStr(ms)}`;
}
function combine(date: string, time: string): number | null {
  if (!date || !time) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [h, mm] = time.split(":").map(Number);
  if ([y, m, d, h, mm].some((n) => !Number.isFinite(n))) return null;
  return new Date(y, m - 1, d, h, mm).getTime();
}

export default function ActivityForm({
  initial,
  activityId,
}: {
  initial?: FormActivity;
  activityId?: string;
}) {
  const router = useRouter();
  const mode = activityId ? "edit" : "create";

  const [form, setForm] = useState<FormState>(() => ({
    title: initial?.title ?? "",
    category: initial?.category ?? CATEGORIES[0].value,
    date: initial ? toDateStr(initial.start_time) : toDateStr(Date.now()),
    startTime: initial ? toTimeStr(initial.start_time) : "14:00",
    endTime: initial?.end_time ? toTimeStr(initial.end_time) : "",
    location: initial?.location ?? "",
    deadline: initial?.deadline ? toDateTimeLocal(initial.deadline) : "",
    target: initial?.target_participants ? String(initial.target_participants) : "",
    max: initial?.max_participants ? String(initial.max_participants) : "",
    cost: initial?.expected_cost ?? "",
    cover: initial?.cover ?? "",
    description: initial?.description ?? "",
    allow_tentative: initial?.allow_tentative ?? true,
    allow_status_change: initial?.allow_status_change ?? true,
    public_roster: initial?.public_roster ?? true,
    require_password: initial?.require_password ?? false,
    password: "",
    group_id: initial?.group_id ?? "",
    visibility: initial?.visibility ?? "group",
  }));

  const { groups } = useUser();

  useEffect(() => {
    if (mode !== "create") return;
    const params = new URLSearchParams(window.location.search);
    const gid = params.get("groupId");
    if (gid) setForm((f) => ({ ...f, group_id: gid }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit() {
    setError("");
    const start_time = combine(form.date, form.startTime);
    if (!start_time) {
      setError("请填写活动日期和开始时间");
      return;
    }
    if (!form.title.trim()) return setError("请填写活动名称");
    if (!form.location.trim()) return setError("请填写活动地点");

    const end_time = form.endTime ? combine(form.date, form.endTime) : null;
    if (!end_time) return setError("请填写活动结束时间");
    if (end_time <= start_time) return setError("结束时间需要晚于开始时间");
    const deadline = form.deadline ? new Date(form.deadline).getTime() : null;

    const payload = {
      title: form.title.trim(),
      category: form.category,
      location: form.location.trim(),
      start_time,
      end_time,
      deadline,
      description: form.description,
      target_participants: form.target ? parseInt(form.target, 10) : null,
      max_participants: form.max ? parseInt(form.max, 10) : null,
      expected_cost: form.cost,
      cover: form.cover || categoryEmoji(form.category),
      allow_tentative: form.allow_tentative,
      allow_status_change: form.allow_status_change,
      public_roster: form.public_roster,
      require_password: form.require_password,
      password: form.password,
      group_id: form.group_id || null,
      visibility: form.group_id ? form.visibility : "public",
    };

    setSubmitting(true);
    try {
      const r = await fetch(
        mode === "create" ? "/api/activities" : `/api/activities/${activityId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "保存失败");
        return;
      }
      const id = d.activity?.id ?? activityId;
      invalidateCache("/api/activities");
      router.push(`/activity/${id}`);
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={mode === "edit" ? `/activity/${activityId}` : "/"}
          className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-soft hover:bg-gray-50"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink">
          {mode === "edit" ? "编辑活动" : "发起新活动"}
        </h1>
      </div>

      <div className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-5 md:p-6 space-y-6">
        {/* 基本信息 */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">基本信息</h2>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              活动名称 <span className="text-red-400">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={60}
              placeholder="例如：周六羽毛球"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              所属团体
            </label>
            <select
              value={form.group_id}
              onChange={(e) => set("group_id", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">无（全站独立活动）</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-soft mt-1">
              选择团体后，活动默认仅团体成员可见。
            </p>
          </div>

          {form.group_id && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                活动可见范围
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set("visibility", "group")}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm",
                    form.visibility === "group"
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-gray-200 text-soft"
                  )}
                >
                  仅团体成员
                </button>
                <button
                  type="button"
                  onClick={() => set("visibility", "public")}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm",
                    form.visibility === "public"
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-gray-200 text-soft"
                  )}
                >
                  全员可见
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              活动类型 <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set("category", c.value)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm border transition-colors",
                    form.category === c.value
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-soft border-gray-200 hover:border-primary/40"
                  )}
                >
                  <span>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              封面表情（可选）
            </label>
            <div className="flex flex-wrap gap-2">
              {COVER_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => set("cover", form.cover === e ? "" : e)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-xl border transition-colors flex items-center justify-center",
                    form.cover === e
                      ? "bg-primary-50 border-primary"
                      : "bg-white border-gray-200 hover:border-primary/40"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 时间地点 */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">时间与地点</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                活动日期 <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                开始时间 <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                结束时间 <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                报名截止（可选）
              </label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
                className="w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {(() => {
            const s = combine(form.date, form.startTime);
            const e = form.endTime ? combine(form.date, form.endTime) : null;
            if (s && e && e > s) {
              return (
                <p className="text-xs text-soft">
                  活动持续 {formatDuration(s, e)}
                </p>
              );
            }
            return null;
          })()}

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              活动地点 <span className="text-red-400">*</span>
            </label>
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              maxLength={100}
              placeholder="例如：XX 羽毛球馆 / 欢乐 KTV"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </section>

        {/* 人数与费用 */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">人数与费用</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                目标人数（期望参与）
              </label>
              <input
                type="number"
                min={1}
                value={form.target}
                onChange={(e) => set("target", e.target.value)}
                placeholder="例如：8"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                人数上限（可选）
              </label>
              <input
                type="number"
                min={1}
                value={form.max}
                onChange={(e) => set("max", e.target.value)}
                placeholder="例如：12"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              预计人均费用（可选）
            </label>
            <input
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
              maxLength={100}
              placeholder="例如：AA 约 50 元"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </section>

        {/* 活动说明 */}
        <section>
          <label className="block text-sm font-medium text-ink mb-1.5">
            活动说明（可选）
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="介绍一下活动内容、注意事项等"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
          />
        </section>

        {/* 报名设置 */}
        <section className="space-y-1 border-t border-gray-100 pt-4">
          <h2 className="text-sm font-semibold text-ink mb-1">报名设置</h2>
          <Toggle
            checked={form.allow_tentative}
            onChange={(v) => set("allow_tentative", v)}
            label="允许暂定报名"
            hint="关闭后成员只能选择确定参加或不参加"
          />
          <Toggle
            checked={form.allow_status_change}
            onChange={(v) => set("allow_status_change", v)}
            label="允许报名后修改"
            hint="关闭后成员提交后不可再改状态"
          />
          <Toggle
            checked={form.public_roster}
            onChange={(v) => set("public_roster", v)}
            label="公开参与名单"
            hint="关闭后仅发起人可见完整名单"
          />
          <Toggle
            checked={form.require_password}
            onChange={(v) => set("require_password", v)}
            label="需要密码报名"
            hint="开启后成员报名需输入密码"
          />
          {form.require_password && (
            <div className="pt-1 pb-2">
              <label className="block text-sm font-medium text-ink mb-1.5">
                报名密码 <span className="text-red-400">*</span>
              </label>
              <input
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                maxLength={16}
                placeholder={mode === "edit" ? "留空则保持原密码" : "4-16 位密码"}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          )}
        </section>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button
            onClick={submit}
            disabled={submitting}
            className="flex-1"
            size="lg"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {mode === "edit" ? "保存修改" : "创建活动"}
          </Button>
          <Link href={mode === "edit" ? `/activity/${activityId}` : "/"}>
            <Button variant="ghost" size="lg" className="px-5">
              取消
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
