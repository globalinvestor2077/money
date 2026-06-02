import { NextResponse } from 'next/server';
import { validateAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateAndSaveQa } from '@/lib/moneyQa';
import { generateQaContent } from '@/lib/deepseek';

export async function POST(request: Request) {
  if (!validateAdminAuth(request)) {
    return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
  }
  try {
    // 查询已有问题标题，用于排重
    const { data: existing } = await getSupabaseAdmin()
      .from('money_questions')
      .select('title')
      .eq('status', 'published');

    const existingTitles = (existing || []).map((q: { title: string }) => q.title);

    const items = await generateQaContent(existingTitles);
    const result = await generateAndSaveQa(items);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '内容生成失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
