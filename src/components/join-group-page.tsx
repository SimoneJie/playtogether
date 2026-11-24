"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Users, Check } from "lucide-react";
import { Button, LoadingScreen } from "./ui";

export default function JoinGroupPage() {
  const [code, setCode] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (c) setCode(c.toUpperCase());
    setReady(true);
  }, []);

  async function join() {
    setErr("");
    if (!code.trim()) {
      setErr("请输入邀请码");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "加入失败");
        return;
      }
      window.location.href = `/groups/${d.group.id}`;
    } catch {
      setErr("网络错误");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <LoadingScreen />;

  return (
    <div className="max-w-sm mx-auto pt-10 space-y-4">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-4 text-xl md:text-2xl font-bold tracking-tight text-ink">加入团体</h1>
        <p className="mt-1 text-sm text-soft">确认邀请码后即可加入</p>
      </div>
      <div className="rounded-2xl bg-white border border-gray-100/70 shadow-card p-5 space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={16}
          placeholder="邀请码"
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-center text-lg font-mono tracking-widest text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        {err && <p className="text-sm text-red-500">{err}</p>}
        <Button onClick={join} disabled={busy} className="w-full" size="lg">
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}{" "}
          加入团体
        </Button>
        <Link
          href="/groups"
          className="block text-center text-xs text-soft hover:text-ink"
        >
          返回我的团体
        </Link>
      </div>
    </div>
  );
}
