// Server-only helpers that turn raw rows into API payloads.
import {
  listRegistrations,
  getUsersByIds,
  listAttendance,
  rosterTitles,
  getGroupSummary,
  isGroupMember,
  isGroupOwner,
  getUser,
} from "./db";
import {
  computeStats,
  successProbability,
  stillNeeded,
  activityStatus,
} from "./activity";
import type {
  Activity,
  ActivityDetail,
  ActivityStatus,
  ActivityView,
  RosterEntry,
} from "./types";

/** 待结算但没有有效报名的活动，降级显示为「已结束」。 */
function refineStatus(
  a: Activity,
  nonDeclinedCount: number,
  now = Date.now()
): ActivityStatus {
  const base = activityStatus(a, now);
  if (base === "pending_settlement") {
    // 仅团体活动需要结算；全站独立/历史活动仍显示「已结束」
    if (!a.group_id || nonDeclinedCount === 0) return "ended";
  }
  return base;
}

async function computeCanSettle(
  a: Activity,
  uid: string | null,
  isAdmin: boolean,
  status: ActivityStatus
): Promise<boolean> {
  if (!uid || status !== "pending_settlement") return false;
  if (!a.group_id) return false; // 结算仅适用于团体活动
  if (isAdmin) return true;
  if (a.creator_id === uid) return true;
  if (await isGroupOwner(a.group_id, uid)) return true;
  return false;
}

export async function activityView(
  a: Activity,
  uid: string | null,
  isAdmin: boolean
): Promise<ActivityView> {
  const regs = await listRegistrations(a.id);
  const stats = computeStats(regs);
  const my = uid ? regs.find((r) => r.user_id === uid) ?? null : null;
  const nonDeclined = regs.filter(
    (r) => r.participation_status !== "declined"
  ).length;
  const status = refineStatus(a, nonDeclined);
  const group = a.group_id ? await getGroupSummary(a.group_id) : null;
  return {
    ...a,
    status,
    stats,
    probability: successProbability(stats, a.target_participants),
    stillNeeded: stillNeeded(stats, a.target_participants),
    registrationCount: regs.length,
    myStatus: my?.participation_status ?? null,
    isMine: uid != null && a.creator_id === uid,
    group,
    canSettle: await computeCanSettle(a, uid, isAdmin, status),
  };
}

export async function activityDetail(
  a: Activity,
  uid: string | null
): Promise<ActivityDetail> {
  const regs = await listRegistrations(a.id);
  const stats = computeStats(regs);
  const userIds = regs.map((r) => r.user_id);
  const [users, attendance, titleMap] = await Promise.all([
    getUsersByIds(userIds),
    listAttendance(a.id),
    rosterTitles(a, userIds),
  ]);
  const roster: RosterEntry[] = regs.map((registration) => {
    const t = titleMap.get(registration.user_id);
    return {
      registration,
      user: users.get(registration.user_id) ?? null,
      title: t?.title ?? null,
      score: t?.score ?? null,
      attendance: attendance.get(registration.user_id) ?? null,
    };
  });
  const myRegistration = uid
    ? regs.find((r) => r.user_id === uid) ?? null
    : null;
  const nonDeclined = regs.filter(
    (r) => r.participation_status !== "declined"
  ).length;
  const status = refineStatus(a, nonDeclined);

  // 并行取团体信息、当前用户、成员关系（减少串行 DB 往返）
  const [group, me, isMember] = await Promise.all([
    a.group_id ? getGroupSummary(a.group_id) : Promise.resolve(null),
    uid ? getUser(uid) : Promise.resolve(null),
    uid && a.group_id ? isGroupMember(a.group_id, uid) : Promise.resolve(true),
  ]);
  const isAdmin = !!me?.is_admin;

  const canSettle = await computeCanSettle(a, uid, isAdmin, status);
  const canRegister =
    (status === "open" || status === "upcoming") &&
    (!a.group_id || a.visibility === "public" || isMember);
  const myTitle = uid ? titleMap.get(uid)?.title ?? null : null;

  return {
    activity: { ...a, status },
    roster,
    stats,
    probability: successProbability(stats, a.target_participants),
    stillNeeded: stillNeeded(stats, a.target_participants),
    myRegistration,
    isMine: uid != null && a.creator_id === uid,
    group,
    canSettle,
    canRegister,
    myTitle,
  };
}
