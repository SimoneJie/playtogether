"use client";

import { useMemo, useState } from "react";
import { Check, X, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "./ui";
import { cn } from "@/lib/cn";
import { invalidateCache } from "@/lib/client-cache";
import type { RosterEntry } from "@/lib/types";
import { CREDIT_CONFIG, round1 } from "@/lib/config";

export function SettlePanel({
  activityId,
  roster,
  penalty = CREDIT_CONFIG.PENALTY_RATIO,
  onDone,
  flash,
}: {
  activityId: string;
  roster: RosterEntry[];
  penalty?: number;
  onDone: () => Promise<void>;
  flash: (s: string) => void;
}) {
  const members = useMemo(
    () =>
      roster.filter(
        (r) => r.registration.participation_status !== "declined"
      ),
    [roster]
  );
  const [attendance, setAttendance] = useState<
    Record<string, "attended" | "absent">
  >(() => {
    const init: Record<string, "attended" | "absent"> = {};
    for (const r of members)
      init[r.registration.user_id] = r.attendance ?? "attended";
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`/api/activities/${activityId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance: members.map((m) => ({
            user_id: m.registration.user_id,
            attendance_status: attendance[m.registration.user_id] ?? "attended",
          })),
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "结算失败");
        return;
      }
      flash("结算完成，积分已更新");
      invalidateCache("/api/activities");
      await onDone();
    } catch {
      setErr("网络错误");
    } finally {
      setBusy(false);
    }
  }

  async function notHeld() {
    if (!window.confirm("确定标记为「未成行 / 取消」吗？此操作不计任何积分。"))
      return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`/api/activities/${activityId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notHeld: true }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "操作失败");
        return;
      }
      flash("已标记为未成行，未产生积分变化");
      invalidateCache("/api/activities");
      await onDone();
    } catch {
      setErr("网络错误");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-amber-50 border border-amber-200 shadow-card p-5 md:p-6">
      <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
        <AlertTriangle size={16} /> 活动已结束，请确认出勤
      </h2>
      <p className="text-xs text-amber-700 mt-1">
        确认后系统按报名状态与出勤情况结算积分；若活动未成行，请点下方「未成行」。
      </p>
      <p className="text-xs text-amber-700/90 mt-1">
        本团体缺席系数 {penalty.toFixed(1)}：确定参加却缺席约扣{" "}
        {round1(CREDIT_CONFIG.BASE_REWARD * penalty)} 分，暂定按概率折算。
      </p>

      {members.length === 0 ? (
        <p className="text-sm text-soft mt-3">无人报名。</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {members.map((m) => {
            const uid = m.registration.user_id;
            const st = attendance[uid] ?? "attended";
            const isGoing = m.registration.participation_status === "going";
            return (
              <li
                key={uid}
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-2"
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ backgroundColor: m.user?.color ?? "#9ca3af" }}
                >
                  {(m.user?.nickname ?? "?").slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-ink truncate">
                      {m.user?.nickname ?? "未知"}
                    </span>
                    <span className="text-[11px] text-soft">
                      {isGoing
                        ? "确定参加"
                        : `暂定 ${m.registration.probability}%`}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() =>
                      setAttendance((x) => ({ ...x, [uid]: "attended" }))
                    }
                    className={cn(
                      "px-2.5 h-8 rounded-lg text-xs inline-flex items-center gap-0.5",
                      st === "attended"
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-soft"
                    )}
                  >
                    <Check size={13} /> 参加
                  </button>
                  <button
                    onClick={() =>
                      setAttendance((x) => ({ ...x, [uid]: "absent" }))
                    }
                    className={cn(
                      "px-2.5 h-8 rounded-lg text-xs inline-flex items-center gap-0.5",
                      st === "absent"
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-soft"
                    )}
                  >
                    <X size={13} /> 未参加
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {err && <p className="text-sm text-red-500 mt-2">{err}</p>}

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <Button onClick={submit} disabled={busy} className="flex-1">
          {busy && <Loader2 size={16} className="animate-spin" />}
          提交并结算积分
        </Button>
        <Button variant="outline" onClick={notHeld} disabled={busy}>
          活动未成行 / 取消（不加减分）
        </Button>
      </div>
    </section>
  );
}
