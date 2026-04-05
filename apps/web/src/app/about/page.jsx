'use client';

import { API_BASE } from '@/lib/apiBase';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Crown, Sparkles, Gem, Heart, Shield, Users, Eye } from 'lucide-react';
const STATS = [
  { label: 'Users finding their next step', value: '2,500+', icon: Users, color: '#FFD700' },
  { label: 'Employer & partner organisations', value: '120+', icon: Crown, color: '#50C878' },
  { label: 'Mentorship connections made', value: '850+', icon: Heart, color: '#E85B8A' },
  { label: 'Learning pathways completed', value: '1,200+', icon: Sparkles, color: '#87CEEB' },
];

const VALUES = [
  {
    icon: Crown,
    color: '#FFD700',
    title: 'Clear',
    description:
      'No jargon, no noise. Vantage communicates in plain language so you always know what your options are and what to do next.',
  },
  {
    icon: Users,
    color: '#50C878',
    title: 'Supportive',
    description:
      'Progress is a pathway, not a moment. Vantage is designed to guide you forward without judgement — at your pace, on your terms.',
  },
  {
    icon: Sparkles,
    color: '#E85B8A',
    title: 'Practical',
    description:
      'Steps, tools, outcomes. Every feature on Vantage exists to help you do something concrete — find work, build skills, connect with mentors, or manage money.',
  },
  {
    icon: Shield,
    color: '#87CEEB',
    title: 'Privacy by Default',
    description:
      'You\'re in control of what you share. Vantage follows the principle of least privilege and never exposes your data without your consent.',
  },
  {
    icon: Heart,
    color: '#B76E79',
    title: 'Long-term Progress',
    description:
      'We measure success not just in placements, but in sustained career growth, financial wellbeing, and stability over time.',
  },
  {
    icon: Eye,
    color: '#9B7EC4',
    title: 'Accessible',
    description:
      'Vantage is designed for everyone — accessible interfaces, responsive layouts, and WCAG AA compliance as standard.',
  },
];

const TEAM = [
  {
    name: 'Munyaradzi Chenjerai',
    role: 'Founder & Developer',
    description: 'Platform architect and developer behind Vantage — building the pathway from opportunity to long-term progress.',
    color: '#FFD700',
  },
  {
    name: 'Employer Partners',
    role: 'Industry Connections',
    description: 'Employers dedicated to creating meaningful opportunities and supporting talent pipelines.',
    color: '#50C878',
  },
  {
    name: 'Education Providers',
    role: 'Learning Pathways',
    description: 'Training organisations and educators offering structured courses and accredited qualifications.',
    color: '#E85B8A',
  },
  {
    name: 'Mentor Network',
    role: 'Career Guidance',
    description: 'Experienced professionals providing mentorship, guidance, and practical career support.',
    color: '#87CEEB',
  },
];

