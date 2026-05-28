import { NextResponse } from 'next/server';
import { checkLogin } from '@/lib/adminAuth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const result = checkLogin(password || '');
    if (!result) {
      return NextResponse.json({ success: false, message: '密码错误' }, { status: 401 });
    }
    return NextResponse.json({ success: true, result });
  } catch {
    return NextResponse.json({ success: false, message: '登录失败' }, { status: 400 });
  }
}
