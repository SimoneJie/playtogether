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
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:px-8 md:pb-16 md:pt-8">
        {children}
      </main>
      <PendingSettlementModal items={pendingSettlements} />
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <ShellInner>{children}</ShellInner>
    </UserProvider>
  );
}
