import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { MoneyAnswerRow, MoneyExpertRow, MoneyQuestionRow } from '@/lib/types';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface QuestionWithAnswer extends MoneyQuestionRow {
  accepted_answer?: (MoneyAnswerRow & { expert?: MoneyExpertRow | null }) | null;
}

export async function GET() {
  const { data } = await getSupabaseAdmin()
    .from('money_questions')
    .select(
      `id, title, summary, category, tags, created_at, accepted_answer:money_answers!money_questions_accepted_answer_id_fkey(id, content, source_type, created_at, expert:money_experts(id, name, title, organization))`
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const questions = (data || []) as unknown as QuestionWithAnswer[];

  const lines: string[] = [
    '# 金融问答 - 全量内容',
    '',
    `> 站点域名：${siteUrl}`,
    `> 数据更新时间：${new Date().toISOString().replace('T', ' ').slice(0, 19)}`,
    `> 问答总数：${questions.length}`,
    '',
    '---',
    ''
  ];

  const fundQuestions = questions.filter((item) => item.category === 'fund');
  const insuranceQuestions = questions.filter((item) => item.category === 'insurance');

  appendSection(lines, '基金问答', fundQuestions, siteUrl);
  appendSection(lines, '保险问答', insuranceQuestions, siteUrl);

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  });
}

function appendSection(
  lines: string[],
  heading: string,
  questions: QuestionWithAnswer[],
  baseUrl: string
) {
  if (!questions.length) return;

  lines.push(`## ${heading}`);
  lines.push('');

  for (const item of questions) {
    lines.push(`### ${escapeMd(item.title)}`);
    lines.push('');
    lines.push(`- **分类**：${heading}`);
    lines.push(`- **标签**：${(item.tags || []).join(', ') || '无'}`);
    lines.push(`- **链接**：[查看详情](${baseUrl}/money/q/${item.id})`);
    lines.push(`- **发布时间**：${item.created_at}`);
    lines.push('');

    if (item.summary) {
      lines.push(escapeMd(item.summary));
      lines.push('');
    }

    if (item.accepted_answer?.content) {
      lines.push(`**回答**（${item.accepted_answer.source_type === 'AI' ? 'AI 生成' : '人工编写'}）：`);
      lines.push('');
      lines.push(escapeMd(item.accepted_answer.content));
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }
}

function escapeMd(text: string) {
  return text.replace(/[\\[\]*_`<>]/g, '');
}
