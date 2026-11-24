// Shared types. This file has no runtime imports and is safe to import from client components.

export interface User {
  id: string;
  nickname: string;
  /** 个性签名（可选），报名名单中显示在名字后面 */
  signature: string;
  avatar: string;
  color: string;
  /** 是否为管理员（可删除活动、查看全站） */
  is_admin: boolean;
  created_at: number;
}

export type ParticipationStatus = "going" | "tentative" | "declined";

export interface Registration {
  id: string;
  activity_id: string;
  user_id: string;
  participation_status: ParticipationStatus;
  /** 0–100; going=100, declined=0, tentative=user chosen */
  probability: number;
  participant_count: number;
  remark: string;
  updated_at: number;
}

/** 活动可见范围：团体内部 / 全站公开 */
export type Visibility = "group" | "public";

/** 已结算结果：已结算（成行）/ 未成行（不计分） */
export type SettlementStatus = "settled" | "not_held";

export interface Activity {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  start_time: number;
  end_time: number | null;
  deadline: number | null;
  target_participants: number | null;
  max_participants: number | null;
  expected_cost: string;
  cover: string;
  allow_tentative: boolean;
  allow_status_change: boolean;
  public_roster: boolean;
  /** 报名是否需要密码 */
  require_password: boolean;
  /** 所属团体；null = 全站独立活动（历史/公开活动） */
  group_id: string | null;
  /** 可见范围；团体活动默认 group */
  visibility: Visibility;
  /** 结算结果；null = 尚未结算 */
  settlement_status: SettlementStatus | null;
  settled_at: number | null;
  status: "open" | "cancelled";
  creator_id: string;
  created_at: number;
}

export interface ActivityStats {
  /** headcount of confirmed (going) participants, incl. +N */
  confirmed: number;
  /** headcount of tentative participants, incl. +N */
  tentative: number;
  /** headcount of declined participants */
  declined: number;
  /** expected participants = Σ (count × probability) */
  expected: number;
  goingCount: number;
  tentativeCount: number;
}

export type ActivityStatus =
  | "open"
  | "upcoming"
  | "deadline_passed"
  | "ended"
  | "pending_settlement"
  | "settled"
  | "not_held"
  | "cancelled";

export interface TitleTag {
  name: string;
  emoji: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  avatar: string;
}

/** 团体（含当前用户视角的积分/称号）。 */
export interface Group extends GroupSummary {
  description: string;
  announcement: string;
  owner_id: string;
  created_at: number;
  member_count: number;
  my_role: "owner" | "member";
  my_score: number;
  my_title: TitleTag;
  on_leave: boolean;
  leave_title: string;
  leave_until: number | null;
}

export interface GroupMemberView {
  user: User;
  score: number;
  title: TitleTag;
  on_leave: boolean;
  leave_title: string;
  leave_until: number | null;
  is_owner: boolean;
  joined_at: number;
}

export interface GroupInvite {
  id: string;
  group_id: string;
  code: string;
  expires_at: number | null;
  max_uses: number | null;
  used_count: number;
  enabled: boolean;
  created_at: number;
}

/** 管理员视角的团体列表项（不要求是成员）。 */
export interface AdminGroup {
  id: string;
  name: string;
  avatar: string;
  description: string;
  owner_id: string;
  owner_nickname: string;
  member_count: number;
  created_at: number;
}

export interface CreditEntry {
  id: string;
  group_id: string;
  user_id: string;
  activity_id: string | null;
  activity_title: string | null;
  change_amount: number;
  balance_after: number;
  reason: string;
  created_at: number;
}

export interface TitleRuleDTO {
  min: number;
  max: number | null;
  name: string;
  emoji: string;
}

export interface MyMembership {
  group: GroupSummary;
  score: number;
  title: TitleTag;
  on_leave: boolean;
  leave_title: string;
  leave_until: number | null;
}

export interface PendingSettlement {
  activity_id: string;
  title: string;
  start_time: number;
  end_time: number | null;
  signup_count: number;
  group_id: string | null;
  group_name: string | null;
}

/** Activity enriched with computed status/stats, returned by the list/detail APIs. */
export interface ActivityView extends Omit<Activity, "status"> {
  status: ActivityStatus;
  stats: ActivityStats;
  probability: number | null;
  stillNeeded: number | null;
  registrationCount: number;
  myStatus: ParticipationStatus | null;
  isMine: boolean;
  group: GroupSummary | null;
  /** 当前用户是否可以结算（组织者或管理员） */
  canSettle: boolean;
}

export interface RosterEntry {
  registration: Registration;
  user: User | null;
  /** 该成员在本活动语境下的称号（团体活动=本团体称号；公开/独立=最高分团体默认称号） */
  title: TitleTag | null;
  /** 该成员在本活动语境下的积分（仅团体活动有） */
  score: number | null;
  /** 实际出勤（已结算时） */
  attendance: "attended" | "absent" | null;
}

/** Full activity-detail payload returned by GET /api/activities/[id]. */
export interface ActivityDetail {
  activity: Omit<Activity, "status"> & { status: ActivityStatus };
  roster: RosterEntry[];
  stats: ActivityStats;
  probability: number | null;
  stillNeeded: number | null;
  myRegistration: Registration | null;
  isMine: boolean;
  group: GroupSummary | null;
  canSettle: boolean;
  canRegister: boolean;
  myTitle: TitleTag | null;
}
