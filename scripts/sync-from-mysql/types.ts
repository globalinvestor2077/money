export const VALID_KEYWORDS = ['基金', '保险'] as const;
export type ValidKeyword = (typeof VALID_KEYWORDS)[number];

export const KEYWORD_TO_CATEGORY: Record<ValidKeyword, 'fund' | 'insurance'> = {
  '基金': 'fund',
  '保险': 'insurance',
};

export interface ZhihuContent {
  id: number;
  content_id: string;
  content_type: string;
  content_text: string;
  content_url: string;
  question_id: string;
  title: string;
  desc: string;
  created_time: string;
  updated_time: string;
  voteup_count: number;
  comment_count: number;
  source_keyword: string;
  user_id: string;
  user_link: string;
  user_nickname: string;
  user_avatar: string;
  user_url_token: string;
  add_ts: number;
  last_modify_ts: number;
}

export interface ZhihuCreator {
  id: number;
  user_id: string;
  user_link: string;
  user_nickname: string;
  user_avatar: string;
  url_token: string;
  gender: string;
  ip_location: string;
  follows: number;
  fans: number;
  anwser_count: number;
  video_count: number;
  question_count: number;
  article_count: number;
  column_count: number;
  get_voteup_count: number;
  add_ts: number;
  last_modify_ts: number;
}
