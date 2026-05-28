'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FileText, Users, LogOut, ExternalLink } from 'lucide-react';
import { getAdminToken, clearAdminToken } from './login/page';

const navItems = [
  { href: '/admin', label: '首页概览', icon: LayoutDashboard },
  { href: '/admin/questions', label: '问答管理', icon: FileText },
  { href: '/admin/experts', label: '作者管理', icon: Users }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setChecking(false);
      return;
    }
    const token = getAdminToken();
    if (!token) {
      router.replace('/admin/login');
    } else {
      setAuthorized(true);
      setChecking(false);
    }
  }, [pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;

  if (checking) {
    return <div className="admin-loading">检查登录状态...</div>;
  }

  if (!authorized) return null;

  function handleLogout() {
    clearAdminToken();
    router.replace('/admin/login');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">管</span>
          <strong>后台管理</strong>
        </div>
        <nav className="admin-nav">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'active' : ''}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <a href="/money" target="_blank" rel="noopener noreferrer" className="admin-nav-link">
            <ExternalLink size={18} />
            查看网站
          </a>
          <button onClick={handleLogout} className="admin-nav-link">
            <LogOut size={18} />
            退出登录
          </button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
