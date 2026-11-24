# Routes — PlayTogether 8333

Next.js App Router (src/app). All pages are client components rendered inside a shared `Shell` (UserProvider + Nav + main).

| URL | File | Layout | Notes |
|---|---|---|---|
| `/` | `src/app/page.tsx` → `src/components/home-page.tsx` | Shell | Activity hall: hero, category chips, tabs (全部/本周/我发起的/我参与的), activity card grid |
| `/history` | `src/app/history/page.tsx` → `src/components/history-page.tsx` | Shell | Past activities |
| `/new` | `src/app/new/page.tsx` → `src/components/activity-form.tsx` | Shell | Create activity form (group selector, visibility, start/end required, deadline) |
| `/activity/[id]` | `src/app/activity/[id]/page.tsx` → `src/components/activity-detail-page.tsx` | Shell | Detail: header, stats, settle panel, my registration, roster (titles private scores), creator/admin actions |
| `/activity/[id]/edit` | `src/app/activity/[id]/edit/page.tsx` → `src/components/edit-activity-page.tsx` | Shell | Edit form |
| `/groups` | `src/app/groups/page.tsx` → `src/components/groups-page.tsx` | Shell | My groups list, create group, join by invite code |
| `/groups/[id]` | `src/app/groups/[id]/page.tsx` → `src/components/group-detail-page.tsx` | Shell | Group header + tabs 活动/成员/积分榜/设置 |
| `/groups/join` | `src/app/groups/join/page.tsx` → `src/components/join-group-page.tsx` | Shell | Invite confirmation + join |
| `/admin` | `src/app/admin/page.tsx` → `src/components/admin-page.tsx` | Shell | Admin: all activities with filters |
| `/me` | `src/app/me/page.tsx` → `src/components/profile-page.tsx` | Shell | Profile, my groups, credit ledger, my activities |

Auth is handled inside Shell via `UserProvider` (`/api/me`); no separate auth route — unauthenticated users see `Onboarding`.
API routes live under `src/app/api/**` and are not visual.
