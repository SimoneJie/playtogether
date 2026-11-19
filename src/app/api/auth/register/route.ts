import { NextResponse } from "next/server";
import { registerUser } from "@/lib/db";
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

  if (username.length < 2) {
    return NextResponse.json({ error: "用户名至少 2 个字符" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  const result = await registerUser(username, password);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const res = NextResponse.json({ user: result.user });
  setAuthCookie(res, result.user.id);
  return res;
}
