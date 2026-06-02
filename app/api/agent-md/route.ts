import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function GET() {
  const { count: questionCount } = await getSupabaseAdmin()
    .from('money_questions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  const { count: answerCount } = await getSupabaseAdmin()
    .from('money_answers')
    .select('*', { count: 'exact', head: true });

  const { count: expertCount } = await getSupabaseAdmin()
    .from('money_experts')
    .select('*', { count: 'exact', head: true });

  const body = [
    '# 金融问答 - NLWeb / Agent 接入说明',
    '',
    `> 专业金融知识问答平台，覆盖基金定投、ETF、保险配置、重疾险、医疗险等常见场景，提供通用知识解释与风险提示。`,
    '',
    `> 最后更新：${new Date().toISOString().replace('T', ' ').slice(0, 19)}`,
    '',
    '---',
    '',
    '## 站点概况',
    '',
    `- **站点名称**：金融问答`,
    `- **站点域名**：${siteUrl}`,
    `- **累计问答**：${questionCount || 0} 条`,
    `- **累计回答**：${answerCount || 0} 条`,
    `- **知识库条目**：${expertCount || 0} 条`,
    '',
    '## API 接口',
    '',
    '### 问答 API',
    '',
    `- **问答列表**：[\`GET ${siteUrl}/money/qa/home\`](${siteUrl}/money/qa/home) — 首页数据（统计、热门问题、话题）`,
    `- **问题搜索**：[\`GET ${siteUrl}/money/qa/questions?category=fund&keyword=定投&sort=hot\`](${siteUrl}/money/qa/questions) — 问答列表（支持 category/keyword/tag/sort 参数）`,
    `- **问题详情**：[\`GET ${siteUrl}/money/qa/questions/{id}\`](${siteUrl}/money/qa/questions/example) — 单个问题及回答`,
    `- **提问接口**：[\`POST ${siteUrl}/money/qa/ask\`](${siteUrl}/money/qa/ask) — 提交问题（需审核）`,
    '',
    '### LLM 专用接口',
    '',
    `- **llms.txt**：[\`${siteUrl}/llms.txt\`](${siteUrl}/llms.txt) — Markdown 格式站点内容地图，适合 LLM 发现与导航`,
    `- **llms-full.txt**：[\`${siteUrl}/llms-full.txt\`](${siteUrl}/llms-full.txt) — 全量问答内容 Markdown，适合大上下文模型与 RAG 管道`,
    `- **Agent 接入说明**：[\`${siteUrl}/agent.md\`](${siteUrl}/agent.md) — 当前页面`,
    '',
    '### 管理后台',
    '',
    `- **管理首页**：[\`${siteUrl}/admin\`](${siteUrl}/admin)`,
    `- **问答管理**：[\`${siteUrl}/admin/questions\`](${siteUrl}/admin/questions)`,
    `- **知识库管理**：[\`${siteUrl}/admin/experts\`](${siteUrl}/admin/experts)`,
    '',
    '## 分类目录',
    '',
    `- **[基金问答](${siteUrl}/money?category=fund)**：基金定投、ETF 选择、基金组合、指数基金、主动基金等`,
    `- **[保险问答](${siteUrl}/money?category=insurance)**：重疾险、医疗险、寿险、意外险、保险配置等`,
    '',
    '## 结构化数据（Schema.org）',
    '',
    '本站支持 Schema.org 结构化数据，便于 AI 系统和搜索引擎理解内容：',
    '',
    '- **问答详情页**：FAQPage（包含问题、最佳回答）',
    '- **问答列表页**：FAQPage（包含多条热门问答）',
    '',
    '**示例**：查看 `/money/q/{id}` 页面源代码中的 `<script type="application/ld+json">` 块。',
    '',
    '## 接入建议',
    '',
    '1. **优先使用 API 接口**：`/money/qa/` 系列接口返回 JSON，适合程序化消费',
    '2. **大模型内容获取**：使用 `/llms-full.txt` 一次获取全量内容，减少请求次数',
    '3. **遵守爬取规则**：参考 [`/robots.txt`](' + `${siteUrl}/robots.txt` + ')，管理后台路径禁止爬取',
    '4. **结构化数据**：详情页已嵌入 FAQPage JSON-LD，可直接解析结构化数据',
    '5. **内容授权**：本站公开内容允许抓取与引用，但需注明来源',
    '',
    '## Sitemap',
    '',
    `- **sitemap.xml**：[\`${siteUrl}/sitemap.xml\`](${siteUrl}/sitemap.xml)`,
    `- **robots.txt**：[\`${siteUrl}/robots.txt\`](${siteUrl}/robots.txt)`,
    '',
    '## 技术支持',
    '',
    '如需技术支持或 API 访问权限调整，请联系站点管理员。'
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  });
}
