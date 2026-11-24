import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import {
  getUser,
  listVisibleActivities,
  createActivity,
  listRegistrationsForActivities,
  getGroupSummaries,
  getGroupOwners,
  hasPendingSettlement,
  isGroupMember,
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
  const user = uid ? await getUser(uid) : null;
  const isAdmin = !!user?.is_admin;

  const all = await listVisibleActivities(uid, isAdmin);
  const groupIds = Array.from(
    new Set(all.map((a) => a.group_id).filter((x): x is string => !!x))
  );
  const [regsByActivity, groups, owners] = await Promise.all([
    listRegistrationsForActivities(all.map((a) => a.id)),
    getGroupSummaries(groupIds),
    getGroupOwners(groupIds),
  ]);

  const activities = all.map((a) => {
    const regs = regsByActivity[a.id] ?? [];
    const stats = computeStats(regs);
    const my = uid ? regs.find((r) => r.user_id === uid) ?? null : null;
    const nonDeclined = regs.filter(
      (r) => r.participation_status !== "declined"
    ).length;
    let status = activityStatus(a);
    if (status === "pending_settlement") {
      if (!a.group_id || nonDeclined === 0) status = "ended";
    }
    const group = a.group_id ? groups.get(a.group_id) ?? null : null;
    const canSettle =
      !!uid &&
      status === "pending_settlement" &&
      !!a.group_id &&
      (isAdmin ||
        a.creator_id === uid ||
        owners.get(a.group_id) === uid);

    return {
      ...a,
      status,
      stats,
      probability: successProbability(stats, a.target_participants),
      stillNeeded: stillNeeded(stats, a.target_participants),
      registrationCount: regs.length,
      myStatus: my?.participation_status ?? null,
      isMine: uid != null && a.creator_id === uid,
      group,
      canSettle,
    };
  });
  return NextResponse.json({ activities });
}

export async function POST(req: Request) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  // 存在未结算活动时，禁止继续创建活动（PRD §6.4）
  if (await hasPendingSettlement(uid)) {
    return NextResponse.json(
      {
        error:
          "你还有上一场活动的参与情况尚未确认，请先完成上次活动的出勤统计，再发起新的活动哦！",
      },
      { status: 400 }
    );
  }

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
  const input = parsed.input;

  if (input.group_id) {
    const member = await isGroupMember(input.group_id, uid);
    if (!member) {
      return NextResponse.json(
        { error: "只有该团体成员可以发起团体活动" },
        { status: 403 }
      );
    }
  }

  if (input.require_password && !input.password) {
    return NextResponse.json({ error: "请设置报名密码" }, { status: 400 });
  }

  const activity = await createActivity(input, uid);
  return NextResponse.json({ activity }, { status: 201 });
}
