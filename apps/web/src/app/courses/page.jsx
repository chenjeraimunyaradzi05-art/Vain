import { API_BASE } from '@/lib/apiBase';
import CoursesClient from './CoursesClient';

// SEO Metadata for Courses Page
export const metadata = {
  title: 'Indigenous Training & Courses',
  description: 'Explore culturally-grounded training courses for First Nations people. TAFE courses, certifications, and professional development designed with Indigenous perspectives.',
  keywords: ['Indigenous courses', 'First Nations training', 'Aboriginal education', 'TAFE Indigenous', 'culturally safe learning'],
  openGraph: {
    title: 'Indigenous Training & Courses | Ngurra Pathways',
    description: 'Explore culturally-grounded training courses for First Nations people.',
    url: 'https://ngurrapathways.life/courses',
  },
  alternates: {
    canonical: '/courses',
  },
};

/**
 * Courses Catalog Page - Browse training courses
 * /courses
 */
export default async function CoursesPage() {
  let initialCourses = [];
  try {
    const serverApiBase = String(API_BASE || '')
      .replace('http://localhost', 'http://127.0.0.1')
      .replace('https://localhost', 'https://127.0.0.1');
    const res = await fetch(`${serverApiBase}/courses`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      initialCourses = Array.isArray(data) ? data : data?.courses || [];
    }
  } catch {
    // Client component will fall back to demo courses if API is unavailable.
  }

  return <CoursesClient initialCourses={initialCourses} />;
}
