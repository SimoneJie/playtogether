"use client";

import { useEffect, useState } from "react";

/**
 * Returns true once the component has mounted on the client. Use it to gate
 * time/date formatting so server and client render identical HTML (avoids
 * hydration mismatches when the server's timezone differs from the browser's).
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
