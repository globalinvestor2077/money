# 金融问答独立项目

这个目录是从 JeecgBoot 里的 `/money` 页面拆出来的独立项目骨架，目标是：

- 页面和接口放在一个 Next.js 项目里，部署到 Vercel。
- 数据放在 Supabase Postgres。
- API 路径保持原来的形状：`/money/qa/home`、`/money/qa/questions`、`/money/qa/questions/:id`、`/money/qa/ask`。
- 返回结构保持 JeecgBoot 的 `Result<T>` 风格，前端迁移成本低。

## 技术选型

- Next.js App Router：页面、接口、部署一体化。
- Vercel：连接 GitHub 后自动部署，Next.js 项目在 Vercel 上是零配置主路径。
- Supabase：Postgres 数据表、RLS 策略、SQL Editor 管理初始化脚本。
- `@supabase/supabase-js`：Vercel Route Handler 服务端访问 Supabase。

参考文档：

- Vercel Next.js 部署：https://vercel.com/docs/concepts/next.js/overview
- Vercel 环境变量：https://vercel.com/docs/projects/environment-variables
- Supabase Next.js 指南：https://supabase.com/docs/guides/with-nextjs/
- Supabase 服务端 secret key 使用：https://supabase.com/docs/guides/troubleshooting/performing-administration-tasks-on-the-server-side-with-the-servicerole-secret-BYM4Fa
- Supabase SQL Editor：https://supabase.com/features/sql-editor

## 目录结构

```text
money-qa-standalone/
├── app/
│   ├── money/page.tsx                    # 问答首页
│   ├── money/q/[questionId]/page.tsx     # 问答详情
│   └── money/qa/**/route.ts              # Vercel API Routes
├── lib/
│   ├── moneyQa.ts                        # 业务查询、聚合、Result 包装
│   ├── supabaseAdmin.ts                  # Supabase 服务端 client
│   └── types.ts                          # 前后端共用类型
├── supabase/
│   ├── schema.sql                        # 建表、索引、RLS
│   ├── seed.sql                          # 示例数据
│   └── import-from-jeecg.sql             # 旧 zhihu_content 数据导入参考
└── .env.example
```

## 本地运行

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`.env.local` 里填：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的 service_role key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

注意：`SUPABASE_SERVICE_ROLE_KEY` 只能在服务端使用，不要加 `NEXT_PUBLIC_`，也不要在浏览器代码里引用。

## Supabase 初始化

1. 在 Supabase 新建项目。
2. 打开 SQL Editor，执行 `supabase/schema.sql`。
3. 可选：执行 `supabase/seed.sql` 放入两条示例问答。
4. 在 Project Settings -> API 中复制：
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - service_role secret -> `SUPABASE_SERVICE_ROLE_KEY`

当前表设计：

- `money_questions`：展示用问题，只有 `published` 会被接口读取。
- `money_answers`：回答内容，可以通过 `accepted_answer_id` 成为推荐回答。
- `money_experts`：作者/专家信息。
- `money_question_submissions`：用户提交的问题，默认 `pending`，后续人工审核。

## 从旧项目迁移数据

旧接口现在读取的是 JeecgBoot MySQL 表 `zhihu_content`，过滤条件是：

```sql
where source_keyword in ('基金', '保险')
```

推荐迁移路线：

1. 从 MySQL 导出这些字段为 CSV：

```sql
select
  content_id,
  content_type,
  content_text,
  content_url,
  question_id,
  title,
  `desc` as description,
  created_time,
  updated_time,
  voteup_count,
  comment_count,
  source_keyword,
  user_id,
  user_nickname,
  user_url_token
from zhihu_content
where source_keyword in ('基金', '保险');
```

2. 在 Supabase 导入 CSV 到 `zhihu_content_import`。
3. 执行 `supabase/import-from-jeecg.sql`，把临时数据转换进正式表。
4. 随机打开 `/money` 和 `/money/q/:id` 检查标题、摘要、回答、标签是否正常。

## Vercel + GitHub 部署

1. 把 `money-qa-standalone` 目录单独复制成新仓库根目录。
2. 提交到 GitHub。
3. 在 Vercel 新建 Project，选择这个 GitHub 仓库。
4. Framework Preset 选 Next.js，Build Command 保持 `next build` 或默认。
5. 在 Vercel Project Settings -> Environment Variables 添加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
6. 重新部署。以后 push 到 GitHub 主分支会自动触发生产部署。

## 后续建议

- 管理后台：可以先直接在 Supabase Table Editor 审核 `money_question_submissions`，后面再加 `/admin`。
- 防刷：`/money/qa/ask` 可以加 Turnstile、邮箱验证码或 IP 频控。
- SEO：详情页可以改成服务端渲染并生成 metadata。
- 合规：页面已保留“仅知识科普，不构成投资/投保建议”的边界提示，正式上线建议在页脚补隐私政策和免责声明。
