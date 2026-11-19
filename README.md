# 一起玩 PlayTogether

轻量级「群活动组织与报名平台」——单一固定群组，链接进来填昵称即可用。

## 技术栈

- Next.js 16（App Router）+ TypeScript + Tailwind CSS v4
- PostgreSQL（Supabase，免费档）· 驱动 `pg`
- 部署：Vercel（免费档）
- Lucide 图标

## 已实现功能（V1.0 / P0）

- 昵称登录（无密码，httpOnly Cookie 记住身份；**同名昵称=同一账号**）
- 单一活动大厅：全部 / 本周 / 我发起的 / 我参与的
- 活动创建 / 详情 / 编辑 / 取消（发起人）
- 三态报名：确定参加 / 暂定参加 / 不参加
- **暂定参加可表达 10–90% 参加概率**（滑杆）
- 成行概率 = 预计参与人数 ÷ 目标人数（规则计算，非 AI）
- 历史活动（按类型 / 月份筛选）
- 个人中心（改昵称、我发起的 / 我参与的 / 我暂定的）
- PC / 手机响应式（底部导航、触屏按钮）

## 本地运行

```bash
npm install
cp .env.example .env    # 然后填入你的 Supabase 连接串
npm run dev             # http://localhost:3000
```

> 数据库表会在首次请求时自动创建（`CREATE TABLE IF NOT EXISTS`）。

## 部署到 Vercel + Supabase（免费）

1. **Supabase**：创建免费项目 → Settings → Database → Connection string，复制 **Transaction pooler**（端口 6543）连接串。
2. **本地验证**：把连接串填到 `.env` 的 `DATABASE_URL`，`npm run dev` 跑一遍。
3. **GitHub**：把本目录推到一个 GitHub 仓库。
4. **Vercel**：Import 该 GitHub 仓库 → 环境变量加 `DATABASE_URL`（值为连接串）→ Deploy。
5. 部署完成后，把 Vercel 分配的域名发给群友即可。

## 核心公式

- 预计参与人数 = Σ（各成员「同行人数 × 参加概率」），确定=100%、暂定=滑杆值、不参加=0%
- 成行概率 = min(100, round(100 × 预计参与 ÷ 目标人数))
- 还差 N 人 = max(0, ceil(目标 − 预计参与))
