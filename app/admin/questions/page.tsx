'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, Edit3, Trash2, X } from 'lucide-react';
import { getAdminToken } from '../auth';

interface QuestionRow {
  id: string;
  title: string;
  summary: string;
  category: 'fund' | 'insurance';
  tags: string[];
  status: 'published' | 'pending' | 'rejected';
  created_at: string;
  answer_count: number;
  accepted_answer?: { id: string; content: string; expert_id: string; source_type: string; expert?: { id: string; name: string } } | null;
}

interface ExpertRow {
  id: string;
  name: string;
  title: string;
}

interface EditForm {
  title: string;
  summary: string;
  category: 'fund' | 'insurance';
  tags: string;
  status: 'published' | 'pending' | 'rejected';
  answerContent: string;
  expertId: string;
}

const emptyForm: EditForm = { title: '', summary: '', category: 'fund', tags: '', status: 'published', answerContent: '', expertId: '' };

function authHeaders() {
  return { Authorization: `Bearer ${getAdminToken() || ''}`, 'Content-Type': 'application/json' };
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { loadQuestions(); }, [search, category, status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadExperts(); }, []);

  async function loadQuestions() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category !== 'all') params.set('category', category);
    if (status !== 'all') params.set('status', status);
    const res = await fetch(`/admin/api/questions?${params}`, { headers: authHeaders() });
    const data = await res.json();
    setQuestions(data.result || []);
    setLoading(false);
  }

  async function loadExperts() {
    const res = await fetch('/admin/api/experts', { headers: authHeaders() });
    const data = await res.json();
    setExperts(data.result || []);
  }

  async function startEdit(q: QuestionRow) {
    setEditing(q.id);
    setForm({
      title: q.title,
      summary: q.summary || '',
      category: q.category,
      tags: (q.tags || []).join('，'),
      status: q.status,
      answerContent: q.accepted_answer?.content || '',
      expertId: q.accepted_answer?.expert_id || ''
    });
    setShowCreate(false);
  }

  async function startCreate() {
    setShowCreate(true);
    setEditing(null);
    setForm(emptyForm);
  }

  function cancelEdit() {
    setEditing(null);
    setShowCreate(false);
    setForm(emptyForm);
  }

  async function handleSave() {
    setMessage('');
    const payload = {
      title: form.title,
      summary: form.summary,
      category: form.category,
      tags: form.tags.split(/[，,\s]+/).map(t => t.trim()).filter(Boolean),
      status: form.status,
      answerContent: form.answerContent,
      expertId: form.expertId || null
    };

    try {
      let res;
      if (editing) {
        res = await fetch(`/admin/api/questions/${editing}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
      } else {
        res = await fetch('/admin/api/questions', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      }
      const data = await res.json();
      if (data.success) {
        setMessage(editing ? '更新成功' : '创建成功');
        cancelEdit();
        loadQuestions();
      } else {
        setMessage(data.message || '保存失败');
      }
    } catch {
      setMessage('请求失败');
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`确定删除「${title}」吗？`)) return;
    const res = await fetch(`/admin/api/questions/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (data.success) {
      setMessage('已删除');
      loadQuestions();
    } else {
      setMessage(data.message || '删除失败');
    }
  }

  function categoryLabel(c: string) { return c === 'fund' ? '基金' : '保险'; }
  function statusLabel(s: string) {
    if (s === 'published') return '已发布';
    if (s === 'pending') return '待审核';
    return '已拒绝';
  }

  return (
    <div className="admin-questions">
      <div className="admin-page-head">
        <h1>问答管理</h1>
        <button className="admin-btn-primary" onClick={startCreate}><Plus size={16} />新建问答</button>
      </div>

      {message ? <div className="admin-toast" onClick={() => setMessage('')}>{message}</div> : null}

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={16} />
          <input placeholder="搜索问题标题..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="all">全部分类</option>
          <option value="fund">基金</option>
          <option value="insurance">保险</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">全部状态</option>
          <option value="published">已发布</option>
          <option value="pending">待审核</option>
          <option value="rejected">已拒绝</option>
        </select>
      </div>

      {(showCreate || editing) ? (
        <div className="admin-edit-panel">
          <div className="admin-edit-head">
            <h2>{editing ? '编辑问答' : '新建问答'}</h2>
            <button onClick={cancelEdit}><X size={18} /></button>
          </div>
          <div className="admin-edit-form">
            <label>标题<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
            <label>摘要<input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></label>
            <div className="admin-edit-row">
              <label>分类
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as 'fund' | 'insurance' })}>
                  <option value="fund">基金</option>
                  <option value="insurance">保险</option>
                </select>
              </label>
              <label>状态
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'published' | 'pending' | 'rejected' })}>
                  <option value="published">已发布</option>
                  <option value="pending">待审核</option>
                  <option value="rejected">已拒绝</option>
                </select>
              </label>
            </div>
            <label>标签（逗号分隔）<input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="基金, 定投" /></label>
            <label>来源
              <select value={form.expertId} onChange={e => setForm({ ...form, expertId: e.target.value })}>
                <option value="">不指定</option>
                {experts.map(e => <option key={e.id} value={e.id}>{e.name} - {e.title}</option>)}
              </select>
            </label>
            <label>回答内容<textarea rows={8} value={form.answerContent} onChange={e => setForm({ ...form, answerContent: e.target.value })} /></label>
            <div className="admin-edit-actions">
              <button onClick={cancelEdit}>取消</button>
              <button className="admin-btn-primary" onClick={handleSave}>{editing ? '保存修改' : '创建'}</button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="admin-table-empty">加载中...</div>
      ) : questions.length === 0 ? (
        <div className="admin-table-empty">暂无问答数据</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>分类</th>
                <th>标签</th>
                <th>状态</th>
                <th>回答</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {questions.map(q => (
                <tr key={q.id}>
                  <td className="admin-table-title">{q.title}</td>
                  <td><span className={`admin-badge badge-${q.category}`}>{categoryLabel(q.category)}</span></td>
                  <td>{(q.tags || []).slice(0, 3).map(t => <span key={t} className="admin-tag">{t}</span>)}</td>
                  <td><span className={`admin-status status-${q.status}`}>{statusLabel(q.status)}</span></td>
                  <td>{q.accepted_answer ? `${q.accepted_answer.source_type === 'AI' ? 'AI' : '人工'}` : '无'}</td>
                  <td>{new Date(q.created_at).toLocaleDateString('zh-CN')}</td>
                  <td className="admin-table-actions">
                    <button onClick={() => startEdit(q)} title="编辑"><Edit3 size={15} /></button>
                    <button onClick={() => handleDelete(q.id, q.title)} title="删除"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
