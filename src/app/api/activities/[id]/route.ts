import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import {
  getActivity,
  updateActivity,
  setActivityStatus,
  getActivityPasswordHash,
  getUser,
  isGroupMember,
} from "@/lib/db";
import { parseActivityInput } from "@/lib/parse";
import { activityDetail } from "@/lib/enrich";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  const activity = await getActivity(id);
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 });

  // 团体私有活动：非本团体成员不可见（Admin 除外）
  if (activity.group_id && activity.visibility !== "public") {
    const user = uid ? await getUser(uid) : null;
    if (!user?.is_admin) {
      const member = uid ? await isGroupMember(activity.group_id, uid) : false;
      if (!member) {
        return NextResponse.json(
          { error: "该活动仅团体成员可见" },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.json(await activityDetail(activity, uid));
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const activity = await getActivity(id);
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 });
  if (activity.creator_id !== uid)
    return NextResponse.json({ error: "只有发起人可以编辑活动" }, { status: 403 });
  if (activity.status === "cancelled")
    return NextResponse.json({ error: "已取消的活动不能编辑" }, { status: 400 });
  if (activity.settlement_status)
    return NextResponse.json({ error: "已结算的活动不能编辑" }, { status: 400 });

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

  if (parsed.input.group_id) {
    const member = await isGroupMember(parsed.input.group_id, uid);
    if (!member) {
      return NextResponse.json(
        { error: "只有该团体成员可以将活动归属到该团体" },
        { status: 403 }
      );
    }
  }

  if (parsed.input.require_password && !parsed.input.password) {
    const existingHash = await getActivityPasswordHash(id);
    if (!existingHash) {
      return NextResponse.json({ error: "请设置报名密码" }, { status: 400 });
    }
  }

  const updated = await updateActivity(id, parsed.input);
  return NextResponse.json({ activity: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const activity = await getActivity(id);
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 });
  if (activity.creator_id !== uid)
    return NextResponse.json({ error: "只有发起人可以取消活动" }, { status: 403 });

  const updated = await setActivityStatus(id, "cancelled");
  return NextResponse.json({ activity: updated });
}