export default function AboutPage() {
  const [stats, setStats] = useState(STATS);

  useEffect(() => {
    // Optionally fetch real stats from API
    async function fetchStats() {
      try {
        const res = await fetch(`${API_BASE}/analytics/public-stats`);
        if (res.ok) {
          const data = await res.json();
          if (data.stats) {
            setStats([
              { label: 'Users finding their next step', value: `${data.stats.members?.toLocaleString() || '2,500'}+`, icon: Users, color: '#FFD700' },
              { label: 'Employer & partner organisations', value: `${data.stats.companies?.toLocaleString() || '120'}+`, icon: Crown, color: '#50C878' },
              { label: 'Mentorship connections made', value: `${data.stats.mentorships?.toLocaleString() || '850'}+`, icon: Heart, color: '#E85B8A' },
              { label: 'Learning pathways completed', value: `${data.stats.courses?.toLocaleString() || '1,200'}+`, icon: Sparkles, color: '#87CEEB' },
            ]);
          }
        }
      } catch {
        // Use default stats
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="vantage-page relative">
      {/* Decorative halos */}
      <div className="vantage-halos">
        <div className="vantage-halo-pink" />
        <div className="vantage-halo-purple" />
      </div>

      {/* Hero Section */}
      <section className="relative py-20 px-6 text-center z-10">
        <div className="max-w-4xl mx-auto">
          {/* Noble badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8" style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(183, 110, 121, 0.1))', border: '1px solid rgba(255, 215, 0, 0.4)' }}>
            <Crown className="w-5 h-5" style={{ color: '#FFD700' }} />
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#FFD700' }}>Our Story</span>
            <Gem className="w-5 h-5" style={{ color: '#50C878' }} />
          </div>

          <h1 className="vantage-h1 text-4xl md:text-5xl mb-6">
            About Vantage
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto vantage-text">
            Vantage is a pathway platform that helps people move from opportunity discovery to 
            long-term progress. Jobs, learning, mentors, community, business tools, financial 
            wellbeing, and real-world opportunities — in one guided platform.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/jobs"
              className="vantage-btn-primary px-8 py-3.5"
            >
              <Gem className="w-5 h-5" />
              Browse Jobs
            </Link>
            <Link
              href="/mentorship"
              className="vantage-btn-secondary px-8 py-3.5"
            >
              <Sparkles className="w-5 h-5" />
              Find a Mentor
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        className="py-16 px-6 relative z-10"
        style={{ 
          background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
          borderTop: '1px solid rgba(255, 215, 0, 0.15)',
          borderBottom: '1px solid rgba(255, 215, 0, 0.15)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3" style={{ background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}10)`, border: `1px solid ${stat.color}40` }}>
                    <Icon className="w-6 h-6" style={{ color: stat.color }} />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold mb-2 text-gradient-gold">
                    {stat.value}
                  </div>
                  <div className="text-sm vantage-muted">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(80, 200, 120, 0.1)', border: '1px solid rgba(80, 200, 120, 0.3)' }}>
            <Heart className="w-4 h-4" style={{ color: '#50C878' }} />
            <span className="text-sm font-medium" style={{ color: '#50C878' }}>Our Mission</span>
          </div>
          <h2 className="text-3xl font-bold mb-6 text-gradient-gold">Opportunity, Connected. Progress, Supported.</h2>
          <p className="text-lg mb-6 vantage-text">
            Vantage exists to turn "what now?" into "next step." We connect job seekers with 
            meaningful opportunities, pair learners with structured pathways, and give everyone 
            the tools to build stability and momentum.
          </p>
          <p className="text-lg vantage-text">
            Built by Munyaradzi Chenjerai, Vantage brings work, learning, support, tools, and 
            stability together — so moving forward is simpler. Privacy by default. 
            User agency first. Real outcomes.
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section 
        className="py-20 px-6 relative z-10"
        style={{ 
          background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.4), rgba(45, 27, 105, 0.3))'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(232, 91, 138, 0.1)', border: '1px solid rgba(232, 91, 138, 0.3)' }}>
              <Crown className="w-4 h-4" style={{ color: '#E85B8A' }} />
              <span className="text-sm font-medium" style={{ color: '#E85B8A' }}>Core Values</span>
            </div>
            <h2 className="text-3xl font-bold text-gradient-gold">Our Values</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((value, i) => {
              const Icon = value.icon;
              return (
                <div
                  key={i}
                  className="rounded-2xl p-6 transition-all duration-300"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.7), rgba(45, 27, 105, 0.5))',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    boxShadow: '0 8px 30px rgba(26, 15, 46, 0.4)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${value.color}60`;
                    e.currentTarget.style.boxShadow = `0 12px 40px rgba(26, 15, 46, 0.5), 0 0 25px ${value.color}20`;
                    e.currentTarget.style.transform = 'translateY(-5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.2)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(26, 15, 46, 0.4)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ 
                      background: `linear-gradient(135deg, ${value.color}20, ${value.color}10)`,
                      border: `1px solid ${value.color}40`
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: value.color }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">{value.title}</h3>
                  <p className="text-sm vantage-text">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(135, 206, 235, 0.1)', border: '1px solid rgba(135, 206, 235, 0.3)' }}>
              <Users className="w-4 h-4" style={{ color: '#87CEEB' }} />
              <span className="text-sm font-medium" style={{ color: '#87CEEB' }}>Our Partners</span>
            </div>
            <h2 className="text-3xl font-bold text-gradient-gold">Who We Work With</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map((partner, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 text-center transition-all duration-300"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  boxShadow: '0 8px 30px rgba(26, 15, 46, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${partner.color}50`;
                  e.currentTarget.style.boxShadow = `0 12px 40px rgba(26, 15, 46, 0.5), 0 0 20px ${partner.color}15`;
                  e.currentTarget.style.transform = 'translateY(-5px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.2)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(26, 15, 46, 0.4)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div 
                  className="text-sm font-semibold mb-2 px-3 py-1 rounded-full inline-block"
                  style={{ background: `${partner.color}20`, color: partner.color }}
                >
                  {partner.role}
                </div>
                <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">{partner.name}</h3>
                <p className="text-sm vantage-text">{partner.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Acknowledgement Section */}
      <section 
        className="py-20 px-6 relative z-10"
        style={{ 
          background: 'linear-gradient(135deg, rgba(128, 0, 32, 0.1), rgba(26, 15, 46, 0.9))'
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div 
            className="rounded-2xl p-8"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(196, 30, 58, 0.03), rgba(26, 15, 46, 0.8))',
              border: '2px solid rgba(255, 215, 0, 0.3)',
              boxShadow: '0 12px 40px rgba(26, 15, 46, 0.4), 0 0 40px rgba(255, 215, 0, 0.08), inset 0 0 60px rgba(255, 215, 0, 0.02)'
            }}
          >
            <Crown className="w-10 h-10 mx-auto mb-4" style={{ color: '#FFD700' }} />
            <h2 className="text-2xl font-bold mb-6 text-gradient-gold">Our Commitment</h2>
            <p className="mb-6 vantage-text">
              Vantage is committed to building a platform that respects every user’s dignity, 
              privacy, and agency. We believe progress is a pathway, not a moment — and every 
              person deserves the tools and guidance to move forward with confidence.
            </p>
            <p className="text-sm italic" style={{ color: '#B76E79' }}>
              Clear pathways. Practical tools. Real momentum. — Munyaradzi Chenjerai, Founder
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div 
            className="rounded-2xl p-10"
            style={{ 
              background: 'linear-gradient(135deg, rgba(196, 30, 58, 0.1), rgba(80, 200, 120, 0.08), rgba(26, 15, 46, 0.9))',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              boxShadow: '0 12px 40px rgba(26, 15, 46, 0.4), inset 0 0 60px rgba(255, 215, 0, 0.02)'
            }}
          >
            <h2 className="text-2xl font-bold mb-4 text-gradient-gold">Ready to Take Your Next Step?</h2>
            <p className="mb-8 vantage-text">
              Whether you’re looking for work, building skills, starting a business, or seeking 
              guidance — Vantage is here to help you move forward with clarity.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/company/setup"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition-all duration-300"
                style={{ 
                  background: 'linear-gradient(135deg, #C41E3A, #E85B8A)',
                  color: 'white',
                  border: '2px solid #FFD700',
                  boxShadow: '0 4px 20px rgba(196, 30, 58, 0.35), 0 0 15px rgba(255, 215, 0, 0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(196, 30, 58, 0.45), 0 0 25px rgba(255, 215, 0, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(196, 30, 58, 0.35), 0 0 15px rgba(255, 215, 0, 0.15)';
                }}
              >
                <Gem className="w-5 h-5" />
                Create Account
              </Link>
              <Link
                href="/help"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition-all duration-300"
                style={{ 
                  background: 'transparent',
                  color: '#FFD700',
                  border: '2px solid rgba(255, 215, 0, 0.5)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Sparkles className="w-5 h-5" />
                Get Help
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
