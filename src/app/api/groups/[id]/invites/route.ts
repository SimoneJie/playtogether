import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import {
  listGroupInvites,
  createInvite,
  setInviteEnabled,
  isGroupOwner,
} from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!(await isGroupOwner(id, uid)))
    return NextResponse.json({ error: "只有会长可以查看邀请码" }, { status: 403 });
  return NextResponse.json({ invites: await listGroupInvites(id) });
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const expiresInHours = body?.expiresInHours
    ? Number(body.expiresInHours)
    : null;
  const maxUses = body?.maxUses ? parseInt(String(body.maxUses), 10) || null : null;

  const result = await createInvite(id, uid, { expiresInHours, maxUses });
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ invite: result }, { status: 201 });
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
  const inviteId = String(body?.inviteId ?? "");
  if (!inviteId)
    return NextResponse.json({ error: "缺少邀请码 ID" }, { status: 400 });

  const result = await setInviteEnabled(inviteId, id, body?.enabled === true, uid);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
