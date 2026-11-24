"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "primary"
  | "secondary"
  | "accent"
  | "ghost"
  | "danger"
  | "dangerSolid"
  | "outline";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-600",
  secondary: "bg-primary-50 text-primary-700 hover:bg-primary-100",
  accent: "bg-accent text-white hover:bg-accent-600",
  ghost: "text-soft hover:bg-gray-100",
  danger: "bg-red-50 text-red-600 hover:bg-red-100",
  dangerSolid: "bg-red-600 text-white hover:bg-red-700",
  outline: "border border-gray-200 text-ink hover:bg-gray-50",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "确定",
  cancelText = "取消",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/45 flex items-center justify-center p-4"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {description && (
          <div className="mt-2 text-sm text-soft leading-relaxed">{description}</div>
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-ink hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              "flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 " +
              (destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary hover:bg-primary-600")
            }
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-2 text-left"
    >
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {hint && <span className="block text-xs text-soft mt-0.5">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-gray-200"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </span>
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-gray-200 border-t-primary h-8 w-8",
        className
      )}
    />
  );
}

export function LoadingScreen() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card bg-white border border-dashed border-gray-200 px-6 py-12 text-center">
      {icon && (
        <div className="mx-auto mb-3 w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-ink">{title}</h3>
      {desc && <p className="mt-1 text-sm text-soft">{desc}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
