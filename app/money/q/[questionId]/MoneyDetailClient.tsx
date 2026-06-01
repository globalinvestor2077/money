'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getMoneyQaQuestionDetail } from '../../api';
import type { MoneyQaCategory, MoneyQaQuestion } from '@/lib/types';

export function MoneyDetailClient({
  questionId,
  initialQuestion
}: {
  questionId: string;
  initialQuestion?: MoneyQaQuestion;
}) {
  const [question, setQuestion] = useState<MoneyQaQuestion | undefined>(initialQuestion);
  const [loading, setLoading] = useState(!initialQuestion);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialQuestion) return;
    setLoading(true);
    getMoneyQaQuestionDetail(questionId)
      .then(setQuestion)
      .catch((exception) => setError(exception instanceof Error ? exception.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [questionId, initialQuestion]);

  const answerParagraphs = useMemo(() => {
    const content = question?.acceptedAnswer?.content || '';
    return content.split('\n').filter(Boolean);
  }, [question?.acceptedAnswer?.content]);

  return (
    <div className="detail-page">
      <header className="detail-header">
        <button type="button" className="back-button" onClick={() => (window.location.href = '/money')}>
          <ArrowLeft size={16} />
          返回问答首页
        </button>
        <strong>金融问答</strong>
      </header>

      <main className="detail-shell">
        {loading ? <div className="empty-state">加载中...</div> : null}
        {!loading && error ? <div className="empty-state">{error}</div> : null}
        {!loading && !error && question ? (
          <>
            <article className="question-card">
              <div className="meta-row">
                <span className={`category-badge ${question.category}`}>{categoryText(question.category)}</span>
                <span>{question.createdAt}</span>
                <span>{question.viewCount} 浏览</span>
                <span>{question.answerCount} 回答</span>
              </div>
              <h1>{question.title}</h1>
              <p>{question.summary}</p>
              <div className="tag-row readonly">
                {question.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </article>

            {question.acceptedAnswer ? (
              <section className="answer-card">
                <div className="answer-head">
                  <div className="expert-avatar">{question.acceptedAnswer.expert.avatarText}</div>
                  <div>
                    <strong>{question.acceptedAnswer.expert.name}</strong>
                    <span>
                      {question.acceptedAnswer.expert.title} / {question.acceptedAnswer.expert.organization}
                    </span>
                  </div>
                  {question.acceptedAnswer.accepted ? <span className="answer-chip">推荐回答</span> : null}
                  <span className="answer-chip">{question.acceptedAnswer.sourceType === 'AI' ? 'AI 草稿' : '人工回答'}</span>
                </div>
                <div className="answer-content">
                  {answerParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <div className="feedback-row">
                  <span>{question.acceptedAnswer.likeCount} 有帮助</span>
                  <span>{question.acceptedAnswer.dislikeCount} 无帮助</span>
                </div>
              </section>
            ) : null}

          </>
        ) : null}
      </main>
    </div>
  );
}

function categoryText(category: MoneyQaCategory) {
  return category === 'fund' ? '基金问答' : '保险问答';
}
