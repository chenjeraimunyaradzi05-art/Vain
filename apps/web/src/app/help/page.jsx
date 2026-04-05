'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Search,
  Briefcase,
  Users,
  GraduationCap,
  Building2,
  MessageSquare,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Sparkles
} from 'lucide-react';

// Feminine theme constants
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: HelpCircle,
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Click "Register" in the top navigation and fill out the form. Choose your account type (Job Seeker, Mentor, Employer, or TAFE) based on how you want to use the platform.'
      },
      {
        q: 'Is Vantage free to use?',
        a: 'Yes! Job seekers and mentees can use all platform features for free. Employers have subscription options for advanced features like unlimited job posts and analytics.'
      },
      {
        q: 'How do I update my profile?',
        a: 'Go to your dashboard and click "Edit Profile" or navigate to Settings > Profile Settings. Keep your profile up to date for better job matches!'
      },
    ]
  },
  {
    id: 'jobs',
    title: 'Finding Jobs',
    icon: Briefcase,
    questions: [
      {
        q: 'How do I search for jobs?',
        a: 'Use the Jobs page to browse all listings. Filter by location, industry, experience level, and more. Save jobs you\'re interested in for later.'
      },
      {
        q: 'How do I apply for a job?',
        a: 'Click on any job listing to see full details, then click "Apply Now". Upload your resume, add a cover letter, and submit your application.'
      },
      {
        q: 'Can I track my applications?',
        a: 'Yes! Visit your dashboard and click "My Applications" to see all your submitted applications and their current status.'
      },
      {
        q: 'How do I get notified about new jobs?',
        a: 'Enable job alerts in your notification settings. You\'ll receive updates when new jobs match your preferences and skills.'
      },
    ]
  },
  {
    id: 'mentorship',
    title: 'Mentorship',
    icon: Users,
    questions: [
      {
        q: 'How do I find a mentor?',
        a: 'Visit the Mentorship page and browse our mentors. Filter by industry, location, and cultural background to find the perfect match.'
      },
      {
        q: 'How do mentorship sessions work?',
        a: 'Once matched with a mentor, you can book video sessions through the platform. Sessions are typically 30-60 minutes and focus on your career goals.'
      },
      {
        q: 'Can I become a mentor?',
        a: 'Yes! If you have professional experience and want to give back, click "Become a Mentor" and complete the signup process.'
      },
      {
        q: 'Are mentors paid?',
        a: 'Some mentors volunteer their time, while others receive compensation for their expertise. Payment is handled securely through the platform.'
      },
    ]
  },
  {
    id: 'training',
    title: 'Training & Courses',
    icon: GraduationCap,
    questions: [
      {
        q: 'How do I find relevant courses?',
        a: 'Visit the Courses page to browse available training. Our AI can also recommend courses based on your career goals and skills gaps.'
      },
      {
        q: 'Are courses free?',
        a: 'Course pricing varies. Many government-funded courses are free or heavily subsidised for eligible participants. Check each course for details.'
      },
      {
        q: 'How do I earn badges?',
        a: 'Complete courses and training programs to earn digital badges. These appear on your profile and can be shared with employers.'
      },
    ]
  },
  {
    id: 'employers',
    title: 'For Employers',
    icon: Building2,
    questions: [
      {
        q: 'How do I post a job?',
        a: 'Create an employer account, then navigate to your dashboard and click "Post New Job". Fill in the job details and publish.'
      },
      {
        q: 'What subscription plans are available?',
        a: 'We offer Free, Starter, Professional, and Enterprise plans. Visit the Pricing page to compare features and choose the right plan.'
      },
      {
        q: 'What is RAP reporting?',
        a: 'Our RAP (Reconciliation Action Plan) dashboard helps you track Indigenous hiring metrics and generate compliance reports.'
      },
    ]
  },
];

const CONTACT_OPTIONS = [
  {
    icon: MessageSquare,
    title: 'Community Forum',
    description: 'Ask questions and connect with other users',
    href: '/community',
  },
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Get help from our support team',
    href: 'mailto:support@vantageplatform.com',
  },
  {
    icon: Phone,
    title: 'Call Us',
    description: 'Mon-Fri, 9am-5pm AEST',
    href: 'tel:+61280001234',
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState('getting-started');
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  // Filter FAQs by search
  const filteredCategories = FAQ_CATEGORIES.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(c => c.questions.length > 0 || !searchQuery);

  return (
    <div className="ngurra-page">
      {/* Decorative Halos */}
      <div className="ngurra-halos">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />
      </div>

      {/* Hero */}
      <div className="relative py-16 px-4 overflow-hidden">
        <div className="max-w-4xl mx-auto relative text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-pink-600" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600">
              Support Centre
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-4 text-slate-800">How can we help?</h1>
          <p className="text-xl text-slate-600 mb-8">
            Find answers to common questions or get in touch with our support team
          </p>
          
          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-100 focus:border-pink-500 text-lg text-slate-800 transition-all"
              style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16 relative z-10">
        {/* FAQ Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-slate-800">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            {filteredCategories.map((category) => (
              <div 
                key={category.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
              >
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(
                    expandedCategory === category.id ? null : category.id
                  )}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 rounded-lg">
                      <category.icon className="w-5 h-5 text-pink-600" />
                    </div>
                    <span className="font-semibold text-slate-800">{category.title}</span>
                    <span className="text-sm text-slate-400">
                      ({category.questions.length} questions)
                    </span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${
                    expandedCategory === category.id ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Questions */}
                {expandedCategory === category.id && (
                  <div className="border-t border-slate-100">
                    {category.questions.map((item, idx) => (
                      <div 
                        key={idx}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <button
                          onClick={() => setExpandedQuestion(
                            expandedQuestion === `${category.id}-${idx}` ? null : `${category.id}-${idx}`
                          )}
                          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                        >
                          <span className="font-medium pr-4 text-slate-700">{item.q}</span>
                          <ChevronRight className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${
                            expandedQuestion === `${category.id}-${idx}` ? 'rotate-90' : ''
                          }`} />
                        </button>
                        {expandedQuestion === `${category.id}-${idx}` && (
                          <div className="px-4 pb-4 text-slate-600 bg-slate-50">
                            {item.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Options */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-slate-800">Need More Help?</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            {CONTACT_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Link
                  key={option.title}
                  href={option.href}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:border-pink-300 transition-colors group"
                  style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
                >
                  <div className="p-3 bg-pink-50 rounded-lg w-fit mb-4">
                    <Icon className="w-6 h-6 text-pink-600" />
                  </div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2 text-slate-800">
                    {option.title}
                    <ExternalLink className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-slate-500">{option.description}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 p-6 bg-white border border-slate-200 rounded-xl" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
          <h3 className="font-semibold mb-4 text-slate-800">Quick Links</h3>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="text-pink-600 hover:text-pink-700">Privacy Policy</Link>
            <Link href="/privacy#terms" className="text-pink-600 hover:text-pink-700">Terms of Service</Link>
            <Link href="/community" className="text-pink-600 hover:text-pink-700">Community Forums</Link>
            <Link href="/jobs" className="text-pink-600 hover:text-pink-700">Browse Jobs</Link>
            <Link href="/mentorship" className="text-pink-600 hover:text-pink-700">Find a Mentor</Link>
            <Link href="/courses" className="text-pink-600 hover:text-pink-700">Explore Courses</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
