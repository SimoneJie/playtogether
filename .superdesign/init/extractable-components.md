# Extractable components

## NavBar (top desktop + mobile bottom nav)
- Source: `src/components/nav.tsx`
- Category: layout
- Description: Brand + primary navigation + create CTA + avatar + logout; mobile bottom tab bar.
- Extractable props: `activeItem` (string: "home" | "groups" | "history" | "me" | "admin", default "home"), `isAdmin` (boolean, default false), `userName` (string), `userColor` (string).
- Hardcoded: brand name 8333总有好活动 / playTogether8333, logo emoji 🏸, nav labels, lucide icon names, all CSS.

## AppShell / PageContainer
- Source: `src/components/shell.tsx`
- Category: layout
- Description: Max-width page container with Nav, main padding, pending-settlement modal.
- Extractable props: none (children only).
- Hardcoded: container `max-w-6xl`, paddings, background.

## ActivityCard
- Source: `src/components/activity-card.tsx`
- Category: basic
- Description: Activity tile with cover emoji, badges, title, time/location, 3-stat strip, target line, 详情 link.
- Extractable props: `title`, `category`, `status` ("open" | "upcoming" | "deadline_passed" | "ended" | "pending_settlement" | "settled" | "not_held" | "cancelled"), `confirmed`, `tentative`, `probability`, `groupName`, `visibility` ("group" | "public").
- Hardcoded: layout, colors, icon names, "详情" label.

## TitleBadge
- Source: `src/components/title-badge.tsx`
- Category: basic
- Description: Small pill with emoji + title name and optional leave title.
- Extractable props: `titleName`, `titleEmoji`, `leaveTitle`.
- Hardcoded: pill styling.

## Button / Badge / Toggle / EmptyState / LoadingScreen
- Source: `src/components/ui.tsx`
- Category: basic
- Description: Core primitives (primary/secondary/outline/ghost/danger buttons, badges, switch, empty state, loading spinner).
- Extractable props: Button `variant`, `size`; Badge `className`; Toggle `checked`; EmptyState `title`.
- Hardcoded: variants, sizes, styling.
