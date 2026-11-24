import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { listCreditLedger } from "@/lib/db";

export async function GET(req: Request) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const url = new URL(req.url);
  const groupId = url.searchParams.get("groupId") ?? undefined;
  const entries = await listCreditLedger(uid, groupId || undefined);
  return NextResponse.json({ entries });
}
