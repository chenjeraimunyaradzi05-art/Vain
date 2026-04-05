"use client";
import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, X, Star, Zap, Shield, Users, BarChart3, Building2, Crown, Sparkles, Gem } from 'lucide-react';

const TIERS = [
  {
    name: 'Free',
    key: 'FREE',
    price: 0,
    period: 'forever',
    description: 'Begin your noble journey with essential tools',
    icon: Building2,
    color: '#87CEEB',
    features: [
      { text: '1 active job listing', included: true },
      { text: 'Basic applicant management', included: true },
      { text: 'Email notifications', included: true },
      { text: 'Standard support', included: true },
      { text: 'Analytics dashboard', included: false },
      { text: 'Featured placement', included: false },
      { text: 'Priority listing', included: false },
    ],
    cta: 'Get Started Free',
    ctaHref: '/company/setup',
    popular: false,
  },
  {
    name: 'Starter',
    key: 'STARTER',
    price: 99,
    period: '/month',
    description: 'Perfect for growing businesses with purpose',
    icon: Zap,
    color: '#50C878',
    features: [
      { text: '5 active job listings', included: true },
      { text: 'Applicant tracking', included: true },
      { text: 'Basic analytics', included: true },
      { text: 'Interview scheduling', included: true },
      { text: 'Priority email support', included: true },
      { text: 'Featured placement', included: false },
      { text: 'API access', included: false },
    ],
    cta: 'Start Free Trial',
    ctaHref: '/company/setup',
    popular: false,
  },
  {
    name: 'Professional',
    key: 'PROFESSIONAL',
    price: 249,
    period: '/month',
    description: 'For noble organizations ready to scale',
    icon: BarChart3,
    color: '#FFD700',
    features: [
      { text: '20 active job listings', included: true },
      { text: 'Advanced analytics & reports', included: true },
      { text: 'Featured job placement', included: true },
      { text: 'Bulk applicant management', included: true },
      { text: 'AI-powered matching', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access', included: false },
    ],
    cta: 'Start Free Trial',
    ctaHref: '/company/setup',
    popular: true,
  },
  {
    name: 'Enterprise',
    key: 'ENTERPRISE',
    price: 499,
    period: '/month',
    description: 'Royal tier for sovereign employers',
    icon: Shield,
    color: '#C41E3A',
    features: [
      { text: 'Unlimited job listings', included: true },
      { text: 'Full analytics suite', included: true },
      { text: 'Premium featured placement', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'API access', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'SLA guarantee', included: true },
    ],
    cta: 'Contact Sales',
    ctaHref: 'mailto:enterprise@vantageplatform.com?subject=Enterprise%20Plan%20Inquiry',
    popular: false,
  },
];

const RAP_TIER = {
  name: 'RAP Partnership',
  key: 'RAP',
  price: 5000,
  period: '/month',
  description: 'Reconciliation Action Plan compliance & Indigenous employment partnership',
  icon: Star,
  features: [
    'Everything in Enterprise',
    'RAP compliance dashboard',
    'Indigenous hiring targets tracking',
    'Closing the Gap alignment reporting',
    'Quarterly impact reports',
    'Community partnership tools',
    'Dedicated Indigenous liaison',
    'Cultural training resources',
    'RAP Certified Employer badge',
    'Custom annual contracts available',
  ],
  cta: 'Contact Sales',
  ctaHref: 'mailto:rap@vantageplatform.com?subject=RAP%20Partnership%20Inquiry',
};

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [tiers, setTiers] = useState(TIERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTiers() {
      try {
        const api = API_BASE;
        const res = await fetch(`${api}/subscriptions/v2/tiers`);
        if (res.ok) {
          const data = await res.json();
          // Merge API tier data with our display config if available
          if (data.tiers?.length > 0) {
            // API tiers loaded successfully - could merge pricing here
          }
        }
      } catch (err) {
        console.error('Failed to load tiers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTiers();
  }, []);

  const getPrice = (tier) => {
    if (tier.price === 0) return 'Free';
    if (billingPeriod === 'yearly') {
      const yearlyPrice = Math.round(tier.price * 10); // 2 months free
      return `$${yearlyPrice.toLocaleString()}`;
    }
    return `$${tier.price.toLocaleString()}`;
  };

  const getPeriod = (tier) => {
    if (tier.price === 0) return tier.period;
    return billingPeriod === 'yearly' ? '/year' : '/month';
  };

  return (
    <div className="vantage-page relative">
      {/* Decorative halos */}
      <div className="vantage-halos">
        <div className="vantage-halo-pink" />
        <div className="vantage-halo-purple" />
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 text-center relative z-10">
        {/* Noble badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8" style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(183, 110, 121, 0.1))', border: '1px solid rgba(255, 215, 0, 0.4)' }}>
          <Crown className="w-5 h-5" style={{ color: '#FFD700' }} />
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#FFD700' }}>Royal Pricing</span>
          <Sparkles className="w-5 h-5" style={{ color: '#B76E79' }} />
        </div>

        <h1 className="vantage-h1 text-4xl sm:text-5xl mb-6">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl max-w-2xl mx-auto mb-10 vantage-text">
          Connect with talented First Nations candidates and build a more inclusive workforce. 
          Choose the plan that fits your noble purpose. ✨
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-14">
          <span className="text-sm" style={{ color: billingPeriod === 'monthly' ? '#FFD700' : 'rgba(248, 246, 255, 0.6)' }}>
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-16 h-8 rounded-full transition-all duration-300"
            style={{ 
              background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.8), rgba(45, 27, 105, 0.6))',
              border: '2px solid rgba(255, 215, 0, 0.4)'
            }}
          >
            <div 
              className="absolute top-1 w-5 h-5 rounded-full transition-all duration-300"
              style={{ 
                background: 'linear-gradient(135deg, #FFD700, #50C878)',
                boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)',
                transform: billingPeriod === 'yearly' ? 'translateX(32px)' : 'translateX(4px)'
              }}
            />
          </button>
          <span className="text-sm" style={{ color: billingPeriod === 'yearly' ? '#FFD700' : 'rgba(248, 246, 255, 0.6)' }}>
            Yearly
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(80, 200, 120, 0.2)', color: '#50C878' }}>Save 17%</span>
          </span>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.key}
                className="relative rounded-2xl p-6 text-left transition-all duration-500"
                style={tier.popular ? {
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(80, 200, 120, 0.08), rgba(26, 15, 46, 0.9))',
                  border: '2px solid rgba(255, 215, 0, 0.5)',
                  transform: 'scale(1.05)',
                  boxShadow: '0 20px 60px rgba(255, 215, 0, 0.2), 0 0 40px rgba(80, 200, 120, 0.1), inset 0 0 40px rgba(255, 215, 0, 0.03)'
                } : {
                  background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.8), rgba(45, 27, 105, 0.6))',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  boxShadow: '0 8px 30px rgba(26, 15, 46, 0.4)'
                }}
                onMouseEnter={(e) => {
                  if (!tier.popular) {
                    e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)';
                    e.currentTarget.style.boxShadow = '0 15px 50px rgba(26, 15, 46, 0.5), 0 0 30px rgba(255, 215, 0, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-5px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!tier.popular) {
                    e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.2)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(26, 15, 46, 0.4)';
                    e.currentTarget.style.transform = 'none';
                  }
                }}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span 
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
                      style={{ 
                        background: 'linear-gradient(135deg, #FFD700, #50C878)',
                        color: '#1A0F2E',
                        boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)'
                      }}
                    >
                      <Star className="w-3 h-3" style={{ fill: '#1A0F2E' }} />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-5">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ 
                      background: `linear-gradient(135deg, ${tier.color}20, ${tier.color}10)`,
                      border: `1px solid ${tier.color}40`
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: tier.color }} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{tier.name}</h3>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-bold text-gradient-gold">{getPrice(tier)}</span>
                  <span className="text-sm ml-1" style={{ color: 'rgba(248, 246, 255, 0.6)' }}>{getPeriod(tier)}</span>
                </div>

                <p className="text-sm mb-6 vantage-text">{tier.description}</p>

                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      {feature.included ? (
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#50C878' }} />
                      ) : (
                        <X className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgba(248, 246, 255, 0.3)' }} />
                      )}
                      <span className="text-sm" style={{ color: feature.included ? 'rgba(248, 246, 255, 0.85)' : 'rgba(248, 246, 255, 0.4)' }}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.ctaHref}
                  className="block w-full py-3 rounded-full text-center font-semibold transition-all duration-300"
                  style={tier.popular ? {
                    background: 'linear-gradient(135deg, #C41E3A, #E85B8A)',
                    color: 'white',
                    border: '2px solid #FFD700',
                    boxShadow: '0 4px 20px rgba(196, 30, 58, 0.35)'
                  } : {
                    background: 'transparent',
                    color: '#FFD700',
                    border: '1px solid rgba(255, 215, 0, 0.4)'
                  }}
                  onMouseEnter={(e) => {
                    if (tier.popular) {
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(196, 30, 58, 0.5), 0 0 25px rgba(255, 215, 0, 0.25)';
                    } else {
                      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tier.popular) {
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(196, 30, 58, 0.35)';
                    } else {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {tier.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* RAP Partnership Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <div 
            className="rounded-2xl p-8 text-left"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(196, 30, 58, 0.05), rgba(26, 15, 46, 0.9))',
              border: '2px solid rgba(255, 215, 0, 0.4)',
              boxShadow: '0 12px 40px rgba(26, 15, 46, 0.4), 0 0 40px rgba(255, 215, 0, 0.1), inset 0 0 60px rgba(255, 215, 0, 0.02)'
            }}
          >
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-5">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, #FFD700, #B76E79)',
                      boxShadow: '0 0 25px rgba(255, 215, 0, 0.4)'
                    }}
                  >
                    <Crown className="w-7 h-7" style={{ color: '#1A0F2E' }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gradient-gold">{RAP_TIER.name}</h3>
                    <p className="text-sm" style={{ color: '#B76E79' }}>Custom annual contracts from $5,000/month</p>
                  </div>
                </div>
                <p className="mb-6 vantage-text">{RAP_TIER.description}</p>
                <Link
                  href={RAP_TIER.ctaHref}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300"
                  style={{ 
                    background: 'linear-gradient(135deg, #FFD700, #B76E79)',
                    color: '#1A0F2E',
                    boxShadow: '0 4px 20px rgba(255, 215, 0, 0.35)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(255, 215, 0, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 215, 0, 0.35)';
                  }}
                >
                  <Gem className="w-4 h-4" />
                  {RAP_TIER.cta}
                </Link>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#FFD700' }}>
                  <Sparkles className="w-4 h-4" />
                  Includes:
                </h4>
                <ul className="space-y-2.5">
                  {RAP_TIER.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#50C878' }} />
                      <span className="text-sm" style={{ color: 'rgba(248, 246, 255, 0.85)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto text-left">
          <h2 className="text-2xl font-bold text-center mb-10 text-gradient-gold">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <FaqItem 
              question="Can I change plans anytime?"
              answer="Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, your new rate applies at the next billing cycle."
            />
            <FaqItem 
              question="Is there a free trial?"
              answer="All paid plans come with a 14-day free trial. No credit card required to start. You'll only be charged if you decide to continue after the trial."
            />
            <FaqItem 
              question="What payment methods do you accept?"
              answer="We accept all major credit cards (Visa, Mastercard, American Express), direct debit, and bank transfer for Enterprise and RAP plans."
            />
            <FaqItem 
              question="What is the RAP Partnership?"
              answer="Our RAP Partnership tier is designed for organizations with a Reconciliation Action Plan. It includes comprehensive compliance reporting, Indigenous hiring metrics, and dedicated support to help you meet your RAP commitments."
            />
            <FaqItem 
              question="Do you offer discounts for non-profits?"
              answer="Yes! We offer special pricing for registered Indigenous community organizations, non-profits, and social enterprises. Contact us for details."
            />
          </div>
        </div>

        {/* CTA Footer */}
        <div 
          className="mt-16 p-10 rounded-2xl text-center"
          style={{ 
            background: 'linear-gradient(135deg, rgba(196, 30, 58, 0.1), rgba(80, 200, 120, 0.08), rgba(26, 15, 46, 0.9))',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            boxShadow: '0 12px 40px rgba(26, 15, 46, 0.4), inset 0 0 60px rgba(255, 215, 0, 0.02)'
          }}
        >
          <h2 className="text-2xl font-bold mb-3 text-gradient-gold">Ready to Transform Your Hiring?</h2>
          <p className="mb-8 max-w-xl mx-auto" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
            Join hundreds of employers building inclusive workplaces through meaningful connections with First Nations talent. ✨
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/company/setup"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold transition-all duration-300"
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
              Get Started Free
            </Link>
            <Link
              href="mailto:hello@vantageplatform.com"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold transition-all duration-300"
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
              Talk to Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div 
      className="rounded-xl overflow-hidden transition-all duration-300"
      style={{ 
        background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.7), rgba(45, 27, 105, 0.5))',
        border: '1px solid rgba(255, 215, 0, 0.2)'
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left transition-all duration-300"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 215, 0, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <span className="font-medium" style={{ color: '#F8F6FF' }}>{question}</span>
        <span 
          className="transition-transform duration-300" 
          style={{ color: '#FFD700', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
        >
          ▼
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
          {answer}
        </div>
      )}
    </div>
  );
}
