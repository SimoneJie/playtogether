import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { getUser, getUserByNickname, updateUser } from "@/lib/db";

export async function GET() {
  const uid = await getUid();
  const user = uid ? await getUser(uid) : null;
  return NextResponse.json({ user });
}

// 修改用户名（登录名，需保持唯一）
export async function PATCH(req: Request) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });
  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const nickname = String(body?.nickname ?? "").trim().slice(0, 24);
  if (nickname.length < 2) {
    return NextResponse.json({ error: "用户名至少 2 个字符" }, { status: 400 });
  }
  const taken = await getUserByNickname(nickname);
  if (taken && taken.id !== uid) {
    return NextResponse.json({ error: "这个用户名已被使用" }, { status: 400 });
  }
  const user = await updateUser(uid, { nickname });
  return NextResponse.json({ user });
}
