'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Send, Sparkles } from 'lucide-react';
import { getMoneyQaHome, getMoneyQaQuestions, submitMoneyQaQuestion } from './api';
import type { MoneyQaCategory, MoneyQaHome, MoneyQaQuestion } from '@/lib/types';

type CategoryFilter = MoneyQaCategory | 'all';

const PAGE_SIZE = 10;
const MOBILE_BREAKPOINT = '(max-width: 768px)';

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
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [searchNonce, setSearchNonce] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<() => void>(() => {});
  const [askOpen, setAskOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
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
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_BREAKPOINT);
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  // 过滤 / 搜索 / 模式切换 → 回到第 1 页、替换列表
  useEffect(() => {
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, selectedTag, sort, searchNonce, isMobile]);

  // 移动端无限滚动：监听底部哨兵，进入视口则追加下一页
  useEffect(() => {
    if (!isMobile) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isMobile, questions.length]);

  async function fetchPage(targetPage: number, append: boolean, nextKeyword = keyword) {
    const setLoadingState = append ? setLoadingMore : setLoading;
    setLoadingState(true);
    try {
      const data = await getMoneyQaQuestions({
        category: activeCategory,
        keyword: nextKeyword,
        tag: selectedTag,
        sort,
        page: targetPage,
        pageSize: PAGE_SIZE
      });
      setQuestions((prev) => (append ? [...prev, ...data.items] : data.items));
      setPage(data.page);
      setPagination({ total: data.total, totalPages: data.totalPages });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoadingState(false);
    }
  }

  function loadMore() {
    if (loadingMore || page >= pagination.totalPages) return;
    void fetchPage(page + 1, true);
  }
  loadMoreRef.current = loadMore;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  function setCategory(category: CategoryFilter) {
    setActiveCategory(category);
    setSelectedTag('');
    setPage(1);
  }

  function selectTag(tag: string, category: MoneyQaCategory) {
    setSelectedTag(tag);
    setActiveCategory(category);
    setPage(1);
  }

  function changeSort(value: 'hot' | 'latest') {
    setSort(value);
    setPage(1);
  }

  function goToPage(next: number) {
    const target = Math.min(Math.max(next, 1), pagination.totalPages);
    if (target === page) return;
    void fetchPage(target, false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function resetFilters() {
    setActiveCategory('all');
    setSelectedTag('');
    setKeyword('');
    setPage(1);
    setSearchNonce((value) => value + 1);
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
          <span className="brand-mark">问</span>
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
              setPage(1);
              setSearchNonce((value) => value + 1);
            }}
          >
            <label className="search-input">
              <Search size={18} />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索基金、保险、定投、重疾险等问题"
              />
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
                  <button key={option.value} type="button" className={sort === option.value ? 'active' : ''} onClick={() => changeSort(option.value)}>
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

            {!loading && !isMobile && pagination.totalPages > 1 ? (
              <nav className="pagination" aria-label="分页">
                <button
                  type="button"
                  className="page-nav"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="上一页"
                >
                  <ChevronLeft size={16} />
                  <span>上一页</span>
                </button>
                <div className="page-numbers">
                  {buildPageList(page, pagination.totalPages).map((entry, index) =>
                    entry === 'ellipsis' ? (
                      <span key={`gap-${index}`} className="page-ellipsis" aria-hidden="true">
                        …
                      </span>
                    ) : (
                      <button
                        key={entry}
                        type="button"
                        className={entry === page ? 'page-btn active' : 'page-btn'}
                        onClick={() => goToPage(entry)}
                        aria-current={entry === page ? 'page' : undefined}
                      >
                        {entry}
                      </button>
                    )
                  )}
                </div>
                <button
                  type="button"
                  className="page-nav"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                  aria-label="下一页"
                >
                  <span>下一页</span>
                  <ChevronRight size={16} />
                </button>
              </nav>
            ) : null}

            {isMobile && questions.length > 0 ? (
              <div className="infinite-footer">
                <div ref={sentinelRef} className="infinite-sentinel" aria-hidden="true" />
                <p className="infinite-status">
                  {loadingMore ? '加载更多中…' : page >= pagination.totalPages ? '没有更多了' : ''}
                </p>
              </div>
            ) : null}

            {!loading && questions.length > 0 ? (
              <p className="pagination-summary">
                {isMobile
                  ? `已加载 ${questions.length} / 共 ${pagination.total} 条问答`
                  : `共 ${pagination.total} 条问答 · 第 ${page}/${pagination.totalPages} 页`}
              </p>
            ) : null}
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
              <h2>热门话题</h2>
              {(home?.topics || []).slice(0, 8).map((topic) => (
                <button
                  key={`${topic.category}-${topic.label}`}
                  type="button"
                  className="hot-item"
                  onClick={() => selectTag(topic.label, topic.category)}
                >
                  <span>{topic.category === 'fund' ? '基金' : '保险'}</span>
                  <strong>{topic.label}</strong>
                </button>
              ))}
            </section>
          </aside>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-links">
          <span>AI资源</span>
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
              <input
                maxLength={80}
                value={askForm.title}
                onChange={(event) => setAskForm({ ...askForm, title: event.target.value })}
                placeholder="例如：基金定投需要看哪些指标？"
              />
            </label>
            <label>
              问题补充
              <textarea
                rows={5}
                value={askForm.content}
                onChange={(event) => setAskForm({ ...askForm, content: event.target.value })}
                placeholder="补充你的疑问，避免填写身份证、银行卡、保单号等敏感信息"
              />
            </label>
            <label>
              标签
              <input
                value={askForm.tags}
                onChange={(event) => setAskForm({ ...askForm, tags: event.target.value })}
                placeholder="用逗号或空格分隔，最多 5 个"
              />
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

function buildPageList(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push('ellipsis');
  for (let value = start; value <= end; value += 1) pages.push(value);
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}
