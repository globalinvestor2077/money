-- 在旧 MySQL 里先导出 zhihu_content 里 source_keyword 为“基金/保险”的内容。
-- 建议导出字段：
-- content_id, content_type, content_text, content_url, question_id, title, `desc`,
-- created_time, updated_time, voteup_count, comment_count, source_keyword,
-- user_id, user_nickname, user_url_token
--
-- 然后导入到 Supabase 的临时表 public.zhihu_content_import，再执行下面 SQL。
-- 如果你用 Supabase Dashboard，可以先创建 CSV import table，字段类型都用 text，计数字段可后续转换。

create table if not exists public.zhihu_content_import (
  content_id text,
  content_type text,
  content_text text,
  content_url text,
  question_id text,
  title text,
  description text,
  created_time text,
  updated_time text,
  voteup_count text,
  comment_count text,
  source_keyword text,
  user_id text,
  user_nickname text,
  user_url_token text
);

insert into public.money_experts (name, title, organization, avatar_text, answer_count, helpful_rate)
select distinct
  coalesce(nullif(user_nickname, ''), '内容作者') as name,
  case when content_type = 'article' then '专栏作者' else '内容作者' end as title,
  '本站内容库' as organization,
  left(coalesce(nullif(user_nickname, ''), '作'), 1) as avatar_text,
  greatest(coalesce(nullif(comment_count, '')::integer, 0), 1) as answer_count,
  least(99.0, 90.0 + coalesce(nullif(voteup_count, '')::numeric, 0) / 100.0) as helpful_rate
from public.zhihu_content_import;

with source_rows as (
  select
    *,
    case when source_keyword = '基金' then 'fund'::money_qa_category else 'insurance'::money_qa_category end as qa_category,
    coalesce(nullif(title, ''), nullif(description, ''), '精选内容') as normalized_title,
    coalesce(nullif(description, ''), left(coalesce(content_text, ''), 160), '') as normalized_summary
  from public.zhihu_content_import
  where source_keyword in ('基金', '保险')
),
inserted_questions as (
  insert into public.money_questions (
    title,
    summary,
    category,
    tags,
    view_count,
    answer_count,
    like_count,
    status,
    source_content_id,
    source_url,
    created_at
  )
  select
    normalized_title,
    left(normalized_summary, 160),
    qa_category,
    array[source_keyword, case when content_type = 'article' then '文章' else '问答' end],
    coalesce(nullif(voteup_count, '')::integer, 0) * 20 + coalesce(nullif(comment_count, '')::integer, 0) * 5,
    greatest(coalesce(nullif(comment_count, '')::integer, 0), 1),
    coalesce(nullif(voteup_count, '')::integer, 0),
    'published',
    content_id,
    content_url,
    to_timestamp(coalesce(nullif(created_time, ''), nullif(updated_time, ''), extract(epoch from now())::text)::double precision)
  from source_rows
  on conflict (source_content_id) do nothing
  returning id, source_content_id
),
matched_questions as (
  select q.id as question_id, s.*
  from source_rows s
  join public.money_questions q on q.source_content_id = s.content_id
),
inserted_answers as (
  insert into public.money_answers (
    question_id,
    expert_id,
    content,
    like_count,
    dislike_count,
    accepted,
    source_type,
    source_content_id,
    created_at
  )
  select
    mq.question_id,
    (
      select e.id
      from public.money_experts e
      where e.name = coalesce(nullif(mq.user_nickname, ''), '内容作者')
      order by e.created_at desc
      limit 1
    ),
    left(coalesce(mq.content_text, ''), 800),
    coalesce(nullif(mq.voteup_count, '')::integer, 0),
    0,
    true,
    'MANUAL',
    mq.content_id,
    to_timestamp(coalesce(nullif(mq.updated_time, ''), nullif(mq.created_time, ''), extract(epoch from now())::text)::double precision)
  from matched_questions mq
  on conflict (source_content_id) do nothing
  returning id, question_id
)
update public.money_questions q
set accepted_answer_id = a.id
from public.money_answers a
where a.question_id = q.id
  and q.accepted_answer_id is null;
