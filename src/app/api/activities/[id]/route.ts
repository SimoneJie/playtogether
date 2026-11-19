import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { getActivity, updateActivity, setActivityStatus } from "@/lib/db";
import { parseActivityInput } from "@/lib/parse";
import { activityDetail } from "@/lib/enrich";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  const activity = await getActivity(id);
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 });
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
