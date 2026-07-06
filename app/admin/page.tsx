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
  const [progress, setProgress] = useState('');
  const [loopCount, setLoopCount] = useState(10);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStats() {
    try {
      const token = getAdminToken();
      if (!token) return;

      const res = await fetch('/admin/api/stats', { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.result) {
        setStats({
          questions: data.result.questions || 0,
          answers: data.result.answers || 0,
          experts: data.result.experts || 0
        });
      }
    } catch { /* ignore */ }
  }

  async function handleGenerate() {
    const rounds = Math.max(1, Math.min(50, loopCount || 1));
    setGenerating(true);
    setMessage('');
    setProgress(`开始生成：${rounds} 轮 × 每轮 3 条（预计 ${rounds * 3} 条）…`);

    let total = 0;
    let failed = 0;
    let consecutiveFails = 0;
    let lastReason = '';
    let aborted = false;

    for (let i = 1; i <= rounds; i += 1) {
      setProgress(`正在生成 ${i}/${rounds} 轮，已生成 ${total} 条…`);
      try {
        const res = await fetch('/admin/api/generate', { method: 'POST', headers: authHeaders() });
        const data = await res.json();
        if (res.ok && data.success) {
          total += data.result?.generated || 0;
          consecutiveFails = 0;
        } else {
          failed += 1;
          consecutiveFails += 1;
          lastReason = data.message || '生成失败';
        }
      } catch {
        failed += 1;
        consecutiveFails += 1;
        lastReason = '请求失败';
      }

      // 连续 3 轮失败，多半是持久性错误（额度/Key/限流），不再继续浪费
      if (consecutiveFails >= 3) {
        aborted = true;
        break;
      }
    }

    setProgress('');
    loadStats();
    const summary = aborted
      ? `已中止：共生成 ${total} 条，连续失败 3 轮（${lastReason}）`
      : `完成：共生成 ${total} 条${failed ? `（${failed} 轮失败，原因：${lastReason}）` : ''}`;
    setMessage(summary);
    setGenerating(false);
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-page-head">
        <h1>首页概览</h1>
        <div className="admin-generate-bar">
          <label className="admin-loop-input">
            <span>循环</span>
            <input
              type="number"
              min={1}
              max={50}
              value={loopCount}
              disabled={generating}
              onChange={(event) => setLoopCount(Math.max(1, Math.min(50, Number(event.target.value) || 1)))}
            />
            <span>次 · 每次3条</span>
          </label>
          <button className="admin-btn-primary" onClick={handleGenerate} disabled={generating}>
            <Zap size={16} />
            {generating ? '生成中…' : 'AI 生成内容'}
          </button>
        </div>
      </div>

      {generating && progress ? <div className="admin-toast">{progress}</div> : null}
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
          <span>知识库</span>
        </div>
      </div>

      <div className="admin-quick-actions">
        <h2>快捷操作</h2>
        <div className="admin-action-grid">
          <button onClick={handleGenerate} disabled={generating}>AI 批量生成问答</button>
          <button onClick={() => router.push('/admin/questions')}>管理问答内容</button>
          <button onClick={() => router.push('/admin/experts')}>管理知识库信息</button>
        </div>
      </div>
    </div>
  );
}
