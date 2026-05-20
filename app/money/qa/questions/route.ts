import { getQuestions, ok, error, parseCategory } from '@/lib/moneyQa';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return ok(
      await getQuestions({
        category: parseCategory(url.searchParams.get('category')),
        keyword: url.searchParams.get('keyword') || undefined,
        tag: url.searchParams.get('tag') || undefined,
        sort: url.searchParams.get('sort') === 'latest' ? 'latest' : 'hot'
      })
    );
  } catch (exception) {
    const message = exception instanceof Error ? exception.message : '加载问答列表失败';
    return error(message, 500);
  }
}
