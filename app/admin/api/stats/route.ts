// @ts-ignore
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

  const supabase = getSupabaseAdmin();

  const countQuery = supabase.from('money_questions').select('*', { count: 'exact', head: true });

  const [questions, answered, experts] = await Promise.all([
    countQuery,
    supabase.from('money_questions').select('*', { count: 'exact', head: true }).not('accepted_answer_id', 'is', null),
    supabase.from('money_experts').select('*', { count: 'exact', head: true })
  ]);

  const failed = [questions, answered, experts].find((result) => result.error);
  if (failed?.error) {
    return NextResponse.json({ success: false, message: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    result: {
      questions: questions.count ?? 0,
      answers: answered.count ?? 0,
      experts: experts.count ?? 0
    }
  });
}
