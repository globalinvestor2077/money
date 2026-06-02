import { NextResponse } from 'next/server';
import { validateAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

function authOrFail(request: Request) {
  if (!validateAdminAuth(request)) {
    return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = authOrFail(request);
  if (denied) return denied;

  const { data, error } = await getSupabaseAdmin()
    .from('money_experts')
    .select('*')
    .order('answer_count', { ascending: false });

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  return NextResponse.json({ success: true, result: data || [] });
}

export async function POST(request: Request) {
  const denied = authOrFail(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { data, error } = await getSupabaseAdmin()
      .from('money_experts')
      .insert({
        name: body.name,
        title: body.title || '知识整理',
        organization: body.organization || '本站内容库',
        avatar_text: body.avatarText || (body.name || '作').slice(0, 1)
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
