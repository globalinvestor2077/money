import { NextResponse } from 'next/server';
import { validateAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

function authOrFail(request: Request) {
  if (!validateAdminAuth(request)) {
    return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
  }
  return null;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authOrFail(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.title !== undefined) updates.title = body.title;
    if (body.organization !== undefined) updates.organization = body.organization;
    if (body.avatarText !== undefined) updates.avatar_text = body.avatarText;

    const { error } = await getSupabaseAdmin().from('money_experts').update(updates).eq('id', id);
    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

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
  const { error } = await getSupabaseAdmin().from('money_experts').delete().eq('id', id);
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  return NextResponse.json({ success: true, result: { id } });
}
