import { askQuestion, ok, error } from '@/lib/moneyQa';
import type { MoneyQaAskPayload } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MoneyQaAskPayload;
    return ok(await askQuestion(payload));
  } catch (exception) {
    const message = exception instanceof Error ? exception.message : '提交问题失败';
    return error(message, 400);
  }
}
