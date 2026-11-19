import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/db";
import { setAuthCookie } from "@/lib/auth";

export async function POST(req: Request) {
  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const username = String(body?.username ?? "").trim().slice(0, 24);
  const password = String(body?.password ?? "");

  if (!username || !password) {
    return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
  }

  const user = await authenticateUser(username, password);
  if (!user) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const res = NextResponse.json({ user });
  setAuthCookie(res, user.id);
  return res;
}
