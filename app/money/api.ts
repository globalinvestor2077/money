import type { MoneyQaAskPayload, MoneyQaAskResult, MoneyQaHome, MoneyQaQuestion, MoneyQaQuestionListParams, MoneyQaQuestionPage } from '@/lib/types';

interface ApiResult<T> {
  success: boolean;
  code: number;
  message: string;
  result: T;
  timestamp: number;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  const body = (await response.json()) as ApiResult<T>;
  if (!response.ok || !body.success) {
    throw new Error(body.message || '请求失败');
  }
  return body.result;
}

export function getMoneyQaHome() {
  return request<MoneyQaHome>('/money/qa/home');
}

export function getMoneyQaQuestions(params: MoneyQaQuestionListParams) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  return request<MoneyQaQuestionPage>(`/money/qa/questions?${search.toString()}`);
}

export function getMoneyQaQuestionDetail(questionId: string) {
  return request<MoneyQaQuestion>(`/money/qa/questions/${questionId}`);
}

export function submitMoneyQaQuestion(payload: MoneyQaAskPayload) {
  return request<MoneyQaAskResult>('/money/qa/ask', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export interface GenerateResult {
  generated: number;
  questions: { id: string; title: string; category: string }[];
}

export function generateMoneyQaContent() {
  return request<GenerateResult>('/money/qa/generate', { method: 'POST' });
}
