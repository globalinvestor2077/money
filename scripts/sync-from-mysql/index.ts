import 'dotenv/config';
import { getConfigFromEnv, query } from './mysqlClient';
import { runSync } from './sync';
import type { ZhihuContent, ZhihuCreator } from './types';
import { VALID_KEYWORDS } from './types';

function printHelp() {
  console.log(`
Usage: pnpm sync:mysql [options]

Options:
  --dry-run          Preview what would be synced, no writes to Supabase
  --keyword <kw>     Filter by source_keyword (基金 or 保险). Can repeat.
  --batch-size <n>   Supabase insert batch size (default: 500)
  --help             Show usage
`);
}

interface CliArgs {
  dryRun: boolean;
  keywords: string[];
  batchSize: number;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false, keywords: [], batchSize: 500, help: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--help') args.help = true;
    else if (argv[i] === '--keyword' && argv[i + 1]) {
      args.keywords.push(argv[++i]);
    } else if (argv[i] === '--batch-size' && argv[i + 1]) {
      args.batchSize = parseInt(argv[++i], 10) || 500;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Validate keywords
  const keywords = args.keywords.length > 0 ? args.keywords : [...VALID_KEYWORDS];
  for (const kw of keywords) {
    if (!(VALID_KEYWORDS as readonly string[]).includes(kw)) {
      console.error(`Invalid keyword: ${kw}. Valid options: ${VALID_KEYWORDS.join(', ')}`);
      process.exit(1);
    }
  }

  console.log('=== MySQL → Supabase Sync ===');
  console.log(`Keywords: ${keywords.join(', ')}`);

  // Connect to MySQL
  const mysqlConfig = getConfigFromEnv();

  // Fetch content
  console.log('\n[1/3] Fetching content from MySQL...');
  const placeholders = keywords.map(() => '?').join(',');
  const contents = await query<ZhihuContent>(
    mysqlConfig,
    `select * from zhihu_content where source_keyword in (${placeholders}) order by question_id, created_time`,
    keywords
  );

  const byKeyword = new Map<string, number>();
  for (const c of contents) {
    byKeyword.set(c.source_keyword, (byKeyword.get(c.source_keyword) || 0) + 1);
  }
  const summary = [...byKeyword.entries()].map(([k, v]) => `${k}: ${v}`).join(', ');
  console.log(`  Found ${contents.length} rows (${summary || 'empty'})`);

  if (contents.length === 0) {
    console.log('No data to sync. Exiting.');
    process.exit(0);
  }

  // Fetch creators
  console.log('\n[2/3] Fetching creators from MySQL...');
  const userIds = [...new Set(contents.map((c) => c.user_id).filter(Boolean))];
  let creators: ZhihuCreator[] = [];
  if (userIds.length > 0) {
    const idPlaceholders = userIds.map(() => '?').join(',');
    creators = await query<ZhihuCreator>(
      mysqlConfig,
      `select * from zhihu_creator where user_id in (${idPlaceholders})`,
      userIds
    );
  }
  console.log(`  Found ${creators.length} creators`);

  // Run sync
  console.log('\n[3/3] Syncing to Supabase...');
  const stats = await runSync(contents, creators, { dryRun: args.dryRun, batchSize: args.batchSize });

  // Summary
  console.log('=== Sync Complete ===');
  console.log(`Experts:    +${stats.expertsInserted} (skipped ${stats.expertsSkipped})`);
  console.log(`Questions:  +${stats.questionsInserted} (skipped ${stats.questionsSkipped})`);
  console.log(`Answers:    +${stats.answersInserted} (skipped ${stats.answersSkipped})`);

  if (args.dryRun) {
    console.log('\n(DRY RUN - no data was written)');
  }
}

main().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
