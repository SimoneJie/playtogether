import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import {
  getTitleRulesForGroup,
  saveTitleRules,
  isGroupMember,
} from "@/lib/db";
import { validateTitleRules, type TitleRule } from "@/lib/titles";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!(await isGroupMember(id, uid)))
    return NextResponse.json({ error: "你不是该团体成员" }, { status: 403 });
  return NextResponse.json({ rules: await getTitleRulesForGroup(id) });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const raw = Array.isArray(body?.rules) ? body.rules : [];
  const rules: TitleRule[] = raw.map((r: any) => ({
    min: Number(r?.min),
    max: r?.max == null || r?.max === "" ? null : Number(r.max),
    name: String(r?.name ?? "").trim().slice(0, 20),
    emoji: String(r?.emoji ?? "").slice(0, 8),
  }));
  if (rules.some((r) => r.name.length === 0))
    return NextResponse.json({ error: "称号名称不能为空" }, { status: 400 });
  const invalid = validateTitleRules(rules);
  if (invalid)
    return NextResponse.json({ error: invalid }, { status: 400 });

  const result = await saveTitleRules(id, rules, uid);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ rules: await getTitleRulesForGroup(id) });
}
