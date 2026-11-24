import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import { listGroupsForUser, createGroup } from "@/lib/db";

export async function GET() {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const groups = await listGroupsForUser(uid);
  return NextResponse.json({ groups });
}

export async function POST(req: Request) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const name = String(body?.name ?? "").trim();
  if (name.length < 2 || name.length > 30) {
    return NextResponse.json(
      { error: "团体名称需 2-30 个字符" },
      { status: 400 }
    );
  }

  const group = await createGroup(
    {
      name,
      description: String(body?.description ?? "").slice(0, 500),
      announcement: String(body?.announcement ?? "").slice(0, 1000),
      avatar: String(body?.avatar ?? "").slice(0, 16),
    },
    uid
  );
  return NextResponse.json({ group }, { status: 201 });
}
