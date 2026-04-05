'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/apiClient';
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  DollarSign,
  FileText,
  Users,
  Shield,
  Calculator,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';

type BusinessStructure = {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  costs: {
    setup: string;
    ongoing: string;
  };
  bestFor: string[];
  registrationTime: string;
  liabilityProtection: string;
};

type Step = 'intro' | 'structure' | 'details' | 'costs' | 'compliance' | 'summary';

const businessStructures: BusinessStructure[] = [
  {
    id: 'sole-trader',
    name: 'Sole Trader',
    description: 'Simplest structure for one-person businesses',
    pros: [
      'Simple to set up and manage',
      'Low costs to establish',
      'Full control over business decisions',
      'Simple tax reporting via personal return',
    ],
    cons: [
      'Personally liable for all debts',
      'Cannot share ownership easily',
      'May pay more tax as income grows',
      'Less credibility with larger clients',
    ],
    costs: {
      setup: 'Free (ABN only)',
      ongoing: 'Minimal - just tax return costs',
    },
    bestFor: ['Freelancers', 'Consultants', 'Small service providers', 'Side hustles'],
    registrationTime: '1-2 days',
    liabilityProtection: 'None - personal assets at risk',
  },
  {
    id: 'company',
    name: 'Company (Pty Ltd)',
    description: 'Separate legal entity with limited liability',
    pros: [
      'Limited liability protection',
      'Lower tax rate (25-30%)',
      'Easier to raise investment',
      'More professional image',
    ],
    cons: [
      'More expensive to set up',
      'Complex compliance requirements',
      'Director duties and obligations',
      'Harder to wind up',
    ],
    costs: {
      setup: '$500-$1,500 (ASIC fees + setup)',
      ongoing: '$500-$2,000/year (ASIC fees, accounting)',
    },
    bestFor: ['Growing businesses', 'Those seeking investment', 'Higher risk activities'],
    registrationTime: '1-2 weeks',
    liabilityProtection: 'Strong - personal assets protected',
  },
  {
    id: 'partnership',
    name: 'Partnership',
    description: 'Two or more people running a business together',
    pros: [
      'Simple to establish',
      'Shared resources and skills',
      'Flexible profit sharing',
      'Combined expertise',
    ],
    cons: [
      'Joint and several liability',
      'Potential for disputes',
      'Shared decision making',
      'Partners bound by each other\'s actions',
    ],
    costs: {
      setup: 'Free-$500 (ABN + partnership agreement)',
      ongoing: 'Minimal - just tax returns',
    },
    bestFor: ['Professional services', 'Family businesses', 'Creative collaborations'],
    registrationTime: '1-3 days',
    liabilityProtection: 'None - all partners personally liable',
  },
  {
    id: 'trust',
    name: 'Trust',
    description: 'Holds assets and distributes income to beneficiaries',
    pros: [
      'Flexible income distribution',
      'Asset protection',
      'Tax planning opportunities',
      'Succession planning',
    ],
    cons: [
      'Complex to set up and manage',
      'Higher ongoing costs',
      'Strict compliance requirements',
      'May not suit all businesses',
    ],
    costs: {
      setup: '$1,000-$3,000 (trust deed + setup)',
      ongoing: '$1,000-$3,000/year (accounting, compliance)',
    },
    bestFor: ['Family businesses', 'Property investment', 'Wealth planning'],
    registrationTime: '1-2 weeks',
    liabilityProtection: 'Moderate - depends on structure',
  },
];

const startupCostCategories = [
  { id: 'registration', name: 'Registration & Licensing', items: ['ABN registration', 'Business name', 'Industry licenses'] },
  { id: 'equipment', name: 'Equipment & Tools', items: ['Computers/devices', 'Software', 'Specialized equipment'] },
  { id: 'premises', name: 'Premises', items: ['Bond/deposit', 'Fit-out', 'Initial rent'] },
  { id: 'marketing', name: 'Marketing', items: ['Website', 'Branding/logo', 'Initial advertising'] },
  { id: 'professional', name: 'Professional Services', items: ['Accountant setup', 'Legal advice', 'Insurance'] },
  { id: 'working-capital', name: 'Working Capital', items: ['Initial stock', 'Operating cash', '3-6 months buffer'] },
];

