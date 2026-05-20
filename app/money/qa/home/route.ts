import { getHome, ok, error } from '@/lib/moneyQa';

export async function GET() {
  try {
    return ok(await getHome());
  } catch (exception) {
    const message = exception instanceof Error ? exception.message : '加载首页数据失败';
    return error(message, 500);
  }
}
