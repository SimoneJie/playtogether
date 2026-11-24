import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import {
  getActivity,
  getUser,
  isGroupOwner,
  settleActivity,
  markActivityNotHeld,
} from "@/lib/db";
import type { AttendanceInput } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const activity = await getActivity(id);
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 });

  const me = await getUser(uid);
  const isAdmin = !!me?.is_admin;
  let allowed = isAdmin || activity.creator_id === uid;
  if (!allowed && activity.group_id)
    allowed = await isGroupOwner(activity.group_id, uid);
  if (!allowed)
    return NextResponse.json(
      { error: "只有活动组织者或会长可以结算" },
      { status: 403 }
    );

  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // 一键「未成行 / 取消」：全员不加分也不扣分
  if (body?.notHeld === true) {
    const r = await markActivityNotHeld(id);
    if ("error" in r)
      return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json(r);
  }

  const raw = Array.isArray(body?.attendance) ? body.attendance : [];
  const attendance: AttendanceInput[] = raw
    .filter(
      (x: any) =>
        x?.user_id &&
        (x.attendance_status === "attended" ||
          x.attendance_status === "absent")
    )
    .map((x: any) => ({
      user_id: String(x.user_id),
      attendance_status: x.attendance_status,
    }));

  const r = await settleActivity(id, attendance, uid);
  if ("error" in r)
    return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(r);
}
