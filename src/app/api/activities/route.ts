import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import {
  listActivities,
  createActivity,
  listRegistrations,
  getRegistration,
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
  const activities = await Promise.all(
    all.map(async (a) => {
      const regs = await listRegistrations(a.id);
      const stats = computeStats(regs);
      const my = uid ? await getRegistration(a.id, uid) : null;
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
    })
  );
  return NextResponse.json({ activities });
}

export async function POST(req: Request) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "请先填写昵称" }, { status: 401 });

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

  const activity = await createActivity(parsed.input, uid);
  return NextResponse.json({ activity }, { status: 201 });
}
