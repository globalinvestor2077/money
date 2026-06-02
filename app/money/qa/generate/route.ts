import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateAndSaveQa, ok, error } from '@/lib/moneyQa';
import { generateQaContent } from '@/lib/deepseek';

export async function POST() {
  try {
    // 查询已有问题标题，用于排重
    const { data: existing } = await getSupabaseAdmin()
      .from('money_questions')
      .select('title')
      .eq('status', 'published');

    const existingTitles = (existing || []).map((q: { title: string }) => q.title);

    const items = await generateQaContent(existingTitles);
    const result = await generateAndSaveQa(items);
    return ok(result);
  } catch (exception) {
    const message = exception instanceof Error ? exception.message : '内容生成失败';
    return error(message, 500);
  }
}
