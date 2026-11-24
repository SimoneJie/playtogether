# Pages — component dependency trees

## / (Home / Activity Hall)
Entry: `src/components/home-page.tsx`
Dependencies:
- `src/components/activity-card.tsx`
  - `src/components/ui.tsx`
  - `src/lib/activity.ts`
  - `src/lib/use-hydrated.ts`
- `src/components/ui.tsx`
- `src/lib/activity.ts`
- `src/lib/cn.ts`
Renders: gradient hero (🏸 约一场活动 / 这个周末，约起来！/ CTA 发起新活动·查看历史·我的团体), horizontal category chips, 4-tab bar (全部/本周/我发起的/我参与的), responsive 2-col ActivityCard grid.

## /activity/[id] (Activity Detail)
Entry: `src/components/activity-detail-page.tsx`
Dependencies:
- `src/components/probability-bar.tsx`
- `src/components/title-badge.tsx`
- `src/components/settle-panel.tsx`
- `src/components/ui.tsx`
- `src/lib/activity.ts`
- `src/lib/use-hydrated.ts`
- `src/components/user-context.tsx`
- `src/lib/cn.ts`
Renders: back link, header card (cover emoji, category/status/group/visibility badges, title, share), meta grid (time/location/organizer/deadline/cost), description, stats card (确定/暂定/不参加 + expected + ProbabilityBar), amber SettlePanel when organizer & pending, "我的报名" card (register form / status), roster (titles visible, scores private), creator/admin actions.

## /groups (My Groups)
Entry: `src/components/groups-page.tsx`
Dependencies: `src/components/ui.tsx`, `src/components/title-badge.tsx`, `src/components/user-context.tsx`, `src/lib/activity.ts`, `src/lib/cn.ts`
Renders: title + 创建团体 button, create form (name/description), join-by-invite-code card, list of group cards (avatar, name, 会长 badge, TitleBadge, member count, my score), empty state.

## /groups/[id] (Group Detail)
Entry: `src/components/group-detail-page.tsx`
Dependencies:
- `src/components/activity-card.tsx`
- `src/components/ui.tsx`
- `src/components/title-badge.tsx`
- `src/components/user-context.tsx`
- `src/lib/activity.ts`
- `src/lib/titles.ts`
- `src/lib/cn.ts`
Renders: green gradient group header (avatar, name, 会长 badge, member count, my score, TitleBadge, description, announcement), 4-tab bar (活动/成员/积分榜/设置), activity grid, member list (TitleBadge, leave, owner actions), ranking (rank + title, scores private), settings (group info, invites, title-rule editor).

## /me (Profile)
Entry: `src/components/profile-page.tsx`
Dependencies: `src/components/activity-card.tsx`, `src/components/ui.tsx`, `src/components/title-badge.tsx`, `src/components/user-context.tsx`, `src/lib/activity.ts`, `src/lib/cn.ts`
Renders: profile card (avatar, editable nickname, signature, 3-stat strip, logout), 我的团体 list, 我发起的 / 我参与的 activity grids, 积分明细 ledger.
