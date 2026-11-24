import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { joinGroupByCode } from "@/lib/db";

export async function POST(req: Request) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const code = String(body?.code ?? "").trim();
  if (!code) return NextResponse.json({ error: "请输入邀请码" }, { status: 400 });

  const result = await joinGroupByCode(code, uid);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
