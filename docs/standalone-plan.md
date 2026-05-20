# `/money` 独立化方案

## 目标

把 JeecgBoot 中基金/保险问答页面拆成一个可独立部署的小项目：

- 前端页面独立，不再依赖 JeecgBoot Vue 工程、菜单、登录态、`defHttp`。
- 接口独立，不再依赖 Spring Boot、MySQL、`Result` Java 类。
- 数据独立，迁入 Supabase Postgres。
- 发布链路为 GitHub -> Vercel，数据和审核在 Supabase。

## 当前功能盘点

旧项目涉及文件：

- 前端路由：`jeecgboot-new-vue3/src/router/routes/mainOut.ts`
- 首页：`jeecgboot-new-vue3/src/views/money/MoneyQaHome.vue`
- 详情页：`jeecgboot-new-vue3/src/views/money/MoneyQaDetail.vue`
- API 封装：`jeecgboot-new-vue3/src/views/money/money.api.ts`
- 后端接口：`jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/demo/money/controller/MoneyQaController.java`

旧接口：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/money/qa/home` | 首页统计、热门问题、最新问题、话题、作者 |
| GET | `/money/qa/questions` | 问题列表，支持 category、keyword、tag、sort |
| GET | `/money/qa/questions/{questionId}` | 问题详情 |
| POST | `/money/qa/ask` | 提交问题，旧实现是 mock |

旧数据来源：

- MySQL 表：`zhihu_content`
- 过滤：`source_keyword in ('基金', '保险')`
- 分类映射：`基金 -> fund`，`保险 -> insurance`

## 新架构

```text
用户浏览器
  |
  | /money, /money/q/:id
  v
Vercel / Next.js
  |
  | Route Handlers: /money/qa/*
  v
Supabase Postgres
```

为什么选 Next.js 而不是继续 Vue：

- Vercel 对 Next.js 的页面和 API Routes 支持最直接，适合“页面 + 接口”打包成一个小项目。
- 不需要额外维护 Express/Nest/Spring 服务。
- 当前功能偏展示和轻提交，Next.js Route Handler 足够承载。

## 数据模型

正式表：

- `money_questions`：发布后的问题
- `money_answers`：回答
- `money_experts`：作者/专家
- `money_question_submissions`：用户提交，默认待审核

审核流：

1. 用户在页面提交问题。
2. API 写入 `money_question_submissions`，状态为 `pending`。
3. 你在 Supabase Table Editor 里审核。
4. 审核通过后，可以手动转成 `money_questions`，后续再做后台按钮自动化。

## 迁移步骤

1. 本地确认项目能启动。
2. 在 Supabase 执行 `supabase/schema.sql`。
3. 可先执行 `supabase/seed.sql` 验证页面和接口。
4. 从旧 MySQL 导出 `zhihu_content` 中基金/保险数据。
5. 导入到 Supabase 临时表，再执行 `supabase/import-from-jeecg.sql`。
6. 把 `money-qa-standalone` 作为新仓库根目录提交 GitHub。
7. Vercel Import GitHub 仓库，配置环境变量并部署。

## 环境变量

| 名称 | 用途 | 是否可公开 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 可以 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端读写 Supabase | 不可以 |
| `NEXT_PUBLIC_SITE_URL` | 站点地址，后续 SEO/分享用 | 可以 |

## 后续增强

- 加 `/admin` 管理页：审核提交、发布回答、编辑标签。
- 给 `/money/qa/ask` 加频控和验证码，避免公开站被刷。
- 把详情页改成服务端取数，补 metadata，增强 SEO。
- 加免责声明、隐私政策、反馈入口。
- 如果内容量变大，把关键词搜索换成 Supabase full-text search。
