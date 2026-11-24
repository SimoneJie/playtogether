# Theme — PlayTogether 8333 (playTogether8333)

## Part 1 — Token summary

Framework: Next.js 16 App Router + Tailwind CSS v4 (CSS-first `@theme`, no tailwind.config.ts).
Font: Inter → system → PingFang SC / Microsoft YaHei / Noto Sans SC.
Base radius: `--radius-card: 16px`. Card shadow: `0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)`.
Page bg `#f5f7f5`, ink `#1f2937`, soft/muted `#6b7280`.

Palette (green + warm orange accent, friendly / social / weekend-activity feel):
| token | value |
|---|---|
| primary | #267a50 |
| primary-600 | #1f6a43 |
| primary-700 | #185436 |
| primary-50 | #eef6f1 |
| primary-100 | #d9ecdf |
| accent | #f4a261 |
| accent-600 | #e88b3d |
| accent-50 | #fdf1e4 |
| page | #f5f7f5 |
| ink | #1f2937 |
| soft | #6b7280 |

Typography: base text-sm/md; headings font-bold text-ink; badge text-xs; title badge text-xs.
Spacing: Tailwind 4px scale; cards `p-5 md:p-6`; gaps 3–5; page container `max-w-6xl`.
Breakpoints: default Tailwind (sm 640, md 768, lg 1024).
Icons: lucide-react (already used everywhere).

## Part 2 — Raw source

`src/app/globals.css`:
```css
@import "tailwindcss";

@theme {
  --color-primary: #267a50;
  --color-primary-600: #1f6a43;
  --color-primary-700: #185436;
  --color-primary-50: #eef6f1;
  --color-primary-100: #d9ecdf;
  --color-accent: #f4a261;
  --color-accent-600: #e88b3d;
  --color-accent-50: #fdf1e4;
  --color-page: #f5f7f5;
  --color-ink: #1f2937;
  --color-soft: #6b7280;
  --radius-card: 16px;
  --shadow-card: 0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 16px rgba(16, 24, 40, 0.06);
}

html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body {
  margin: 0; background-color: var(--color-page); color: var(--color-ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-x: hidden;
}
* { box-sizing: border-box; }
a, button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
@media (max-width: 640px) {
  input:not([type="range"]), select, textarea { font-size: 16px; }
}
input[type="date"], input[type="time"], input[type="datetime-local"] { min-height: 42px; }
```

`src/app/layout.tsx`:
```tsx
export const metadata = { title: "8333总有好活动 · playTogether8333", ... };
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 5, viewportFit: "cover", themeColor: "#267a50" };
export default function RootLayout({ children }) {
  return <html lang="zh-CN"><body><Shell>{children}</Shell></body></html>;
}
```
