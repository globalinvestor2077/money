'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Search, Send, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { getMoneyQaHome, getMoneyQaQuestions, submitMoneyQaQuestion, generateMoneyQaContent } from './api';
import type { MoneyQaCategory, MoneyQaHome, MoneyQaQuestion } from '@/lib/types';

type CategoryFilter = MoneyQaCategory | 'all';

const sortOptions = [
  { label: '热门', value: 'hot' },
  { label: '最新', value: 'latest' }
] as const;

export default function MoneyPageClient({ initialHome }: { initialHome?: MoneyQaHome }) {
  const [home, setHome] = useState<MoneyQaHome | undefined>(initialHome);
  const [questions, setQuestions] = useState<MoneyQaQuestion[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [selectedTag, setSelectedTag] = useState('');
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState<'hot' | 'latest'>('hot');
  const [loading, setLoading] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [generating, setGenerating] = useState(false);
  const [askForm, setAskForm] = useState({
    category: 'fund' as MoneyQaCategory,
    title: '',
    content: '',
    tags: ''
  });

  const categoryTitle = useMemo(() => {
    if (activeCategory === 'fund') return '基金问答';
    if (activeCategory === 'insurance') return '保险问答';
    return '全部问答';
  }, [activeCategory]);

  const visibleTopics = useMemo(() => {
    const topics = home?.topics || [];
    if (activeCategory === 'all') {
      return topics.slice(0, 8);
    }
    return topics.filter((item) => item.category === activeCategory).slice(0, 8);
  }, [activeCategory, home?.topics]);

  useEffect(() => {
    if (initialHome) return;
    getMoneyQaHome().then(setHome).catch((error) => showToast(error.message));
  }, [initialHome]);

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, selectedTag, sort]);

  async function loadQuestions(nextKeyword = keyword) {
    setLoading(true);
    try {
      const data = await getMoneyQaQuestions({
        category: activeCategory,
        keyword: nextKeyword,
        tag: selectedTag,
        sort
      });
      setQuestions(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  function setCategory(category: CategoryFilter) {
    setActiveCategory(category);
    setSelectedTag('');
  }

  function selectTag(tag: string, category: MoneyQaCategory) {
    setSelectedTag(tag);
    setActiveCategory(category);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generateMoneyQaContent();
      showToast(`成功生成 ${result.generated} 条问答内容`);
      const homeData = await getMoneyQaHome();
      setHome(homeData);
      loadQuestions();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '内容生成失败');
    } finally {
      setGenerating(false);
    }
  }

  function resetFilters() {
    setActiveCategory('all');
    setSelectedTag('');
    setKeyword('');
  }

  function showAskModal() {
    setAskForm((value) => ({
      ...value,
      category: activeCategory === 'insurance' ? 'insurance' : 'fund'
    }));
    setAskOpen(true);
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = askForm.title.trim();
    const content = askForm.content.trim();
    if (!title || !content) {
      showToast('请补充问题标题和内容');
      return;
    }

    setSubmitting(true);
    try {
      await submitMoneyQaQuestion({
        category: askForm.category,
        title,
        content,
        tags: askForm.tags
          .split(/[，,\s]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      });
      showToast('问题已提交，审核通过后会展示');
      setAskOpen(false);
      setAskForm({ category: 'fund', title: '', content: '', tags: '' });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="money-page">
      <header className="site-header">
        <button className="brand" type="button" onClick={resetFilters}>
          <span className="brand-mark">金</span>
          <span>
            <strong>金融问答</strong>
            <small>基金与保险知识服务</small>
          </span>
        </button>
        <nav className="nav-tabs" aria-label="问答频道">
          <button type="button" className={activeCategory === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>
            全部问答
          </button>
          <button type="button" className={activeCategory === 'fund' ? 'active' : ''} onClick={() => setCategory('fund')}>
            基金问答
          </button>
          <button type="button" className={activeCategory === 'insurance' ? 'active' : ''} onClick={() => setCategory('insurance')}>
            保险问答
          </button>
        </nav>
        <div className="header-actions">
          <button className="generate-button" type="button" onClick={handleGenerate} disabled={generating}>
            <Zap size={16} />
            {generating ? '生成中...' : 'AI 生成内容'}
          </button>
          <button className="primary-button" type="button" onClick={showAskModal}>
            <Send size={16} />
            我要提问
          </button>
        </div>
      </header>

      <main className="content-shell">
        <section className="search-band">
          <div className="search-copy">
            <div className="eyebrow">
              <Sparkles size={16} />
              公开知识问答
            </div>
            <h1>基金问答和保险问答</h1>
            <p>面向基金、ETF、定投、保障配置、重疾险、医疗险等常见场景，提供通用知识解释和风险提示。</p>
          </div>
          <form
            className="search-box"
            onSubmit={(event) => {
              event.preventDefault();
              loadQuestions();
            }}
          >
            <label className="search-input">
              <Search size={18} />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索基金、保险、定投、重疾险等问题" />
              <button type="submit">搜索</button>
            </label>
            <div className="quick-tags">
              {visibleTopics.map((topic) => (
                <button key={`${topic.category}-${topic.label}`} type="button" onClick={() => selectTag(topic.label, topic.category)}>
                  {topic.label}
                </button>
              ))}
            </div>
          </form>
          <div className="stats-row">
            <div>
              <strong>{home?.stats.questionCount || 0}</strong>
              <span>问题</span>
            </div>
            <div>
              <strong>{home?.stats.answerCount || 0}</strong>
              <span>回答</span>
            </div>
            <div>
              <strong>{home?.stats.expertCount || 0}</strong>
              <span>作者</span>
            </div>
          </div>
        </section>

        <section className="main-grid">
          <div className="feed-panel">
            <div className="section-head">
              <div>
                <h2>{categoryTitle}</h2>
                <p>{selectedTag ? `当前标签：${selectedTag}` : '精选公开问答'}</p>
              </div>
              <div className="segmented">
                {sortOptions.map((option) => (
                  <button key={option.value} type="button" className={sort === option.value ? 'active' : ''} onClick={() => setSort(option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="empty-state">加载中...</div>
            ) : questions.length ? (
              <div className="question-list">
                {questions.map((item) => (
                  <article key={item.id} className="question-item" onClick={() => (window.location.href = `/money/q/${item.id}`)}>
                    <div className="question-metrics">
                      <strong>{item.answerCount}</strong>
                      <span>回答</span>
                      <strong>{item.viewCount}</strong>
                      <span>浏览</span>
                    </div>
                    <div className="question-body">
                      <div className="question-title">
                        <span className={`category-badge ${item.category}`}>{categoryText(item.category)}</span>
                        <h3>{item.title}</h3>
                      </div>
                      <p>{item.summary}</p>
                      <div className="tag-row">
                        {item.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectTag(tag, item.category);
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      {item.acceptedAnswer ? (
                        <div className="answer-preview">
                          <span>{item.acceptedAnswer.expert.name}</span>
                          <p>{item.acceptedAnswer.content}</p>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">暂无匹配问答</div>
            )}
          </div>

          <aside className="side-panel">
            <section className="side-section">
              <h2>热门问答</h2>
              {(home?.hotQuestions || []).map((item) => (
                <button key={item.id} type="button" className="hot-item" onClick={() => (window.location.href = `/money/q/${item.id}`)}>
                  <span>{categoryText(item.category)}</span>
                  <strong>{item.title}</strong>
                </button>
              ))}
            </section>

            <section className="side-section">
              <h2>推荐作者</h2>
              {(home?.experts || []).map((expert) => (
                <div key={expert.id} className="expert-item">
                  <div className="expert-avatar">{expert.avatarText}</div>
                  <div>
                    <strong>{expert.name}</strong>
                    <span>{expert.title}</span>
                    <small>
                      {expert.answerCount} 个回答 / {expert.helpfulRate}% 有帮助
                    </small>
                  </div>
                </div>
              ))}
            </section>

            <section className="side-section notice-section">
              <h2>
                <ShieldCheck size={18} />
                内容边界
              </h2>
              <p>页面仅做知识科普和概念解释，不提供基金买卖建议、收益承诺、保险方案设计或投保代办。</p>
            </section>
          </aside>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-links">
          <span>AI / SEO 资源</span>
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">Sitemap</a>
          <a href="/robots.txt" target="_blank" rel="noopener noreferrer">Robots</a>
          <a href="/llms.txt" target="_blank" rel="noopener noreferrer">LLMs.txt</a>
          <a href="/agent.md" target="_blank" rel="noopener noreferrer">Agent 接入</a>
        </div>
      </footer>

      {askOpen ? (
        <div className="modal-mask" role="dialog" aria-modal="true">
          <form className="ask-modal" onSubmit={submitQuestion}>
            <div className="modal-head">
              <h2>提交问题</h2>
              <button type="button" onClick={() => setAskOpen(false)}>
                关闭
              </button>
            </div>
            <label>
              问题类型
              <select value={askForm.category} onChange={(event) => setAskForm({ ...askForm, category: event.target.value as MoneyQaCategory })}>
                <option value="fund">基金问答</option>
                <option value="insurance">保险问答</option>
              </select>
            </label>
            <label>
              问题标题
              <input maxLength={80} value={askForm.title} onChange={(event) => setAskForm({ ...askForm, title: event.target.value })} placeholder="例如：基金定投需要看哪些指标？" />
            </label>
            <label>
              问题补充
              <textarea rows={5} value={askForm.content} onChange={(event) => setAskForm({ ...askForm, content: event.target.value })} placeholder="补充你的疑问，避免填写身份证、银行卡、保单号等敏感信息" />
            </label>
            <label>
              标签
              <input value={askForm.tags} onChange={(event) => setAskForm({ ...askForm, tags: event.target.value })} placeholder="用逗号或空格分隔，最多 5 个" />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setAskOpen(false)}>
                取消
              </button>
              <button type="submit" disabled={submitting}>
                {submitting ? '提交中...' : '提交'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function categoryText(category: MoneyQaCategory) {
  return category === 'fund' ? '基金' : '保险';
}
