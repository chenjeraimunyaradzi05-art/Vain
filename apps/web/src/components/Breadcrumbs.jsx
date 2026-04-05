'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

// Map route segments to readable labels
const ROUTE_LABELS = {
  member: 'Member',
  mentor: 'Mentor',
  company: 'Company',
  admin: 'Admin',
  tafe: 'TAFE',
  dashboard: 'Dashboard',
  applications: 'Applications',
  badges: 'Badges',
  courses: 'Courses',
  mentorship: 'Mentorship',
  messages: 'Messages',
  jobs: 'Jobs',
  settings: 'Settings',
  notifications: 'Notifications',
  profile: 'Profile',
  availability: 'Availability',
  earnings: 'Earnings',
  payouts: 'Payouts',
  requests: 'Requests',
  setup: 'Setup',
  signup: 'Sign Up',
  analytics: 'Analytics',
  billing: 'Billing',
  subscription: 'Subscription',
  'rap-dashboard': 'RAP Dashboard',
  applicants: 'Applicants',
  help: 'Help',
  about: 'About',
  contact: 'Contact',
  privacy: 'Privacy',
  terms: 'Terms',
  accessibility: 'Accessibility',
  welcome: 'Welcome',
  search: 'Search',
  login: 'Login',
  register: 'Register',
  'forgot-password': 'Forgot Password',
  'reset-password': 'Reset Password',
};

// Routes that shouldn't show breadcrumbs
const HIDDEN_ROUTES = ['/'];

export default function Breadcrumbs({ className = '' }) {
  const pathname = usePathname();

  // Don't show breadcrumbs on hidden routes
  if (HIDDEN_ROUTES.includes(pathname)) {
    return null;
  }

  // Build breadcrumb segments
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) return null;

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    const isLast = index === segments.length - 1;

    return {
      href,
      label,
      isLast,
    };
  });

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={`flex items-center text-sm text-slate-400 mb-6 ${className}`}
    >
      <ol className="flex items-center flex-wrap gap-1">
        <li>
          <Link 
            href="/" 
            className="inline-flex items-center hover:text-slate-200 transition-colors"
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>
        
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-1 text-slate-600" />
            {crumb.isLast ? (
              <span 
                className="text-slate-200 font-medium" 
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link 
                href={crumb.href} 
                className="hover:text-slate-200 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
