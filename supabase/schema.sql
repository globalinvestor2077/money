create extension if not exists pgcrypto;

do $$
begin
  create type money_qa_category as enum ('fund', 'insurance');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type money_question_status as enum ('published', 'pending', 'rejected');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type money_answer_source_type as enum ('AI', 'MANUAL');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.money_experts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null default '内容作者',
  organization text not null default '本站内容库',
  avatar_text text not null default '作',
  answer_count integer not null default 0,
  helpful_rate numeric(5, 2) not null default 95.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_questions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  category money_qa_category not null,
  tags text[] not null default '{}',
  view_count integer not null default 0,
  answer_count integer not null default 0,
  like_count integer not null default 0,
  status money_question_status not null default 'published',
  accepted_answer_id uuid,
  source_content_id text unique,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.money_questions(id) on delete cascade,
  expert_id uuid references public.money_experts(id) on delete set null,
  content text not null,
  like_count integer not null default 0,
  dislike_count integer not null default 0,
  accepted boolean not null default false,
  source_type money_answer_source_type not null default 'MANUAL',
  source_content_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.money_questions
    add constraint money_questions_accepted_answer_id_fkey
    foreign key (accepted_answer_id)
    references public.money_answers(id)
    on delete set null;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.money_question_submissions (
  id uuid primary key default gen_random_uuid(),
  category money_qa_category not null,
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  status money_question_status not null default 'pending',
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_money_questions_status_category on public.money_questions(status, category);
create index if not exists idx_money_questions_created_at on public.money_questions(created_at desc);
create index if not exists idx_money_questions_tags on public.money_questions using gin(tags);
create index if not exists idx_money_answers_question_id on public.money_answers(question_id);
create index if not exists idx_money_submissions_status on public.money_question_submissions(status, created_at desc);

alter table public.money_experts enable row level security;
alter table public.money_questions enable row level security;
alter table public.money_answers enable row level security;
alter table public.money_question_submissions enable row level security;

drop policy if exists "Public can read experts" on public.money_experts;
drop policy if exists "Public can read published questions" on public.money_questions;
drop policy if exists "Public can read answers" on public.money_answers;
drop policy if exists "Public can create submissions" on public.money_question_submissions;

create policy "Public can read experts"
  on public.money_experts for select
  using (true);

create policy "Public can read published questions"
  on public.money_questions for select
  using (status = 'published');

create policy "Public can read answers"
  on public.money_answers for select
  using (
    exists (
      select 1
      from public.money_questions q
      where q.id = money_answers.question_id
        and q.status = 'published'
    )
  );

create policy "Public can create submissions"
  on public.money_question_submissions for insert
  with check (status = 'pending');