export default function BusinessPlanBuilderPage() {
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [businessDetails, setBusinessDetails] = useState({
    name: '',
    industry: '',
    description: '',
    targetMarket: '',
    uniqueValue: '',
  });
  const [startupCosts, setStartupCosts] = useState<Record<string, number>>({});
  const [complianceChecklist, setComplianceChecklist] = useState<Record<string, boolean>>({});

  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const steps: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: 'intro', label: 'Introduction', icon: Lightbulb },
    { id: 'structure', label: 'Structure', icon: Building2 },
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'costs', label: 'Costs', icon: Calculator },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'summary', label: 'Summary', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'intro':
        return true;
      case 'structure':
        return !!selectedStructure;
      case 'details':
        return businessDetails.name && businessDetails.industry;
      case 'costs':
        return true;
      case 'compliance':
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  const calculateTotalCosts = () => {
    return Object.values(startupCosts).reduce((sum, val) => sum + (val || 0), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const selectedStructureData = businessStructures.find((s) => s.id === selectedStructure);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/business-suite"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white/60" />
            </Link>
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Business Formation</h1>
                <p className="text-white/60">Start your business the right way</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-white/10 bg-black/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 ${
                    index <= currentStepIndex ? 'text-white' : 'text-white/40'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < currentStepIndex
                        ? 'bg-green-500 text-white'
                        : index === currentStepIndex
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-white/40'
                    }`}
                  >
                    {index < currentStepIndex ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className="hidden sm:inline text-sm">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-2 text-white/20" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Intro Step */}
        {currentStep === 'intro' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Let&apos;s Build Your Business Together
              </h2>
              <p className="text-white/60 text-lg max-w-2xl mx-auto">
                This wizard will help you choose the right business structure, understand compliance
                requirements, and estimate your startup costs.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Choose Your Structure</h3>
                </div>
                <p className="text-white/60 text-sm">
                  Compare sole trader, company, partnership, and trust structures to find the best
                  fit for your business.
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-pink-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Estimate Costs</h3>
                </div>
                <p className="text-white/60 text-sm">
                  Get a clear picture of your startup costs including registration, equipment, and
                  working capital.
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Compliance Checklist</h3>
                </div>
                <p className="text-white/60 text-sm">
                  Know exactly what registrations, licenses, and requirements you need to meet.
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Indigenous Business Support</h3>
                </div>
                <p className="text-white/60 text-sm">
                  Access resources like Supply Nation certification and Indigenous Business
                  Australia support.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-white/10">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-2">Before You Start</h3>
                  <p className="text-white/60 text-sm">
                    This wizard provides general guidance only. We recommend consulting with an
                    accountant or business advisor for personalized advice tailored to your specific
                    situation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Structure Step */}
        {currentStep === 'structure' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Choose Your Business Structure</h2>
              <p className="text-white/60">
                Each structure has different legal, tax, and liability implications.
              </p>
            </div>

            <div className="grid gap-4">
              {businessStructures.map((structure) => (
                <button
                  key={structure.id}
                  onClick={() => setSelectedStructure(structure.id)}
                  className={`text-left p-6 rounded-xl border transition-all ${
                    selectedStructure === structure.id
                      ? 'bg-white/10 border-purple-500'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{structure.name}</h3>
                      <p className="text-white/60 text-sm">{structure.description}</p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedStructure === structure.id
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-white/20'
                      }`}
                    >
                      {selectedStructure === structure.id && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="text-green-400 font-medium mb-2">Pros</h4>
                      <ul className="space-y-1">
                        {structure.pros.slice(0, 3).map((pro, i) => (
                          <li key={i} className="text-white/60 flex items-start gap-2">
                            <Check className="w-3 h-3 text-green-400 mt-1 flex-shrink-0" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-red-400 font-medium mb-2">Cons</h4>
                      <ul className="space-y-1">
                        {structure.cons.slice(0, 3).map((con, i) => (
                          <li key={i} className="text-white/60 flex items-start gap-2">
                            <AlertCircle className="w-3 h-3 text-red-400 mt-1 flex-shrink-0" />
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs">
                    <span className="text-white/40">
                      Setup: <span className="text-white/60">{structure.costs.setup}</span>
                    </span>
                    <span className="text-white/40">
                      Time: <span className="text-white/60">{structure.registrationTime}</span>
                    </span>
                    <span className="text-white/40">
                      Liability: <span className="text-white/60">{structure.liabilityProtection}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Details Step */}
        {currentStep === 'details' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Business Details</h2>
              <p className="text-white/60">Tell us about your business idea.</p>
            </div>

            <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-6">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Business Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={businessDetails.name}
                  onChange={(e) =>
                    setBusinessDetails({ ...businessDetails, name: e.target.value })
                  }
                  placeholder="Enter your business name"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Industry <span className="text-red-400">*</span>
                </label>
                <select
                  value={businessDetails.industry}
                  onChange={(e) =>
                    setBusinessDetails({ ...businessDetails, industry: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                >
                  <option value="">Select an industry</option>
                  <option value="consulting">Consulting & Professional Services</option>
                  <option value="retail">Retail & E-commerce</option>
                  <option value="food">Food & Hospitality</option>
                  <option value="trades">Trades & Construction</option>
                  <option value="creative">Creative & Design</option>
                  <option value="technology">Technology & IT</option>
                  <option value="health">Health & Wellness</option>
                  <option value="education">Education & Training</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Business Description
                </label>
                <textarea
                  value={businessDetails.description}
                  onChange={(e) =>
                    setBusinessDetails({ ...businessDetails, description: e.target.value })
                  }
                  placeholder="Describe what your business does..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Target Market</label>
                <input
                  type="text"
                  value={businessDetails.targetMarket}
                  onChange={(e) =>
                    setBusinessDetails({ ...businessDetails, targetMarket: e.target.value })
                  }
                  placeholder="Who are your ideal customers?"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Unique Value Proposition
                </label>
                <input
                  type="text"
                  value={businessDetails.uniqueValue}
                  onChange={(e) =>
                    setBusinessDetails({ ...businessDetails, uniqueValue: e.target.value })
                  }
                  placeholder="What makes your business different?"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Costs Step */}
        {currentStep === 'costs' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Estimate Startup Costs</h2>
              <p className="text-white/60">
                Enter estimated costs for each category to get a total startup budget.
              </p>
            </div>

            <div className="space-y-4">
              {startupCostCategories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white/5 rounded-xl p-6 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold">{category.name}</h3>
                      <p className="text-white/40 text-sm">{category.items.join(' • ')}</p>
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="number"
                        value={startupCosts[category.id] || ''}
                        onChange={(e) =>
                          setStartupCosts({
                            ...startupCosts,
                            [category.id]: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        className="w-32 pl-8 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-right placeholder:text-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">Estimated Total Startup Costs</h3>
                  <p className="text-white/60 text-sm">
                    This is a rough estimate - actual costs may vary
                  </p>
                </div>
                <div className="text-3xl font-bold text-white">
                  {formatCurrency(calculateTotalCosts())}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compliance Step */}
        {currentStep === 'compliance' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Compliance Checklist</h2>
              <p className="text-white/60">
                Key registrations and requirements for your{' '}
                {selectedStructureData?.name || 'business'}.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { id: 'abn', label: 'Apply for ABN (Australian Business Number)', required: true },
                { id: 'business-name', label: 'Register business name (if different from your name)', required: false },
                { id: 'gst', label: 'Register for GST (if turnover > $75,000)', required: false },
                { id: 'tax-file', label: 'Set up tax file number for business', required: true },
                { id: 'bank', label: 'Open business bank account', required: true },
                { id: 'insurance', label: 'Get appropriate business insurance', required: false },
                { id: 'licenses', label: 'Check industry-specific licenses', required: false },
                { id: 'contracts', label: 'Prepare standard contracts/terms', required: false },
                { id: 'accounting', label: 'Set up accounting/bookkeeping system', required: true },
                { id: 'super', label: 'Register for superannuation (if employing staff)', required: false },
              ].map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={complianceChecklist[item.id] || false}
                    onChange={(e) =>
                      setComplianceChecklist({
                        ...complianceChecklist,
                        [item.id]: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-white flex-1">{item.label}</span>
                  {item.required && (
                    <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
                      Required
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Summary Step */}
        {currentStep === 'summary' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Your Business Plan Summary</h2>
              <p className="text-white/60">
                Here&apos;s an overview of your business formation plan.
              </p>
            </div>

            <div className="space-y-4">
              {/* Structure */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-400" />
                  Business Structure
                </h3>
                <div className="text-white text-lg">{selectedStructureData?.name}</div>
                <p className="text-white/60 text-sm mt-1">
                  {selectedStructureData?.description}
                </p>
              </div>

              {/* Details */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-pink-400" />
                  Business Details
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/40">Name:</span>
                    <span className="text-white ml-2">{businessDetails.name || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-white/40">Industry:</span>
                    <span className="text-white ml-2 capitalize">
                      {businessDetails.industry || 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Costs */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-green-400" />
                  Estimated Startup Costs
                </h3>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(calculateTotalCosts())}
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4">Recommended Next Steps</h3>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm flex-shrink-0">
                      1
                    </span>
                    <span className="text-white/80">
                      Consult with an accountant to confirm the best structure for your situation
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm flex-shrink-0">
                      2
                    </span>
                    <span className="text-white/80">
                      Apply for your ABN at{' '}
                      <a
                        href="https://abr.gov.au"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:underline"
                      >
                        abr.gov.au
                      </a>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm flex-shrink-0">
                      3
                    </span>
                    <span className="text-white/80">
                      Set up your business cashbook to track income and expenses
                    </span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/business-suite/cashbook"
                className="flex-1 px-6 py-3 rounded-xl text-center font-medium text-white transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                Start Your Cashbook
              </Link>
              <Link
                href="/business-suite"
                className="flex-1 px-6 py-3 rounded-xl text-center font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                Go to Business Suite
              </Link>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep !== 'summary' && (
          <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={goBack}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
