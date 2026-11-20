// Server-only: parse + validate activity form input.
import type { ActivityInput } from "./db";

function toInt(v: unknown): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseActivityInput(
  body: any // eslint-disable-line @typescript-eslint/no-explicit-any
): { input: ActivityInput } | { error: string } {
  const title = String(body?.title ?? "").trim();
  const category = String(body?.category ?? "").trim();
  const location = String(body?.location ?? "").trim();
  const startRaw = Number(body?.start_time);

  if (!title) return { error: "请填写活动名称" };
  if (title.length > 60) return { error: "活动名称请控制在 60 字以内" };
  if (!category) return { error: "请选择活动类型" };
  if (!location) return { error: "请填写活动地点" };
  if (!Number.isFinite(startRaw) || startRaw <= 0)
    return { error: "请填写活动日期和时间" };

  const endRaw = Number(body?.end_time);
  const end_time = Number.isFinite(endRaw) && endRaw > 0 ? endRaw : null;
  if (end_time != null && end_time <= startRaw)
    return { error: "结束时间需要晚于开始时间" };

  const deadlineRaw = Number(body?.deadline);
  let deadline =
    Number.isFinite(deadlineRaw) && deadlineRaw > 0 ? deadlineRaw : null;
  if (deadline == null) deadline = startRaw;

  const require_password = body?.require_password === true;
  const password = String(body?.password ?? "").trim().slice(0, 32);
  if (password && (password.length < 4 || password.length > 16))
    return { error: "报名密码为 4-16 位" };

  const input: ActivityInput = {
    title,
    category,
    location,
    start_time: startRaw,
    end_time,
    deadline,
    description: String(body?.description ?? "").slice(0, 2000),
    target_participants: toInt(body?.target_participants),
    max_participants: toInt(body?.max_participants),
    expected_cost: String(body?.expected_cost ?? "").slice(0, 100),
    cover: String(body?.cover ?? "").slice(0, 16),
    allow_tentative: body?.allow_tentative !== false,
    allow_status_change: body?.allow_status_change !== false,
    public_roster: body?.public_roster !== false,
    require_password,
    password,
  };

  return { input };
}
