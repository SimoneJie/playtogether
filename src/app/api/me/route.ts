import { NextResponse } from "next/server";
import { getUid, UID_COOKIE } from "@/lib/auth";
import { getUser, getUserByNickname, loginOrCreateUser, updateUser } from "@/lib/db";

export async function GET() {
  const uid = await getUid();
  const user = uid ? await getUser(uid) : null;
  return NextResponse.json({ user });
}

export async function POST(req: Request) {
  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const nickname = String(body?.nickname ?? "").trim().slice(0, 24);
  if (!nickname) {
    return NextResponse.json({ error: "请输入昵称" }, { status: 400 });
  }
  // 同名昵称直接登录到已有账号
  const user = await loginOrCreateUser(nickname);
  const res = NextResponse.json({ user });
  res.cookies.set(UID_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

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
  if (!nickname) {
    return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
  }
  const taken = await getUserByNickname(nickname);
  if (taken && taken.id !== uid) {
    return NextResponse.json({ error: "这个昵称已被使用" }, { status: 400 });
  }
  const user = await updateUser(uid, { nickname });
  return NextResponse.json({ user });
}
