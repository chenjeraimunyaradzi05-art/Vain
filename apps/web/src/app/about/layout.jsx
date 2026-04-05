// SEO Metadata for About Page
export const metadata = {
  title: 'About Us',
  description: 'Learn about Ngurra Pathways - a culturally-grounded platform connecting First Nations job seekers with meaningful employment, education, and mentorship opportunities.',
  keywords: ['about Ngurra Pathways', 'Indigenous employment platform', 'First Nations careers', 'Aboriginal job platform'],
  openGraph: {
    title: 'About Ngurra Pathways',
    description: 'A culturally-grounded platform connecting First Nations job seekers with meaningful opportunities.',
    url: 'https://ngurrapathways.life/about',
  },
  alternates: {
    canonical: '/about',
  },
};

export default function AboutLayout({ children }) {
  return children;
}
