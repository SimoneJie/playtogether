import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Shell from "@/components/shell";

export const metadata: Metadata = {
  title: "一起玩 PlayTogether · 群活动报名",
  description:
    "轻量级群活动组织与报名平台：快速发起活动、报名参加、表达意向、掌握成行概率。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
