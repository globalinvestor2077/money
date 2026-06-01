import type { MetadataRoute } from 'next';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/money`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0
    },
    {
      url: `${siteUrl}/money?category=fund`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8
    },
    {
      url: `${siteUrl}/money?category=insurance`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8
    }
  ];

  const { data: questions } = await getSupabaseAdmin()
    .from('money_questions')
    .select('id, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(5000);

  const dynamicRoutes: MetadataRoute.Sitemap = (questions || []).map(
    (item: { id: string; created_at: string }) => ({
      url: `${siteUrl}/money/q/${item.id}`,
      lastModified: new Date(item.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.9
    })
  );

  return [...staticRoutes, ...dynamicRoutes];
}
