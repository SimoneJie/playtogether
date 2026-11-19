# 部署指南（Vercel + Supabase + 自定义域名）

目标：免费托管 + 国内可通过自定义域名访问。

> 表结构会在**首次请求时自动创建**（`CREATE TABLE IF NOT EXISTS`），无需手动跑迁移。

## 1. 创建 Supabase 数据库（免费）

1. 打开 https://supabase.com ，用 GitHub 登录。
2. **New project**：Name 填 `playtogether`，设一个数据库密码，Region 选离你近的（如 Singapore），点 Create，等 1–2 分钟。
3. 进 **Project Settings → Database → Connection string**。
4. 复制 **Transaction pooler** 那条连接串（端口 `6543`）。

## 2.（推荐）本地冒烟测试

在本项目根目录新建 `.env`：

```
DATABASE_URL=上面复制的连接串
```

然后 `npm run dev`，打开 http://localhost:3000 试一遍完整流程。

## 3. 推送到 GitHub

```bash
cd playtogether
git push -u origin main   # 需先开启代理，因为 github.com 被墙
```

## 4. 部署到 Vercel

1. 打开 https://vercel.com ，用 GitHub 登录。
2. **Add New → Project → Import** `SimoneJie/playtogether`。
3. Framework 自动识别为 Next.js，无需改动。
4. 展开 **Environment Variables**，添加：
   - Key：`DATABASE_URL`
   - Value：上面 Supabase 连接串
5. 点 **Deploy**，等 1–2 分钟。
6. 你会得到一个 `xxx.vercel.app` 地址（国内访问不了，下一步解决）。

## 5. 绑定自定义域名（让国内能访问）

1. 在域名商买一个域名（如阿里云万网 / Namesilo，`.com` 约 ¥60/年）。
2. Vercel 项目 → **Settings → Domains** → 输入你的域名 → **Add**。
3. 按 Vercel 提示，到域名商处添加一条 CNAME 记录：`你的域名 → cname.vercel-dns.com`。
4. 等几分钟 DNS 生效后，用你的域名访问即可（服务器在境外，无需 ICP 备案）。

## 6. 分享

把「你的自定义域名」发给群友即可。
