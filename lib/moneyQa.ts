import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from './supabaseAdmin';
import type {
  MoneyAnswerRow,
  MoneyExpertRow,
  MoneyQaAnswer,
  MoneyQaAskPayload,
  MoneyQaCategory,
  MoneyQaExpert,
  MoneyQaHome,
  MoneyQaQuestion,
  MoneyQaQuestionListParams,
  MoneyQaTopic,
  MoneyQuestionRow
} from './types';

const QUESTION_LIMIT = 200;

const questionSelect = `
  id,
  title,
  summary,
  category,
  tags,
  view_count,
  answer_count,
  like_count,
  created_at,
  status,
  accepted_answer_id,
  accepted_answer:money_answers!money_questions_accepted_answer_id_fkey(
    id,
    question_id,
    content,
    expert_id,
    created_at,
    like_count,
    dislike_count,
    accepted,
    source_type,
    expert:money_experts(
      id,
      name,
      title,
      organization,
      avatar_text,
      answer_count,
      helpful_rate
    )
  )
`;

export function ok<T>(result: T) {
  return NextResponse.json({
    success: true,
    code: 200,
    message: 'OK',
    result,
    timestamp: Date.now()
  });
}

export function error(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      code: status,
      message,
      result: null,
      timestamp: Date.now()
    },
    { status }
  );
}

export async function getHome(): Promise<MoneyQaHome> {
  const questions = await getQuestions({ sort: 'hot' });
  const experts = buildExperts(questions);

  return {
    stats: {
      questionCount: questions.length,
      answerCount: questions.filter((item) => item.acceptedAnswer).length,
      expertCount: experts.length
    },
    hotQuestions: [...questions].sort((a, b) => hotScore(b) - hotScore(a)).slice(0, 5),
    latestQuestions: [...questions].sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt)).slice(0, 6),
    topics: buildTopics(questions),
    experts
  };
}

export async function getQuestions(params: MoneyQaQuestionListParams): Promise<MoneyQaQuestion[]> {
  let query = getSupabaseAdmin()
    .from('money_questions')
    .select(questionSelect)
    .eq('status', 'published')
    .limit(QUESTION_LIMIT);

  if (params.category && params.category !== 'all') {
    query = query.eq('category', params.category);
  }

  const { data, error: queryError } = await query;
  if (queryError) {
    throw queryError;
  }

  let questions = ((data || []) as unknown as MoneyQuestionRow[]).map(toQuestion);

  if (hasText(params.keyword)) {
    const keyword = params.keyword!.trim().toLowerCase();
    questions = questions.filter((item) => {
      return (
        includes(item.title, keyword) ||
        includes(item.summary, keyword) ||
        item.tags.some((tag) => includes(tag, keyword)) ||
        includes(item.acceptedAnswer?.content, keyword)
      );
    });
  }

  if (hasText(params.tag)) {
    const tag = params.tag!.trim().toLowerCase();
    questions = questions.filter((item) => item.tags.some((value) => value.toLowerCase() === tag));
  }

  return questions.sort(questionComparator(params.sort || 'hot'));
}

export async function getQuestion(questionId: string): Promise<MoneyQaQuestion | null> {
  const { data, error: queryError } = await getSupabaseAdmin()
    .from('money_questions')
    .select(questionSelect)
    .eq('status', 'published')
    .eq('id', questionId)
    .maybeSingle();

  if (queryError) {
    throw queryError;
  }

  return data ? toQuestion(data as unknown as MoneyQuestionRow) : null;
}

export async function askQuestion(payload: MoneyQaAskPayload) {
  const category = payload.category;
  if (category !== 'fund' && category !== 'insurance') {
    throw new Error('问题类型不正确');
  }

  const title = payload.title?.trim();
  const content = payload.content?.trim();
  if (!title || !content) {
    throw new Error('问题标题和补充内容不能为空');
  }

  const { data, error: insertError } = await getSupabaseAdmin()
    .from('money_question_submissions')
    .insert({
      category,
      title,
      content,
      tags: normalizeTags(payload.tags),
      status: 'pending'
    })
    .select('id, status, category')
    .single();

  if (insertError) {
    throw insertError;
  }

  return {
    id: data.id,
    status: String(data.status).toUpperCase(),
    category: data.category
  };
}

function toQuestion(row: MoneyQuestionRow): MoneyQaQuestion {
  const answerRow = row.accepted_answer || null;
  const answer = answerRow ? toAnswer(answerRow) : undefined;

  return {
    id: row.id,
    title: row.title,
    summary: row.summary || '',
    category: row.category,
    tags: row.tags || [],
    viewCount: row.view_count || 0,
    answerCount: row.answer_count || (answer ? 1 : 0),
    likeCount: row.like_count || 0,
    createdAt: formatDate(row.created_at),
    expert: answer?.expert,
    acceptedAnswer: answer
  };
}

