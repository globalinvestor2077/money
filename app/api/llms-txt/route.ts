import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { MoneyQuestionRow } from '@/lib/types';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function GET() {
  const { data: questions } = await getSupabaseAdmin()
    .from('money_questions')
    .select('id, title, summary, category, tags, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20);

  const items = (questions || []) as Pick<MoneyQuestionRow, 'id' | 'title' | 'summary' | 'category' | 'tags' | 'created_at'>[];

  const links = items
    .map(
      (item) =>
        `- [${escapeMd(item.title)}](${siteUrl}/money/q/${item.id}): ${escapeMd(item.summary || '')}`
    )
    .join('\n');

  const body = [
    '# 金融问答',
    '',
    '> 专业金融知识问答平台，覆盖基金定投、ETF、保险配置、重疾险、医疗险等常见场景，提供通用知识解释与风险提示。',
    '',
    '## 核心页面',
    '',
    `- [问答首页](${siteUrl}/money): 基金与保险问答列表`,
    `- [基金问答](${siteUrl}/money?category=fund): 基金定投、ETF、基金选择相关问题`,
    `- [保险问答](${siteUrl}/money?category=insurance): 重疾险、医疗险、保险配置相关问题`,
    '',
    '## 热门问答',
    '',
    links,
    '',
    '## Optional',
    '',
    `- [全量问答内容](${siteUrl}/llms-full.txt): 站点全部问答内容 Markdown 格式，适合大上下文模型和 RAG 管道`,
    `- [Agent 接入说明](${siteUrl}/agent.md): NLWeb / AgenticWeb 接入指南，包含 API 端点与结构化数据说明`
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  });
}

function escapeMd(text: string) {
  return text.replace(/[\\[\]*_`<>]/g, '');
}
