import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import {
  listGroupMembers,
  isGroupMember,
  removeGroupMember,
  transferOwnership,
  setMemberLeave,
} from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!(await isGroupMember(id, uid)))
    return NextResponse.json({ error: "你不是该团体成员" }, { status: 403 });
  return NextResponse.json({ members: await listGroupMembers(id) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const action = String(body?.action ?? "");

  if (action === "leave") {
    const r = await removeGroupMember(id, uid, uid);
    return "error" in r
      ? NextResponse.json({ error: r.error }, { status: 400 })
      : NextResponse.json(r);
  }
  if (action === "remove") {
    const target = String(body?.userId ?? "");
    if (!target) return NextResponse.json({ error: "缺少成员" }, { status: 400 });
    const r = await removeGroupMember(id, target, uid);
    return "error" in r
      ? NextResponse.json({ error: r.error }, { status: 400 })
      : NextResponse.json(r);
  }
  if (action === "transfer") {
    const target = String(body?.userId ?? "");
    if (!target) return NextResponse.json({ error: "缺少成员" }, { status: 400 });
    const r = await transferOwnership(id, target, uid);
    return "error" in r
      ? NextResponse.json({ error: r.error }, { status: 400 })
      : NextResponse.json(r);
  }
  if (action === "setLeave") {
    // 请假状态只能由本人设置，设置后团体全体成员可见。
    if (body?.userId != null && String(body.userId) !== uid)
      return NextResponse.json(
        { error: "只能设置自己的请假状态" },
        { status: 400 }
      );
    const leaveUntil =
      body?.leaveUntil == null ? null : Number(body.leaveUntil);
    if (leaveUntil != null) {
      if (!Number.isFinite(leaveUntil))
        return NextResponse.json({ error: "请假时间无效" }, { status: 400 });
      const now = Date.now();
      if (leaveUntil < now + 60_000)
        return NextResponse.json(
          { error: "请假结束时间需要晚于现在" },
          { status: 400 }
        );
      if (leaveUntil > now + 366 * 24 * 3600 * 1000)
        return NextResponse.json({ error: "请假时间过长" }, { status: 400 });
    }
    const leaveTitle = String(body?.leaveTitle ?? "请假中");
    const r = await setMemberLeave(id, uid, leaveUntil, leaveTitle);
    return "error" in r
      ? NextResponse.json({ error: r.error }, { status: 400 })
      : NextResponse.json(r);
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}