function toAnswer(row: MoneyAnswerRow): MoneyQaAnswer {
  const expert = toExpert(row.expert);
  return {
    id: row.id,
    questionId: row.question_id,
    content: row.content,
    expert,
    createdAt: formatDate(row.created_at),
    likeCount: row.like_count || 0,
    dislikeCount: row.dislike_count || 0,
    accepted: Boolean(row.accepted),
    sourceType: row.source_type || 'MANUAL'
  };
}

function toExpert(row?: MoneyExpertRow | null): MoneyQaExpert {
  const name = row?.name || '金融知识库';
  return {
    id: row?.id || 'content-user',
    name,
    title: row?.title || '知识整理',
    organization: row?.organization || '本站内容库',
    avatarText: row?.avatar_text || name.slice(0, 1),
    answerCount: row?.answer_count || 1,
    helpfulRate: Number(row?.helpful_rate || 95)
  };
}

function buildTopics(questions: MoneyQaQuestion[]): MoneyQaTopic[] {
  const counter = new Map<string, MoneyQaTopic>();
  for (const question of questions) {
    for (const tag of question.tags) {
      const key = `${question.category}:${tag}`;
      const current = counter.get(key);
      if (current) {
        current.count += 1;
      } else {
        counter.set(key, { label: tag, category: question.category, count: 1 });
      }
    }
  }
  return [...counter.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'));
}

function buildExperts(questions: MoneyQaQuestion[]): MoneyQaExpert[] {
  const experts = new Map<string, MoneyQaExpert>();
  for (const question of questions) {
    if (question.expert?.id && !experts.has(question.expert.id)) {
      experts.set(question.expert.id, question.expert);
    }
  }
  return [...experts.values()].sort((a, b) => b.answerCount - a.answerCount).slice(0, 8);
}

function questionComparator(sort: 'hot' | 'latest') {
  if (sort === 'latest') {
    return (a: MoneyQaQuestion, b: MoneyQaQuestion) => dateValue(b.createdAt) - dateValue(a.createdAt);
  }
  return (a: MoneyQaQuestion, b: MoneyQaQuestion) => hotScore(b) - hotScore(a) || dateValue(b.createdAt) - dateValue(a.createdAt);
}

function hotScore(question: MoneyQaQuestion) {
  return question.answerCount * 8 + Math.floor(question.viewCount / 10) + question.likeCount * 5;
}

function dateValue(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const pad = (input: number) => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeTags(tags?: string[]) {
  return [...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean))].slice(0, 5);
}

function hasText(value?: string) {
  return Boolean(value && value.trim());
}

function includes(value: string | undefined, keyword: string) {
  return Boolean(value && value.toLowerCase().includes(keyword));
}

export interface GenerateResult {
  generated: number;
  questions: { id: string; title: string; category: string }[];
}

export async function generateAndSaveQa(items: {
  category: 'fund' | 'insurance';
  title: string;
  summary: string;
  tags: string[];
  expert: { name: string; title: string; organization: string };
  content: string;
}[]): Promise<GenerateResult> {
  const supabase = getSupabaseAdmin();
  const results: GenerateResult['questions'] = [];

  for (const item of items) {
    const expertId = await upsertExpert(supabase, item.expert);

    const { data: question, error: qError } = await supabase
      .from('money_questions')
      .insert({
        title: item.title,
        summary: item.summary,
        category: item.category,
        tags: normalizeTags(item.tags),
        status: 'published',
        source_content_id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      })
      .select('id, title, category')
      .single();

    if (qError) {
      console.error('Failed to insert question:', qError);
      continue;
    }

    const { data: answer, error: aError } = await supabase
      .from('money_answers')
      .insert({
        question_id: question.id,
        expert_id: expertId,
        content: item.content,
        accepted: true,
        source_type: 'AI'
      })
      .select('id')
      .single();

    if (aError) {
      console.error('Failed to insert answer:', aError);
      continue;
    }

    await supabase
      .from('money_questions')
      .update({ accepted_answer_id: answer.id, answer_count: 1 })
      .eq('id', question.id);

    await supabase.rpc('increment_expert_answer_count', { expert_id: expertId }).then(
      () => {},
      () => {}
    );

    results.push({ id: question.id, title: question.title, category: question.category });
  }

  return { generated: results.length, questions: results };
}

async function upsertExpert(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  expert: { name: string; title: string; organization: string }
): Promise<string> {
  const { data: existing } = await supabase
    .from('money_experts')
    .select('id')
    .eq('name', expert.name)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from('money_experts')
    .insert({
      name: expert.name,
      title: expert.title,
      organization: expert.organization,
      avatar_text: expert.name.slice(0, 1)
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return created.id;
}

export function parseCategory(value: string | null): MoneyQaCategory | 'all' | undefined {
  if (value === 'fund' || value === 'insurance' || value === 'all') {
    return value;
  }
  return undefined;
}
