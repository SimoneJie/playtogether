import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { getUser, getActivity, deleteActivity } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// 管理员永久删除活动（含报名记录）
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const user = await getUser(uid);
  if (!user?.is_admin) {
    return NextResponse.json({ error: "只有管理员可以删除活动" }, { status: 403 });
  }

  const activity = await getActivity(id);
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 });

  await deleteActivity(id);
  return NextResponse.json({ ok: true });
}
