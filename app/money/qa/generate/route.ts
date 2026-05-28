import { generateAndSaveQa, ok, error } from '@/lib/moneyQa';
import { generateQaContent } from '@/lib/deepseek';

export async function POST() {
  try {
    const items = await generateQaContent();
    const result = await generateAndSaveQa(items);
    return ok(result);
  } catch (exception) {
    const message = exception instanceof Error ? exception.message : '内容生成失败';
    return error(message, 500);
  }
}
