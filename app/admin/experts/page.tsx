'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, X } from 'lucide-react';
import { getAdminToken } from '../auth';

interface ExpertRow {
  id: string;
  name: string;
  title: string;
  organization: string;
  avatar_text: string;
  answer_count: number;
  helpful_rate: number;
  created_at: string;
}

interface EditForm {
  name: string;
  title: string;
  organization: string;
  avatarText: string;
}

const emptyForm: EditForm = { name: '', title: '知识整理', organization: '本站内容库', avatarText: '' };

function authHeaders() {
  return { Authorization: `Bearer ${getAdminToken() || ''}`, 'Content-Type': 'application/json' };
}

export default function AdminExpertsPage() {
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [message, setMessage] = useState('');

  useEffect(() => { loadExperts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadExperts() {
    const res = await fetch('/admin/api/experts', { headers: authHeaders() });
    const data = await res.json();
    setExperts(data.result || []);
    setLoading(false);
  }

  function startEdit(e: ExpertRow) {
    setEditing(e.id);
    setShowCreate(false);
    setForm({ name: e.name, title: e.title, organization: e.organization, avatarText: e.avatar_text });
  }

  function startCreate() {
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
    if (!form.name.trim()) { setMessage('请输入来源名称'); return; }

    const payload = { ...form, avatarText: form.avatarText || form.name.slice(0, 1) };

    try {
      let res;
      if (editing) {
        res = await fetch(`/admin/api/experts/${editing}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
      } else {
        res = await fetch('/admin/api/experts', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      }
      const data = await res.json();
      if (data.success) {
        setMessage(editing ? '更新成功' : '创建成功');
        cancelEdit();
        loadExperts();
      } else {
        setMessage(data.message || '保存失败');
      }
    } catch {
      setMessage('请求失败');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定删除「${name}」吗？`)) return;
    const res = await fetch(`/admin/api/experts/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (data.success) {
      setMessage('已删除');
      loadExperts();
    } else {
      setMessage(data.message || '删除失败');
    }
  }

  return (
    <div className="admin-experts">
      <div className="admin-page-head">
        <h1>知识库管理</h1>
        <button className="admin-btn-primary" onClick={startCreate}><Plus size={16} />新建条目</button>
      </div>

      {message ? <div className="admin-toast" onClick={() => setMessage('')}>{message}</div> : null}

      {(showCreate || editing) ? (
        <div className="admin-edit-panel">
          <div className="admin-edit-head">
            <h2>{editing ? '编辑条目' : '新建条目'}</h2>
            <button onClick={cancelEdit}><X size={18} /></button>
          </div>
          <div className="admin-edit-form">
            <label>来源名称<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="来源名称" /></label>
            <label>分类标签<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="如：基金科普" /></label>
            <label>来源<input value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} placeholder="如：本站内容库" /></label>
            <label>头像文字（1字）<input value={form.avatarText} onChange={e => setForm({ ...form, avatarText: e.target.value })} maxLength={1} placeholder="自动取来源首字" /></label>
            <div className="admin-edit-actions">
              <button onClick={cancelEdit}>取消</button>
              <button className="admin-btn-primary" onClick={handleSave}>{editing ? '保存修改' : '创建'}</button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="admin-table-empty">加载中...</div>
      ) : experts.length === 0 ? (
        <div className="admin-table-empty">暂无数据</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>头像</th>
                <th>来源名称</th>
                <th>分类</th>
                <th>来源</th>
                <th>回答数</th>
                <th>好评率</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {experts.map(e => (
                <tr key={e.id}>
                  <td><span className="admin-avatar">{e.avatar_text || e.name.slice(0, 1)}</span></td>
                  <td className="admin-table-title">{e.name}</td>
                  <td>{e.title}</td>
                  <td>{e.organization}</td>
                  <td>{e.answer_count || 0}</td>
                  <td>{e.helpful_rate || 95}%</td>
                  <td className="admin-table-actions">
                    <button onClick={() => startEdit(e)} title="编辑"><Edit3 size={15} /></button>
                    <button onClick={() => handleDelete(e.id, e.name)} title="删除"><Trash2 size={15} /></button>
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
