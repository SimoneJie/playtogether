// 称号（Title）相关纯函数。Client-safe。

export interface TitleRule {
  min: number;
  max: number | null;
  name: string;
  emoji: string;
}

/** 根据积分在给定规则中匹配称号（规则需按 min 升序、覆盖全区间）。 */
export function titleForScore(
  score: number,
  rules: TitleRule[]
): { name: string; emoji: string } {
  const sorted = [...rules].sort((a, b) => a.min - b.min);
  for (const r of sorted) {
    if (score >= r.min && (r.max == null || score <= r.max)) {
      return { name: r.name, emoji: r.emoji };
    }
  }
  // 兜底：低于最小或高于全部时取首/末规则
  if (sorted.length === 0) return { name: "新成员", emoji: "🌱" };
  const last = sorted[sorted.length - 1];
  const first = sorted[0];
  if (score < first.min) return { name: first.name, emoji: first.emoji };
  return { name: last.name, emoji: last.emoji };
}

/** 校验称号规则：不允许重叠、必须覆盖 0 到无穷。 */
export function validateTitleRules(rules: TitleRule[]): string | null {
  if (rules.length === 0) return "至少需要一条称号规则";
  const sorted = [...rules].sort((a, b) => a.min - b.min);
  if (sorted[0].min > 0) return "称号规则必须从 0 分开始覆盖";
  for (const r of sorted) {
    if (r.max != null && r.max < r.min) return `称号「${r.name}」的区间无效`;
  }
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    if (cur.max == null) {
      if (next) return `称号「${cur.name}」已覆盖到最高分，不能有后续区间`;
      return null;
    }
    if (!next) return "最后一个称号规则的上限必须为空（覆盖最高分）";
    if (next.min > cur.max + 1) {
      return `积分 ${cur.max + 1}–${next.min - 1} 没有被任何称号覆盖`;
    }
    if (next.min <= cur.max) {
      return `称号「${cur.name}」与「${next.name}」区间重叠`;
    }
  }
  return null;
}
