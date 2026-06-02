import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import type { ZhihuContent, ZhihuCreator, ValidKeyword } from './types';
import { KEYWORD_TO_CATEGORY } from './types';

export interface SyncStats {
  expertsInserted: number;
  expertsSkipped: number;
  questionsInserted: number;
  questionsSkipped: number;
  answersInserted: number;
  answersSkipped: number;
}

function tsToIso(ts: string | number | null): string {
  if (!ts) return new Date().toISOString();
  const n = typeof ts === 'string' ? parseInt(ts, 10) : ts;
  if (isNaN(n)) return new Date().toISOString();
  // MySQL bigint timestamps are in seconds
  return n > 1e12 ? new Date(n).toISOString() : new Date(n * 1000).toISOString();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

async function syncExperts(creators: ZhihuCreator[], dryRun: boolean): Promise<Pick<SyncStats, 'expertsInserted' | 'expertsSkipped'>> {
  if (creators.length === 0) {
    return { expertsInserted: 0, expertsSkipped: 0 };
  }

  const supabase = getSupabaseAdmin();

  // Get existing expert names for dedup
  const { data: existing } = await supabase.from('money_experts').select('name');
  const existingNames = new Set((existing ?? []).map((e: { name: string }) => e.name));

  const rows = creators.map((c) => ({
    name: c.user_nickname || '金融知识库',
    title: '知识整理',
    organization: '本站内容库',
    avatar_text: (c.user_nickname || '作').charAt(0),
    answer_count: Math.max(c.anwser_count || 0, 1),
    helpful_rate: 95.0,
  }));

  const newRows = rows.filter((r) => !existingNames.has(r.name));
  if (dryRun) {
    console.log(`  [dry-run] Would insert ${newRows.length} experts (${rows.length - newRows.length} already exist)`);
    return { expertsInserted: 0, expertsSkipped: rows.length - newRows.length };
  }

  let inserted = 0;
  const batches = chunk(newRows, 500);
  for (const batch of batches) {
    const { error } = await supabase.from('money_experts').insert(batch);
    if (error) {
      console.error('  Error inserting experts:', error.message);
    } else {
      inserted += batch.length;
    }
  }

  return { expertsInserted: inserted, expertsSkipped: rows.length - newRows.length };
}

async function syncQuestionsAndAnswers(
  contents: ZhihuContent[],
  dryRun: boolean,
  batchSize: number
): Promise<Pick<SyncStats, 'questionsInserted' | 'questionsSkipped' | 'answersInserted' | 'answersSkipped'>> {
  if (contents.length === 0) {
    return { questionsInserted: 0, questionsSkipped: 0, answersInserted: 0, answersSkipped: 0 };
  }

  const supabase = getSupabaseAdmin();

  // Group by question_id
  const groups = new Map<string, ZhihuContent[]>();
  for (const c of contents) {
    const key = c.question_id || c.content_id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  // Build question rows
  const questionRows: { source_content_id: string; title: string; summary: string; category: 'fund' | 'insurance'; tags: string[]; view_count: number; answer_count: number; like_count: number; status: string; source_url: string; created_at: string }[] = [];
  for (const [qid, items] of groups) {
    const first = items[0];
    const kw = (first.source_keyword === '基金' ? '基金' : '保险') as ValidKeyword;
    const title = first.title || first.desc || first.content_text?.slice(0, 80) || '精选内容';
    const summary = (first.desc || first.content_text || '').slice(0, 160);
    const totalVotes = items.reduce((s, i) => s + (i.voteup_count || 0), 0);
    const totalComments = items.reduce((s, i) => s + (i.comment_count || 0), 0);

    questionRows.push({
      source_content_id: qid,
      title: title.slice(0, 255),
      summary,
      category: KEYWORD_TO_CATEGORY[kw],
      tags: [first.source_keyword, first.content_type === 'article' ? '文章' : '问答'],
      view_count: totalVotes * 20 + totalComments * 5,
      answer_count: items.length,
      like_count: totalVotes,
      status: 'published',
      source_url: first.content_url || '',
      created_at: tsToIso(first.created_time),
    });
  }

  if (dryRun) {
    console.log(`  [dry-run] Would insert ${questionRows.length} questions`);
    console.log(`  [dry-run] Would insert ${contents.length} answers`);
    return { questionsInserted: 0, questionsSkipped: 0, answersInserted: 0, answersSkipped: 0 };
  }

  // Insert questions (handle conflicts)
  let qInserted = 0;
  let qSkipped = 0;
  const qBatches = chunk(questionRows, batchSize);
  for (const batch of qBatches) {
    const { data, error } = await supabase.from('money_questions').insert(batch).select('id, source_content_id');
    if (error) {
      // Try one-by-one for conflict handling
      for (const row of batch) {
        const { data: single, error: e } = await supabase
          .from('money_questions')
          .insert(row)
          .select('id, source_content_id')
          .single();
        if (e) {
          if (e.code === '23505' || e.message?.includes('duplicate')) {
            qSkipped++;
          } else {
            console.error('  Error inserting question:', e.message);
          }
        } else if (single) {
          qInserted++;
        }
      }
    } else if (data) {
      qInserted += data.length;
    }
  }

  // Get all question IDs (including previously existing ones)
  const allSourceIds = questionRows.map((r) => r.source_content_id);
  const questionMap = new Map<string, string>();
  const idChunks = chunk(allSourceIds, 500);
  for (const idChunk of idChunks) {
    const { data } = await supabase.from('money_questions').select('id, source_content_id').in('source_content_id', idChunk);
    if (data) {
      for (const q of data) {
        questionMap.set(q.source_content_id, q.id);
      }
    }
  }

  // Get expert IDs by name
  const { data: experts } = await supabase.from('money_experts').select('id, name');
  const expertMap = new Map<string, string>();
  if (experts) {
    for (const e of experts) {
      expertMap.set(e.name, e.id);
    }
  }

  // Build answer rows
  const answerRows: { question_id: string; expert_id: string | null; content: string; like_count: number; dislike_count: number; accepted: boolean; source_type: string; source_content_id: string; created_at: string }[] = [];
  for (const c of contents) {
    const qid = c.question_id || c.content_id;
    const questionId = questionMap.get(qid);
    if (!questionId) continue;

    const expertId = expertMap.get(c.user_nickname) || null;
    answerRows.push({
      question_id: questionId,
      expert_id: expertId,
      content: (c.content_text || '').slice(0, 2000),
      like_count: c.voteup_count || 0,
      dislike_count: 0,
      accepted: false,
      source_type: 'MANUAL',
      source_content_id: c.content_id,
      created_at: tsToIso(c.created_time),
    });
  }

  // Mark first answer per question as accepted
  const answered = new Map<string, boolean>();
  for (const a of answerRows) {
    if (!answered.has(a.question_id)) {
      a.accepted = true;
      answered.set(a.question_id, true);
    }
  }

  // Insert answers
  let aInserted = 0;
  let aSkipped = 0;
  const aBatches = chunk(answerRows, batchSize);
  for (const batch of aBatches) {
    const { error } = await supabase.from('money_answers').insert(batch);
    if (error) {
      for (const row of batch) {
        const { error: e } = await supabase.from('money_answers').insert(row);
        if (e) {
          if (e.code === '23505' || e.message?.includes('duplicate')) {
            aSkipped++;
          } else {
            console.error('  Error inserting answer:', e.message);
          }
        } else {
          aInserted++;
        }
      }
    } else {
      aInserted += batch.length;
    }
  }

  // Update accepted_answer_id on questions
  const { data: answers } = await supabase.from('money_answers').select('id, question_id').eq('accepted', true);
  if (answers && answers.length > 0) {
    for (const a of answers) {
      await supabase.from('money_questions').update({ accepted_answer_id: a.id }).eq('id', a.question_id).is('accepted_answer_id', null);
    }
  }

  return { questionsInserted: qInserted, questionsSkipped: qSkipped, answersInserted: aInserted, answersSkipped: aSkipped };
}

export async function runSync(
  contents: ZhihuContent[],
  creators: ZhihuCreator[],
  options: { dryRun: boolean; batchSize: number }
): Promise<SyncStats> {
  console.log(`\nStarting sync: ${contents.length} contents, ${creators.length} creators`);
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (no writes)' : 'LIVE'}\n`);

  console.log('[1/2] Syncing experts...');
  const expertStats = await syncExperts(creators, options.dryRun);
  console.log(`  → inserted: ${expertStats.expertsInserted}, skipped: ${expertStats.expertsSkipped}\n`);

  console.log('[2/2] Syncing questions and answers...');
  const qaStats = await syncQuestionsAndAnswers(contents, options.dryRun, options.batchSize);
  console.log(`  → questions: inserted ${qaStats.questionsInserted}, skipped ${qaStats.questionsSkipped}`);
  console.log(`  → answers: inserted ${qaStats.answersInserted}, skipped ${qaStats.answersSkipped}\n`);

  return {
    ...expertStats,
    ...qaStats,
  };
}
