insert into public.money_experts (id, name, title, organization, avatar_text, answer_count, helpful_rate)
values
  ('00000000-0000-0000-0000-000000000101', '内容作者', '知识整理作者', '本站内容库', '作', 18, 96.5),
  ('00000000-0000-0000-0000-000000000102', '保险顾问', '保障知识作者', '本站内容库', '保', 12, 94.2)
on conflict (id) do nothing;

insert into public.money_questions (id, title, summary, category, tags, view_count, answer_count, like_count, status, created_at)
values
  (
    '00000000-0000-0000-0000-000000001001',
    '基金定投需要看哪些指标？',
    '定投更适合用长期纪律平滑波动，选择产品时通常关注基金类型、费率、跟踪误差、基金经理稳定性和自己的资金周期。',
    'fund',
    array['基金', '定投', '费率'],
    1680,
    1,
    62,
    'published',
    now() - interval '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000001002',
    '重疾险和医疗险有什么区别？',
    '重疾险偏给付，医疗险偏报销，二者解决的问题不同，不能简单互相替代。',
    'insurance',
    array['保险', '重疾险', '医疗险'],
    1320,
    1,
    49,
    'published',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

insert into public.money_answers (id, question_id, expert_id, content, like_count, dislike_count, accepted, source_type, created_at)
values
  (
    '00000000-0000-0000-0000-000000002001',
    '00000000-0000-0000-0000-000000001001',
    '00000000-0000-0000-0000-000000000101',
    '可以先看三个层面：第一，产品是否匹配目标，比如宽基指数、行业主题、债券基金的波动差异很大。第二，成本和跟踪质量，包括管理费、托管费、申购赎回费、指数基金的跟踪误差。第三，自己的现金流和持有周期，定投不是保证盈利的工具，更像把买入节奏制度化。',
    62,
    1,
    true,
    'MANUAL',
    now() - interval '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000002002',
    '00000000-0000-0000-0000-000000001002',
    '00000000-0000-0000-0000-000000000102',
    '重疾险通常是在达到合同约定疾病状态后一次性给付，钱可以用于治疗、康复、收入补偿等。医疗险通常按实际医疗费用报销，需要看免赔额、报销范围、医院范围和续保条件。配置时应先确认已有社保、预算、健康告知和家庭责任。',
    49,
    0,
    true,
    'MANUAL',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

update public.money_questions
set accepted_answer_id = '00000000-0000-0000-0000-000000002001'
where id = '00000000-0000-0000-0000-000000001001';

update public.money_questions
set accepted_answer_id = '00000000-0000-0000-0000-000000002002'
where id = '00000000-0000-0000-0000-000000001002';
