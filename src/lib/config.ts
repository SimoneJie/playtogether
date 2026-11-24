// 平台可配置的积分 / 称号参数（集中管理，避免散落硬编码）。
// Client-safe: no server-only imports.

export const CREDIT_CONFIG = {
  /** 新成员初始积分 */
  INITIAL_SCORE: 100,
  /** 实际参加的基础奖励 X */
  BASE_REWARD: 10,
  /**
   * 缺席扣分比例（默认值）：缺席扣分 = X × 系数 × 参加概率。
   * 每个团体可由会长在 0.1~1.5 之间自定义，见 PENALTY_RATIO_RANGE。
   */
  PENALTY_RATIO: 0.7,
  /** 活动组织者（发起人）额外奖励（活动正常成行结算后发放） */
  ORGANIZER_BONUS: 5,
  /** 积分最低值 */
  MIN_SCORE: 0,
} as const;

/** 会长可设置的缺席扣分系数范围（含端点）。 */
export const PENALTY_RATIO_RANGE = { MIN: 0.1, MAX: 1.5 } as const;

/** 把任意输入收敛到合法的惩罚系数（保留 1 位小数），非法值回退到默认 0.7。 */
export function clampPenaltyRatio(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return CREDIT_CONFIG.PENALTY_RATIO;
  const clamped = Math.min(
    PENALTY_RATIO_RANGE.MAX,
    Math.max(PENALTY_RATIO_RANGE.MIN, n)
  );
  return Math.round(clamped * 10) / 10;
}

export const PROBABILITY = {
  DEFAULT: 50,
  MIN: 10,
  MAX: 90,
} as const;

/** 默认积分称号（全站公开区域使用）。 */
export const DEFAULT_TITLES: {
  min: number;
  max: number | null;
  name: string;
  emoji: string;
}[] = [
    { min: 0, max: 79, name: "鸽子观察员", emoji: "🕊️" },
    { min: 80, max: 99, name: "蓄能选手", emoji: "🔋" },
    { min: 100, max: 119, name: "活动新秀", emoji: "🌱" },
    { min: 120, max: 149, name: "气氛担当", emoji: "🎉" },
    { min: 150, max: 199, name: "活动王", emoji: "👑" },
    { min: 200, max: null, name: "活动传奇", emoji: "🏆" },
  ];

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
