export type MoneyQaCategory = 'fund' | 'insurance';

export interface MoneyQaExpert {
  id: string;
  name: string;
  title: string;
  organization: string;
  avatarText: string;
  answerCount: number;
  helpfulRate: number;
}

export interface MoneyQaAnswer {
  id: string;
  questionId: string;
  content: string;
  expert: MoneyQaExpert;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  accepted: boolean;
  sourceType: 'AI' | 'MANUAL';
}

export interface MoneyQaQuestion {
  id: string;
  title: string;
  summary: string;
  category: MoneyQaCategory;
  tags: string[];
  viewCount: number;
  answerCount: number;
  likeCount: number;
  createdAt: string;
  expert?: MoneyQaExpert;
  acceptedAnswer?: MoneyQaAnswer;
}

export interface MoneyQaTopic {
  label: string;
  category: MoneyQaCategory;
  count: number;
}

export interface MoneyQaHome {
  stats: {
    questionCount: number;
    answerCount: number;
    expertCount: number;
  };
  hotQuestions: MoneyQaQuestion[];
  latestQuestions: MoneyQaQuestion[];
  topics: MoneyQaTopic[];
  experts: MoneyQaExpert[];
}

export interface MoneyQaQuestionListParams {
  category?: MoneyQaCategory | 'all';
  keyword?: string;
  tag?: string;
  sort?: 'hot' | 'latest';
}

export interface MoneyQaAskPayload {
  category: MoneyQaCategory;
  title: string;
  content: string;
  tags: string[];
}

export interface MoneyQaAskResult {
  id: string;
  status: string;
  category: string;
}

export interface MoneyQuestionRow {
  id: string;
  title: string;
  summary: string;
  category: MoneyQaCategory;
  tags: string[] | null;
  view_count: number | null;
  answer_count: number | null;
  like_count: number | null;
  created_at: string;
  status: 'published' | 'pending' | 'rejected';
  accepted_answer_id: string | null;
  accepted_answer?: MoneyAnswerRow | null;
}

export interface MoneyAnswerRow {
  id: string;
  question_id: string;
  content: string;
  expert_id: string | null;
  created_at: string;
  like_count: number | null;
  dislike_count: number | null;
  accepted: boolean | null;
  source_type: 'AI' | 'MANUAL';
  expert?: MoneyExpertRow | null;
}

export interface MoneyExpertRow {
  id: string;
  name: string;
  title: string;
  organization: string;
  avatar_text: string;
  answer_count: number | null;
  helpful_rate: number | null;
}
