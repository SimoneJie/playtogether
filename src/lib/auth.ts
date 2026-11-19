// Lightweight identity via an httpOnly cookie (nickname-only, no password).
// SERVER ONLY — do not import from client components.

import { cookies } from "next/headers";

export const UID_COOKIE = "pt_uid";

export async function getUid(): Promise<string | null> {
  const store = await cookies();
  return store.get(UID_COOKIE)?.value ?? null;
}
