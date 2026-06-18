import { getQuestionsPage, ok, error, parseCategory } from '@/lib/moneyQa';

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return ok(
      await getQuestionsPage({
        category: parseCategory(url.searchParams.get('category')),
        keyword: url.searchParams.get('keyword') || undefined,
        tag: url.searchParams.get('tag') || undefined,
        sort: url.searchParams.get('sort') === 'latest' ? 'latest' : 'hot',
        page: parsePositiveInt(url.searchParams.get('page')),
        pageSize: parsePositiveInt(url.searchParams.get('pageSize'))
      })
    );
  } catch (exception) {
    const message = exception instanceof Error ? exception.message : '加载问答列表失败';
    return error(message, 500);
  }
}
