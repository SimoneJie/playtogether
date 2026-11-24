# Design System — PlayTogether 8333

## Product context
PlayTogether 8333（8333总有好活动 / playTogether8333）是一个面向熟人、朋友群和兴趣圈子的活动组织与成员管理平台。
核心用户旅程：团体创建 → 邀请码加入 → 发起活动 → 成员报名（确定/可能+概率）→ 活动结束后确认出勤 → 积分结算 → 称号晋升。
关键页面：活动大厅（首页）、活动详情、创建活动、我的团体、团体详情（活动/成员/积分榜/设置）、历史、个人中心、管理员。
目标：让活动更容易组织，让报名更可信，让积极参与的人获得认可。界面应“简单、有趣、友好”，有周末约活动的生活感，而不是冷冰冰的企业后台。

## Branding & visual style
- 主色：绿色（primary #267a50），代表活力、健康、周末户外；渐变 hero 使用 primary → primary-700。
- 辅色：暖橙（accent #f4a261），用于强调、暂定、排行榜高亮、成功概率。
- 中性色：页面底色 #f5f7f5（极浅绿灰），卡片白 #ffffff，正文 ink #1f2937，次要 soft #6b7280，分割线 #e5e7eb。
- 字体：Inter + PingFang SC / Microsoft YaHei / Noto Sans SC；标题 bold，正文 regular；不使用衬线或装饰字体。
- 圆角：卡片 16px（--radius-card），按钮/输入 12px，徽章/胶囊 full。
- 阴影：卡片柔和双层阴影（0 1px 2px + 0 4px 16px，低透明度），悬浮时略增强。
- 布局：移动优先；桌面 max-w-6xl 居中；顶部 sticky 导航（桌面）+ 底部 4 个 tab（移动）；卡片式分区。
- 气质：清爽、温暖、可信赖；大量留白；以 emoji（🏸🎉🕊️👑）做轻量视觉点缀。

## Design direction for this iteration
在保留现有品牌（绿色主色 + 暖橙辅色 + 白卡片 + 16px 圆角）的前提下，整体提升视觉精致度与层级：
- 更清晰的排版层级（标题更大更稳、正文更易读、辅助信息更克制）。
- 更统一的间距节奏与卡片内边距。
- 更精致的徽章/标签/按钮/输入控件。
- Hero 区更有活动氛围（渐变、光感、留白），但保持轻量。
- 移动端更舒适（触控尺寸、字段不遮挡）。
不改变品牌色，不引入新的字体或颜色体系。

## Constraints
Use ONLY the fonts, colors, spacing, and component styles defined in this design system. Do not introduce any fonts, colors, or visual styles not in the design system.
