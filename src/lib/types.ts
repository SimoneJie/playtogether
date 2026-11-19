// Shared types. This file has no runtime imports and is safe to import from client components.

export interface User {
  id: string;
  nickname: string;
  avatar: string;
  color: string;
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
  | "cancelled";

/** Activity enriched with computed status/stats, returned by the list/detail APIs. */
export interface ActivityView extends Omit<Activity, "status"> {
  status: ActivityStatus;
  stats: ActivityStats;
  probability: number | null;
  stillNeeded: number | null;
  registrationCount: number;
  myStatus: ParticipationStatus | null;
  isMine: boolean;
}

export interface RosterEntry {
  registration: Registration;
  user: User | null;
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
}
