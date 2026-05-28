'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, FileText, MessageSquare, Users } from 'lucide-react';
import { getAdminToken } from './auth';

interface Stats {
  questions: number;
  answers: number;
  experts: number;
}

function authHeaders() {
  return { Authorization: `Bearer ${getAdminToken() || ''}`, 'Content-Type': 'application/json' };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ questions: 0, answers: 0, experts: 0 });
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStats() {
    try {
      const token = getAdminToken();
      if (!token) return;

      const [qRes, eRes] = await Promise.all([
        fetch('/admin/api/questions?status=all', { headers: authHeaders() }),
        fetch('/admin/api/experts', { headers: authHeaders() })
      ]);
      const [qData, eData] = await Promise.all([qRes.json(), eRes.json()]);
      const questions = qData.result || [];
      setStats({
        questions: questions.length,
        answers: questions.filter((q: { accepted_answer: unknown }) => q.accepted_answer).length,
        experts: (eData.result || []).length
      });
    } catch { /* ignore */ }
  }

  async function handleGenerate() {
    setGenerating(true);
    setMessage('');
    try {
      const res = await fetch('/admin/api/generate', { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setMessage(`成功生成 ${data.result.generated} 条问答内容`);
        loadStats();
      } else {
        setMessage(data.message || '生成失败');
      }
    } catch {
      setMessage('请求失败');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-page-head">
        <h1>首页概览</h1>
        <button className="admin-btn-primary" onClick={handleGenerate} disabled={generating}>
          <Zap size={16} />
          {generating ? 'AI 生成中...' : 'AI 生成内容'}
        </button>
      </div>

      {message ? <div className="admin-toast">{message}</div> : null}

      <div className="admin-stats-grid">
        <div className="admin-stat-card" onClick={() => router.push('/admin/questions')}>
          <FileText size={28} />
          <strong>{stats.questions}</strong>
          <span>问答总数</span>
        </div>
        <div className="admin-stat-card">
          <MessageSquare size={28} />
          <strong>{stats.answers}</strong>
          <span>已回答</span>
        </div>
        <div className="admin-stat-card" onClick={() => router.push('/admin/experts')}>
          <Users size={28} />
          <strong>{stats.experts}</strong>
          <span>作者</span>
        </div>
      </div>

      <div className="admin-quick-actions">
        <h2>快捷操作</h2>
        <div className="admin-action-grid">
          <button onClick={handleGenerate} disabled={generating}>AI 批量生成问答</button>
          <button onClick={() => router.push('/admin/questions')}>管理问答内容</button>
          <button onClick={() => router.push('/admin/experts')}>管理作者信息</button>
        </div>
      </div>
    </div>
  );
}
