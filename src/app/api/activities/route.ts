import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import {
  listActivities,
  createActivity,
  listRegistrationsForActivities,
} from "@/lib/db";
import {
  computeStats,
  successProbability,
  stillNeeded,
  activityStatus,
} from "@/lib/activity";
import { parseActivityInput } from "@/lib/parse";

export async function GET() {
  const uid = await getUid();
  const all = await listActivities();
  const regsByActivity = await listRegistrationsForActivities(
    all.map((a) => a.id)
  );
  const activities = all.map((a) => {
    const regs = regsByActivity[a.id] ?? [];
    const stats = computeStats(regs);
    const my = uid ? regs.find((r) => r.user_id === uid) ?? null : null;
    return {
      ...a,
      status: activityStatus(a),
      stats,
      probability: successProbability(stats, a.target_participants),
      stillNeeded: stillNeeded(stats, a.target_participants),
      registrationCount: regs.length,
      myStatus: my?.participation_status ?? null,
      isMine: uid != null && a.creator_id === uid,
    };
  });
  return NextResponse.json({ activities });
}

export async function POST(req: Request) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = parseActivityInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.input.require_password && !parsed.input.password) {
    return NextResponse.json({ error: "请设置报名密码" }, { status: 400 });
  }

  const activity = await createActivity(parsed.input, uid);
  return NextResponse.json({ activity }, { status: 201 });
}
