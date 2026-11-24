# Layouts — shared shell & navigation

## Nav — `src/components/nav.tsx`
Desktop: sticky top header (logo 🏸 + 8333总有好活动 + nav 活动/团体/历史/我的 + admin 管理 + "发起活动" CTA + avatar + logout).
Mobile: top bar (logo + admin + avatar); fixed bottom nav with 4 items (活动/团体/历史/我的).
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "./user-context";
import { cn } from "@/lib/cn";
import { Home, Users, History, Plus, User as UserIcon, LogOut, Shield } from "lucide-react";
import { SITE_NAME_EN, SITE_NAME_ZH } from "@/lib/site";

const NAV = [
  { href: "/", label: "活动", icon: Home },
  { href: "/groups", label: "团体", icon: Users },
  { href: "/history", label: "历史", icon: History },
  { href: "/me", label: "我的", icon: UserIcon },
];

export default function Nav() {
  const pathname = usePathname();
  const { user, refresh } = useUser();
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  async function logout() { try { await fetch("/api/auth/logout", { method: "POST" }); } finally { await refresh(); } }
  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden md:block sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-lg">🏸</span>
            <span className="font-bold text-ink text-lg">{SITE_NAME_ZH}</span>
            <span className="text-xs text-soft hidden lg:inline">{SITE_NAME_EN}</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className={cn("px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(n.href) ? "text-primary bg-primary-50" : "text-soft hover:bg-gray-100")}>
                {n.label}
              </Link>
            ))}
            {user?.is_admin && (
              <Link href="/admin" className={cn("px-3.5 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1",
                isActive("/admin") ? "text-primary bg-primary-50" : "text-soft hover:bg-gray-100")}>
                <Shield size={14} /> 管理
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/new" className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-600 transition-colors">
              <Plus size={16} /> 发起活动
            </Link>
            <Link href="/me" className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ backgroundColor: user?.color ?? "#267a50" }}>{(user?.nickname ?? "?").slice(0, 1)}</Link>
            <button onClick={logout} title="退出登录" className="w-9 h-9 rounded-full flex items-center justify-center text-soft hover:bg-gray-100">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">🏸</span>
            <span className="font-bold text-ink">{SITE_NAME_ZH}</span>
          </Link>
          <div className="flex items-center gap-2">
            {user?.is_admin && (
              <Link href="/admin" className="w-8 h-8 rounded-full flex items-center justify-center text-soft hover:bg-gray-100" title="管理">
                <Shield size={16} />
              </Link>
            )}
            <Link href="/me" className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ backgroundColor: user?.color ?? "#267a50" }}>{(user?.nickname ?? "?").slice(0, 1)}</Link>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={cn("flex flex-col items-center gap-0.5 py-2.5", active ? "text-primary" : "text-soft")}>
                <Icon size={20} />
                <span className="text-[11px]">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
```

## Shell — `src/components/shell.tsx`
Wraps every page: `UserProvider` → loading screen → Onboarding (if not logged in) → Nav + `<main class="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:px-8 md:pb-16 md:pt-8">` + `PendingSettlementModal`.
```tsx
"use client";
import type { ReactNode } from "react";
import { UserProvider, useUser } from "./user-context";
import Onboarding from "./onboarding";
import Nav from "./nav";
import { PendingSettlementModal } from "./pending-settlement-modal";
import { LoadingScreen } from "./ui";

function ShellInner({ children }: { children: ReactNode }) {
  const { user, loading, pendingSettlements } = useUser();
  if (loading) return <LoadingScreen />;
  if (!user) return <Onboarding />;
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:px-8 md:pb-16 md:pt-8">{children}</main>
      <PendingSettlementModal items={pendingSettlements} />
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  return <UserProvider><ShellInner>{children}</ShellInner></UserProvider>;
}
```

## Root layout — `src/app/layout.tsx`
`<html lang="zh-CN"><body><Shell>{children}</Shell></body></html>`, metadata title "8333总有好活动 · playTogether8333", viewport themeColor `#267a50`.
