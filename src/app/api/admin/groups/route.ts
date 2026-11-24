import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { getUser, listAllGroups } from "@/lib/db";

/** 管理员：列出全站团体（不要求是成员）。 */
export async function GET() {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const me = await getUser(uid);
  if (!me?.is_admin)
    return NextResponse.json({ error: "仅管理员可访问" }, { status: 403 });
  return NextResponse.json({ groups: await listAllGroups() });
}
