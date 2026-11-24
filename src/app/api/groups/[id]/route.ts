import { NextResponse } from "next/server";
import { getUid } from "@/lib/auth";
import {
  getGroupForUser,
  listGroupMembers,
  listGroupInvites,
  listGroupActivities,
  updateGroup,
  deleteGroup,
} from "@/lib/db";
import { activityView } from "@/lib/enrich";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const group = await getGroupForUser(id, uid);
  if (!group)
    return NextResponse.json({ error: "你不是该团体成员" }, { status: 403 });

  const isOwner = group.owner_id === uid;
  const [members, activities, invites] = await Promise.all([
    listGroupMembers(id),
    listGroupActivities(id),
    isOwner ? listGroupInvites(id) : Promise.resolve([]),
  ]);
  const views = await Promise.all(
    activities.map((a) => activityView(a, uid, false))
  );
  return NextResponse.json({ group, members, invites, activities: views, isOwner });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const patch: {
    name?: string;
    description?: string;
    announcement?: string;
    avatar?: string;
  } = {};
  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2 || name.length > 30)
      return NextResponse.json(
        { error: "团体名称需 2-30 个字符" },
        { status: 400 }
      );
    patch.name = name;
  }
  if (body?.description !== undefined)
    patch.description = String(body.description);
  if (body?.announcement !== undefined)
    patch.announcement = String(body.announcement);
  if (body?.avatar !== undefined) patch.avatar = String(body.avatar);

  const result = await updateGroup(id, patch, uid);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: 400 });

  const group = await getGroupForUser(id, uid);
  return NextResponse.json({ group });
}

/** 解散团体：仅会长或管理员；级联删除团体活动、成员积分等所有关联数据。 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const result = await deleteGroup(id, uid);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json(result);
}
