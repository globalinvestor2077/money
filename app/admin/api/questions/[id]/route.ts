import { NextResponse } from 'next/server';
import { validateAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

function authOrFail(request: Request) {
  if (!validateAdminAuth(request)) {
    return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authOrFail(request);
  if (denied) return denied;

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from('money_questions')
    .select('*, accepted_answer:money_answers!money_questions_accepted_answer_id_fkey(id, content, expert_id, source_type, expert:money_experts(id, name, title))')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ success: false, message: '问题不存在' }, { status: 404 });

  return NextResponse.json({ success: true, result: data });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authOrFail(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.summary !== undefined) updates.summary = body.summary;
    if (body.category !== undefined) updates.category = body.category;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.status !== undefined) updates.status = body.status;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('money_questions').update(updates).eq('id', id);
      if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    if (body.answerContent !== undefined) {
      const { data: existing } = await supabase
        .from('money_answers')
        .select('id')
        .eq('question_id', id)
        .eq('accepted', true)
        .maybeSingle();

      if (existing) {
        await supabase.from('money_answers').update({ content: body.answerContent }).eq('id', existing.id);
      } else {
        const { data: answer } = await supabase
          .from('money_answers')
          .insert({
            question_id: id,
            content: body.answerContent,
            expert_id: body.expertId || null,
            accepted: true,
            source_type: 'MANUAL'
          })
          .select('id')
          .single();

        if (answer) {
          await supabase.from('money_questions').update({ accepted_answer_id: answer.id, answer_count: 1 }).eq('id', id);
        }
      }
    }

    return NextResponse.json({ success: true, result: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authOrFail(request);
  if (denied) return denied;

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  await supabase.from('money_answers').delete().eq('question_id', id);
  const { error } = await supabase.from('money_questions').delete().eq('id', id);

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  return NextResponse.json({ success: true, result: { id } });
}
