import type { Metadata, Viewport } from 'next';
import './styles.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '金融问答 - 基金与保险知识服务',
    template: '%s | 金融问答'
  },
  description: '专业金融知识问答平台，覆盖基金定投、ETF、保险配置、重疾险、医疗险等常见场景，提供通用知识解释与风险提示。',
  keywords: ['基金', '保险', '定投', 'ETF', '重疾险', '医疗险', '理财', '金融知识'],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '金融问答'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
