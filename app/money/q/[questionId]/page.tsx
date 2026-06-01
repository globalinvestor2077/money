import type { Metadata } from 'next';
import { getQuestion } from '@/lib/moneyQa';
import { MoneyDetailClient } from './MoneyDetailClient';
import type { MoneyQaQuestion } from '@/lib/types';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata({
  params
}: {
  params: Promise<{ questionId: string }>;
}): Promise<Metadata> {
  try {
    const { questionId } = await params;
    const question = await getQuestion(questionId);
    if (question) {
      return {
        title: question.title,
        description: question.summary || question.title,
        openGraph: {
          title: question.title,
          description: question.summary || question.title
        }
      };
    }
  } catch {
    // gracefully degrade — client will fetch
  }
  return { title: '金融问答' };
}

export default async function MoneyDetailPage({
  params
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;

  let question;
  let ldJson = '';
  try {
    question = await getQuestion(questionId);
  } catch {
    // gracefully degrade — client will fetch
  }

  if (question) {
    ldJson = JSON.stringify(buildFaqJsonLd(question));
  }

  return (
    <>
      {ldJson ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson }}
        />
      ) : null}
      <MoneyDetailClient questionId={questionId} initialQuestion={question || undefined} />
    </>
  );
}

function buildFaqJsonLd(question: MoneyQaQuestion) {
  const categoryText = question.category === 'fund' ? '基金问答' : '保险问答';
  const answerText = question.acceptedAnswer?.content || question.summary || '暂无回答';

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `[${categoryText}] ${question.title}`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answerText.slice(0, 500)
        }
      }
    ]
  };
}
