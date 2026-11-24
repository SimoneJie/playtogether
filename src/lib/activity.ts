// Pure helpers for activity status, stats, probability and formatting.
// Client-safe: no Node/server-only imports.

import type {
  Activity,
  Registration,
  ActivityStats,
  ActivityStatus,
  Visibility,
} from "./types";

/** Minimal shape both `Activity` and `ActivityView` satisfy, for status helpers. */
export type ActivityLike = Pick<
  Activity,
  "start_time" | "end_time" | "deadline" | "settlement_status"
> & { status: ActivityStatus };

export const CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: "羽毛球", label: "羽毛球", emoji: "🏸" },
  { value: "KTV", label: "KTV", emoji: "🎤" },
  { value: "聚餐", label: "聚餐", emoji: "🍽️" },
  { value: "桌游", label: "桌游", emoji: "🎲" },
  { value: "徒步", label: "徒步", emoji: "🥾" },
  { value: "电影", label: "电影", emoji: "🎬" },
  { value: "旅行", label: "旅行", emoji: "✈️" },
  { value: "游戏", label: "游戏", emoji: "🎮" },
  { value: "购物", label: "购物", emoji: "🛍️" },
  { value: "拼单", label: "拼单", emoji: "🛒" },
  { value: "其他", label: "其他", emoji: "📅" },
];

export function categoryEmoji(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.emoji ?? "📅";
}

export const COVER_EMOJIS = ["🏸", "🎤", "🍽️", "🎲", "🥾", "🎬", "✈️", "🍵", "⚽", "🏀", "🎮", "🎉", "🍢", "🚴", "🧗", "🎯", "🛍️", "🛒"];

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  open: "报名中",
  upcoming: "即将开始",
  deadline_passed: "已截止",
  ended: "已结束",
  pending_settlement: "待结算",
  settled: "已结算",
  not_held: "未成行",
  cancelled: "已取消",
};

export const STATUS_BADGE: Record<ActivityStatus, string> = {
  open: "bg-primary-50 text-primary-700",
  upcoming: "bg-accent-50 text-accent-600",
  deadline_passed: "bg-gray-100 text-gray-500",
  ended: "bg-gray-100 text-gray-400",
  pending_settlement: "bg-amber-50 text-amber-600",
  settled: "bg-primary-50 text-primary-700",
  not_held: "bg-gray-100 text-gray-400",
  cancelled: "bg-red-50 text-red-500",
};

const PAST_STATUSES: ActivityStatus[] = [
  "ended",
  "cancelled",
  "deadline_passed",
  "pending_settlement",
  "settled",
  "not_held",
];

/** Default activity duration when no end_time is provided (legacy only). */
const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

export function activityStatus(a: ActivityLike, now = Date.now()): ActivityStatus {
  if (a.status === "cancelled") return "cancelled";
  if (a.settlement_status === "not_held") return "not_held";
  if (a.settlement_status === "settled") return "settled";
  const end = a.end_time ?? a.start_time + DEFAULT_DURATION_MS;
  if (now > end) return "pending_settlement";
  if (a.deadline != null && now > a.deadline) return "deadline_passed";
  if (now >= a.start_time - 24 * 60 * 60 * 1000) return "upcoming";
  return "open";
}

/**
 * Whether an activity is no longer in the "current" hall.
 * 已截止 / 待结算 / 已结算 / 未成行 也视为过去，归入历史。
 */
export function isPast(a: ActivityLike, now = Date.now()): boolean {
  return PAST_STATUSES.includes(activityStatus(a, now));
}

export function computeStats(regs: Registration[]): ActivityStats {
  let confirmed = 0;
  let tentative = 0;
  let declined = 0;
  let expected = 0;
  let goingCount = 0;
  let tentativeCount = 0;
  for (const r of regs) {
    const n = Math.max(1, r.participant_count || 1);
    if (r.participation_status === "declined") {
      declined += n;
      continue;
    }
    if (r.participation_status === "going") {
      confirmed += n;
      expected += n;
      goingCount += 1;
    } else if (r.participation_status === "tentative") {
      tentative += n;
      expected += (n * (r.probability ?? 50)) / 100;
      tentativeCount += 1;
    }
  }
  return { confirmed, tentative, declined, expected, goingCount, tentativeCount };
}

/** Rule-based success probability (0–100), null when no target is set. */
export function successProbability(
  stats: ActivityStats,
  target: number | null
): number | null {
  if (!target || target <= 0) return null;
  const p = Math.round((stats.expected / target) * 100);
  if (p <= 0) return 0;
  if (p >= 100) {
    // 只有「确定参加」人数本身已达标时，成行概率才是 100%。
    // 若达标依赖「暂定参加」的预期贡献，则存在不确定性，永不显示 100%。
    return stats.confirmed >= target ? 100 : 99;
  }
  return p;
}

/** How many more people are needed to reach the target (0 when reached). */
export function stillNeeded(
  stats: ActivityStats,
  target: number | null
): number | null {
  if (!target || target <= 0) return null;
  return Math.max(0, Math.ceil(target - stats.expected));
}

export function isThisWeek(ms: number, now = Date.now()): boolean {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return ms >= start && ms < end;
}

// ---------- formatting (local time) ----------

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "11月21日 周六 · 14:00" */
export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "2025年11月21日 周六" */
export function formatFullDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`;
}

/** "14:00" or "14:00 - 17:00" */
export function formatTimeRange(start: number, end: number | null): string {
  const s = new Date(start);
  const hm = (x: Date) => `${pad(x.getHours())}:${pad(x.getMinutes())}`;
  return end ? `${hm(s)} - ${hm(new Date(end))}` : `${hm(s)} 开始`;
}

/** "3 小时" / "1 小时 30 分钟" / "45 分钟" */
export function formatDuration(start: number, end: number | null): string | null {
  if (!end || end <= start) return null;
  const mins = Math.round((end - start) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} 分钟`;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分钟`;
}

/** 可见范围标签 */
export function visibilityLabel(v: Visibility): string {
  return v === "public" ? "全员可见" : "仅团体成员";
}

/** 积分显示：整数不带小数，小数保留 1 位 */
export function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
