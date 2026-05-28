import { NextResponse } from 'next/server';
import { validateAdminAuth } from '@/lib/adminAuth';
import { generateAndSaveQa } from '@/lib/moneyQa';
import { generateQaContent } from '@/lib/deepseek';

export async function POST(request: Request) {
  if (!validateAdminAuth(request)) {
    return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
  }
  try {
    const items = await generateQaContent();
    const result = await generateAndSaveQa(items);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '内容生成失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
