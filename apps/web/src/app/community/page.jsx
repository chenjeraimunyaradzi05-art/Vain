import { API_BASE } from '@/lib/apiBase';
import CommunityClient from './CommunityClient';

// SEO Metadata for Community Page
export const metadata = {
  title: 'Indigenous Community Forums',
  description: 'Join the Ngurra Pathways community. Connect with other First Nations professionals, share experiences, and support each other on your career journey.',
  keywords: ['Indigenous community', 'First Nations forums', 'Aboriginal networking', 'Indigenous professionals'],
  openGraph: {
    title: 'Indigenous Community Forums | Ngurra Pathways',
    description: 'Join the Ngurra Pathways community and connect with First Nations professionals.',
    url: 'https://ngurrapathways.life/community',
  },
  alternates: {
    canonical: '/community',
  },
};

/**
 * Community Page (Server Component)
 * Pre-fetches forum categories and topics at request time for fast first paint.
 */
export default async function CommunityPage() {
    let initialCategories = [];
    let initialTopics = [];

    try {
        // Use 127.0.0.1 to avoid Windows IPv6 localhost issues
        const serverApiBase = String(API_BASE || '')
            .replace('http://localhost', 'http://127.0.0.1')
            .replace('https://localhost', 'https://127.0.0.1');

        const [catRes, topicsRes] = await Promise.all([
            fetch(`${serverApiBase}/community/categories`, { cache: 'no-store' }).catch(() => null),
            fetch(`${serverApiBase}/community/topics/recent`, { cache: 'no-store' }).catch(() => null),
        ]);

        if (catRes?.ok) {
            const catData = await catRes.json();
            const cats = catData?.categories || catData || [];
            if (cats.length > 0) {
                initialCategories = cats;
            }
        }

        if (topicsRes?.ok) {
            const topicsData = await topicsRes.json();
            const topics = topicsData?.topics || topicsData || [];
            if (topics.length > 0) {
                initialTopics = topics;
            }
        }
    } catch {
        // Use empty arrays on error - client will fetch
    }

    return <CommunityClient initialCategories={initialCategories} initialTopics={initialTopics} />;
}
