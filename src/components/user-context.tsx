"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Group, PendingSettlement, User } from "@/lib/types";

interface UserCtx {
  user: User | null;
  groups: Group[];
  pendingSettlements: PendingSettlement[];
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const Ctx = createContext<UserCtx>({
  user: null,
  groups: [],
  pendingSettlements: [],
  loading: true,
  refresh: async () => {},
  setUser: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingSettlements, setPendingSettlements] = useState<
    PendingSettlement[]
  >([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      const d = await r.json();
      setUser(d.user ?? null);
      setGroups(d.groups ?? []);
      setPendingSettlements(d.pendingSettlements ?? []);
    } catch {
      // keep current user on network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Ctx.Provider
      value={{ user, groups, pendingSettlements, loading, refresh, setUser }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useUser(): UserCtx {
  return useContext(Ctx);
}
