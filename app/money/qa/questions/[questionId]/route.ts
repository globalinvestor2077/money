import { getQuestion, ok, error } from '@/lib/moneyQa';

export async function GET(_request: Request, { params }: { params: Promise<{ questionId: string }> }) {
  try {
    const { questionId } = await params;
    const question = await getQuestion(questionId);
    if (!question) {
      return error('问题不存在', 404);
    }
    return ok(question);
  } catch (exception) {
    const message = exception instanceof Error ? exception.message : '加载问题详情失败';
    return error(message, 500);
  }
}
