import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: '金融问答',
  description: '基金与保险知识问答服务'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
