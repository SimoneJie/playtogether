import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import {
  getUser,
  getUserByNickname,
  updateUser,
  listGroupsForUser,
  listPendingSettlementsForUser,
} from "@/lib/db";

export async function GET() {
  const uid = await getUid();
  const [user, groups, pendingSettlements] = await Promise.all([
    uid ? getUser(uid) : Promise.resolve(null),
    uid ? listGroupsForUser(uid) : Promise.resolve([]),
    uid ? listPendingSettlementsForUser(uid) : Promise.resolve([]),
  ]);
  return NextResponse.json({ user, groups, pendingSettlements });
}

// 修改用户名（登录名，需保持唯一）或个性签名
export async function PATCH(req: Request) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });
  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const patch: { nickname?: string; signature?: string } = {};

  const me = await getUser(uid);

  if (body?.nickname !== undefined) {
    const nickname = String(body.nickname).trim().slice(0, 24);
    if (nickname.length < 2) {
      return NextResponse.json({ error: "用户名至少 2 个字符" }, { status: 400 });
    }
    if (nickname.toLowerCase() === "admin") {
      return NextResponse.json({ error: "该用户名不可用" }, { status: 400 });
    }
    if (me?.is_admin && nickname !== me.nickname) {
      return NextResponse.json({ error: "管理员账号不可改名" }, { status: 400 });
    }
    const taken = await getUserByNickname(nickname);
    if (taken && taken.id !== uid) {
      return NextResponse.json({ error: "这个用户名已被使用" }, { status: 400 });
    }
    patch.nickname = nickname;
  }

  if (body?.signature !== undefined) {
    patch.signature = String(body.signature).trim().slice(0, 20);
  }

  const user = await updateUser(uid, patch);
  return NextResponse.json({ user });
}
