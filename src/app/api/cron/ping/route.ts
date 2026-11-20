import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 每天 ping 一次数据库，防止 Supabase 免费档因 7 天闲置被自动暂停。
 * 由 Vercel Cron（见 vercel.json）每天调用一次。
 */
export async function GET(req: Request) {
  // 可选加固：在 Vercel 设置 CRON_SECRET 环境变量后，
  // 仅允许携带正确 Bearer 令牌的 Vercel Cron 请求访问。
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
