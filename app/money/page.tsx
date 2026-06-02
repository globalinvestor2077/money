import type { Metadata } from 'next';
import { getHome } from '@/lib/moneyQa';
import MoneyPageClient from './MoneyPageClient';

export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: '金融问答 - 基金与保险知识服务',
  description: '专业金融知识问答平台，覆盖基金定投、ETF、保险配置、重疾险、医疗险等常见场景，提供通用知识解释与风险提示。',
  openGraph: {
    title: '金融问答 - 基金与保险知识服务',
    description: '专业金融知识问答平台，覆盖基金定投、ETF、保险配置、重疾险、医疗险等常见场景。'
  }
};

export default async function MoneyPage() {
  let initialHome;
  let ldJson = '';
  try {
    initialHome = await getHome();
    ldJson = JSON.stringify(buildFaqJsonLd(initialHome));
  } catch {
    // gracefully degrade — client will fetch
  }

  return (
    <>
      {ldJson ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson }}
        />
      ) : null}
      <MoneyPageClient initialHome={initialHome} />
    </>
  );
}

function buildFaqJsonLd(home: Awaited<ReturnType<typeof getHome>>) {
  const questions = [...home.hotQuestions, ...home.latestQuestions];
  const seen = new Set<string>();
  const unique = questions.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: unique.slice(0, 30).map((item) => ({
      '@type': 'Question',
      name: item.title,
      acceptedAnswer: {
        '@type': 'Answer',
        text: (item.acceptedAnswer?.content || item.summary || '').slice(0, 400)
      }
    }))
  };
}
