// 身份校验：httpOnly Cookie 保存用户 id，配合用户名+密码登录。
// SERVER ONLY — do not import from client components.

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const UID_COOKIE = "pt_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function getUid(): Promise<string | null> {
  const store = await cookies();
  return store.get(UID_COOKIE)?.value ?? null;
}

export function setAuthCookie(res: NextResponse, userId: string): void {
  res.cookies.set(UID_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(UID_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
