"use client";

import { useState, type FormEvent } from "react";
import { useUser } from "./user-context";
import { Button } from "./ui";
import { cn } from "@/lib/cn";
import { SITE_NAME_EN, SITE_NAME_ZH } from "@/lib/site";

type Mode = "login" | "register";

const inputCls =
  "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

export default function Onboarding() {
  const { refresh } = useUser();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (!name) {
      setError("请输入用户名");
      return;
    }
    if (mode === "register") {
      if (name.length < 2) {
        setError("用户名至少 2 个字符");
        return;
      }
      if (password.length < 6) {
        setError("密码至少 6 位");
        return;
      }
      if (password !== confirm) {
        setError("两次输入的密码不一致");
        return;
      }
    } else if (!password) {
      setError("请输入密码");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const r = await fetch(
        mode === "register" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: name, password }),
        }
      );
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
          <h1 className="mt-4 text-2xl font-bold text-ink">{SITE_NAME_ZH}</h1>
          <p className="mt-1 text-xs font-semibold tracking-wider text-soft uppercase">
            {SITE_NAME_EN}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-card bg-white p-6 shadow-card border border-gray-100 space-y-4"
        >
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={cn(
                  "rounded-lg py-2 text-sm font-medium transition-colors",
                  mode === m
                    ? "bg-white text-primary shadow-sm"
                    : "text-soft hover:text-ink"
                )}
              >
                {m === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              用户名
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              autoFocus
              placeholder="例如：阿伟"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={64}
              placeholder={mode === "register" ? "至少 6 位" : "请输入密码"}
              className={inputCls}
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                确认密码
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                maxLength={64}
                placeholder="再输入一次密码"
                className={inputCls}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full"
            size="lg"
          >
            {submitting
              ? "请稍候…"
              : mode === "register"
                ? "注册并进入"
                : "登录"}
          </Button>

          <p className="text-xs text-center text-soft">
            {mode === "register"
              ? "首次使用？切到「注册」创建账号"
              : "还没有账号？切到「注册」创建"}
          </p>
        </form>
      </div>
    </div>
  );
}
