import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

function authOrFail(request: Request) {
  if (!validateAdminAuth(request)) {
    return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = authOrFail(request);
  if (denied) return denied;

  const url = request.nextUrl;
  const search = url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';
  const status = url.searchParams.get('status') || '';

  let query = getSupabaseAdmin()
    .from('money_questions')
    .select('*, accepted_answer:money_answers!money_questions_accepted_answer_id_fkey(id, content, expert_id, source_type, expert:money_experts(id, name, title))')
    .order('created_at', { ascending: false })
    .limit(200);

  if (category && category !== 'all') query = query.eq('category', category);
  if (status && status !== 'all') query = query.eq('status', status);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  return NextResponse.json({ success: true, result: data || [] });
}

export async function POST(request: Request) {
  const denied = authOrFail(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const { data: question, error } = await supabase
      .from('money_questions')
      .insert({
        title: body.title,
        summary: body.summary || '',
        category: body.category,
        tags: body.tags || [],
        status: body.status || 'published'
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

    if (body.answerContent) {
      const expertId = body.expertId || null;
      const { data: answer } = await supabase
        .from('money_answers')
        .insert({
          question_id: question.id,
          content: body.answerContent,
          expert_id: expertId,
          accepted: true,
          source_type: 'MANUAL'
        })
        .select('id')
        .single();

      if (answer) {
        await supabase
          .from('money_questions')
          .update({ accepted_answer_id: answer.id, answer_count: 1 })
          .eq('id', question.id);
      }
    }

    return NextResponse.json({ success: true, result: question });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
