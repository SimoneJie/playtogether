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
    const target = String(body?.userId ?? uid);
    const leaveUntil = body?.leaveUntil ? Number(body.leaveUntil) : null;
    const leaveTitle = String(body?.leaveTitle ?? "请假中");
    const r = await setMemberLeave(id, target, leaveUntil, leaveTitle, uid);
    return "error" in r
      ? NextResponse.json({ error: r.error }, { status: 400 })
      : NextResponse.json(r);
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}
