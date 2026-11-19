"use client";

import { useState, type FormEvent } from "react";
import { useUser } from "./user-context";
import { Button } from "./ui";

export default function Onboarding() {
  const { refresh } = useUser();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const name = nickname.trim();
    if (!name) {
      setError("请输入昵称");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: name }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "出错了，请重试");
        return;
      }
      await refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary-50 to-page">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center text-3xl shadow-card">
            🏸
          </div>
          <h1 className="mt-4 text-2xl font-bold text-ink">一起玩</h1>
          <p className="mt-1 text-sm text-soft">让每一次相聚都有回应</p>
        </div>
        <form
          onSubmit={submit}
          className="rounded-card bg-white p-6 shadow-card border border-gray-100 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              你的昵称
            </label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={24}
              autoFocus
              placeholder="例如：阿伟 / 小美"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full" size="lg">
            {submitting ? "进入中…" : "进入活动大厅"}
          </Button>
          <p className="text-xs text-center text-soft">
            无需注册，填写昵称即可加入本群的活动
          </p>
        </form>
      </div>
    </div>
  );
}
