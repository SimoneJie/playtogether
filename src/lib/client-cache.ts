// Client-safe in-memory GET cache: makes switching back to a page instant.
// TTL keeps data fresh enough for a small social app.

type Entry = { at: number; data: unknown };
const cache = new Map<string, Entry>();

export async function fetchCached<T = unknown>(
  url: string,
  ttlMs = 10000
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && now - hit.at < ttlMs) return hit.data as T;

  const r = await fetch(url, { cache: "no-store" });
  const d = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(d?.error || "请求失败");
  cache.set(url, { at: now, data: d });
  return d;
}

/** 清空（或按前缀清空）缓存；写操作成功后调用。 */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const k of Array.from(cache.keys())) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}
