import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import {
  getActivity,
  upsertRegistration,
  deleteRegistration,
  listRegistrations,
} from "@/lib/db";
import {
  computeStats,
  successProbability,
  stillNeeded,
  activityStatus,
} from "@/lib/activity";
import type { ParticipationStatus } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

const VALID_STATUS: ParticipationStatus[] = ["going", "tentative", "declined"];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

async function statsPayload(activityId: string) {
  const regs = await listRegistrations(activityId);
  const stats = computeStats(regs);
  const activity = (await getActivity(activityId))!;
  return {
    stats,
    probability: successProbability(stats, activity.target_participants),
    stillNeeded: stillNeeded(stats, activity.target_participants),
  };
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const activity = await getActivity(id);
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 });

  const status = activityStatus(activity);
  if (status === "ended" || status === "cancelled")
    return NextResponse.json({ error: "活动已结束，无法报名" }, { status: 400 });
  if (status === "deadline_passed")
    return NextResponse.json({ error: "报名已截止" }, { status: 400 });

  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const ps = String(body?.status ?? "") as ParticipationStatus;
  if (!VALID_STATUS.includes(ps))
    return NextResponse.json({ error: "请选择参与状态" }, { status: 400 });
  if (ps === "tentative" && !activity.allow_tentative)
    return NextResponse.json({ error: "该活动不允许暂定报名" }, { status: 400 });

  let probability = 100;
  if (ps === "declined") probability = 0;
  else if (ps === "tentative") {
    probability = clamp(Math.round(Number(body?.probability ?? 50)), 10, 90);
  }

  const participant_count = clamp(
    parseInt(String(body?.participantCount ?? "1"), 10) || 1,
    1,
    50
  );
  const remark = String(body?.remark ?? "").slice(0, 200);

  const registration = await upsertRegistration(id, uid, {
    participation_status: ps,
    probability,
    participant_count,
    remark,
  });

  return NextResponse.json({ registration, ...(await statsPayload(id)) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const activity = await getActivity(id);
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 });

  await deleteRegistration(id, uid);
  return NextResponse.json({ ok: true, ...(await statsPayload(id)) });
}
