'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAdminToken } from '../auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || '登录失败');
        return;
      }
      setAdminToken(data.result.token);
      router.push('/admin');
    } catch {
      setError('网络错误');
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-form" onSubmit={handleLogin}>
        <h1>后台管理</h1>
        <p>金融问答系统</p>
        <label>
          管理密码
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入管理密码" autoFocus />
        </label>
        {error ? <div className="admin-login-error">{error}</div> : null}
        <button type="submit">登 录</button>
      </form>
    </div>
  );
}
