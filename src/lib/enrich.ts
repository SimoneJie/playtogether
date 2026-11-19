// Server-only helpers that turn raw rows into API payloads.
import { listRegistrations, getUser } from "./db";
import {
  computeStats,
  successProbability,
  stillNeeded,
  activityStatus,
} from "./activity";
import type { Activity, ActivityDetail, RosterEntry } from "./types";

export async function activityDetail(
  a: Activity,
  uid?: string | null
): Promise<ActivityDetail> {
  const regs = await listRegistrations(a.id);
  const stats = computeStats(regs);
  const roster: RosterEntry[] = await Promise.all(
    regs.map(async (registration) => ({
      registration,
      user: await getUser(registration.user_id),
    }))
  );
  const myRegistration = uid
    ? regs.find((r) => r.user_id === uid) ?? null
    : null;
  return {
    activity: { ...a, status: activityStatus(a) },
    roster,
    stats,
    probability: successProbability(stats, a.target_participants),
    stillNeeded: stillNeeded(stats, a.target_participants),
    myRegistration,
    isMine: uid != null && a.creator_id === uid,
  };
}
