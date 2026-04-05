'use client';

/**
 * Apprenticeships Component
 * Browse and apply for apprenticeship opportunities
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/apiBase';
import useAuth from '@/hooks/useAuth';
import {
  Wrench,
  MapPin,
  Clock,
  DollarSign,
  GraduationCap,
  Building2,
  Calendar,
  BookOpen,
  Heart,
  Share2,
  Search,
  Filter,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  Star,
  Users,
  Loader2,
  Briefcase
} from 'lucide-react';

const API_URL = API_BASE;

// Industry categories
const INDUSTRIES = [
  { id: 'all', label: 'All Industries' },
  { id: 'construction', label: 'Construction & Trades' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'hospitality', label: 'Hospitality' },
  { id: 'automotive', label: 'Automotive' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'it', label: 'Information Technology' },
  { id: 'business', label: 'Business & Admin' },
  { id: 'agriculture', label: 'Agriculture' },
];

// Mock apprenticeships
const MOCK_APPRENTICESHIPS = [
  {
    id: '1',
    title: 'Electrical Apprenticeship',
    employer: 'Spark Energy Solutions',
    location: 'Sydney, NSW',
    industry: 'electrical',
    duration: '4 years',
    wage: '$25,000 - $45,000',
    qualification: 'Certificate III in Electrotechnology',
    description: 'Join our team as an electrical apprentice and learn from experienced tradespersons. Work on residential and commercial projects while completing your qualification.',
    requirements: ['Year 10 or equivalent', 'Valid driver license', 'Good maths skills', 'Physical fitness'],
    benefits: ['Paid training', 'Tool allowance', 'Career progression', 'Indigenous support program'],
    closingDate: '2024-03-15',
    indigenous: true,
    positions: 3,
    featured: true,
  },
  {
    id: '2',
    title: 'Certificate III in Individual Support',
    employer: 'Care Connect Australia',
    location: 'Melbourne, VIC',
    industry: 'healthcare',
    duration: '12 months',
    wage: '$22,000 - $28,000',
    qualification: 'Certificate III in Individual Support',
    description: 'Start your career in aged care and disability support. Gain hands-on experience while studying your qualification.',
    requirements: ['Year 10 or equivalent', 'NDIS Worker Screening', 'First Aid Certificate', 'Compassionate nature'],
    benefits: ['Flexible hours', 'Paid study time', 'Mentoring program', 'Career pathways'],
    closingDate: '2024-03-30',
    indigenous: true,
    positions: 5,
    featured: true,
  },
  {
    id: '3',
    title: 'Carpentry Apprenticeship',
    employer: 'BuildRight Construction',
    location: 'Brisbane, QLD',
    industry: 'construction',
    duration: '4 years',
    wage: '$24,000 - $48,000',
    qualification: 'Certificate III in Carpentry',
    description: 'Learn the carpentry trade with one of Queensland\'s leading construction companies. Work on residential and commercial builds.',
    requirements: ['Year 10 or equivalent', 'Physical fitness', 'Own transport preferred', 'Team player'],
    benefits: ['Tools provided', 'Safety gear included', 'RDOs', 'Indigenous mentorship'],
    closingDate: '2024-04-01',
    indigenous: false,
    positions: 2,
    featured: false,
  },
  {
    id: '4',
    title: 'IT Support Traineeship',
    employer: 'TechForward Solutions',
    location: 'Perth, WA',
    industry: 'it',
    duration: '12 months',
    wage: '$28,000 - $35,000',
    qualification: 'Certificate III in Information Technology',
    description: 'Kickstart your IT career with hands-on experience in desktop support, networking, and system administration.',
    requirements: ['Year 12 or equivalent', 'Interest in technology', 'Problem-solving skills', 'Customer service experience'],
    benefits: ['Latest tech training', 'Industry certifications', 'Flexible work options', 'Career advancement'],
    closingDate: '2024-03-20',
    indigenous: true,
    positions: 4,
    featured: false,
  },
  {
    id: '5',
    title: 'Commercial Cookery Apprenticeship',
    employer: 'Harbour View Restaurant',
    location: 'Sydney, NSW',
    industry: 'hospitality',
    duration: '3 years',
    wage: '$22,000 - $40,000',
    qualification: 'Certificate III in Commercial Cookery',
    description: 'Train as a chef in our award-winning restaurant. Learn classical and modern techniques from our head chef.',
    requirements: ['Passion for food', 'Available for shift work', 'Team oriented', 'Basic knife skills helpful'],
    benefits: ['Meals included', 'Uniform provided', 'Industry connections', 'Competition opportunities'],
    closingDate: '2024-04-15',
    indigenous: false,
    positions: 2,
    featured: false,
  },
];

function ApprenticeshipCard({ apprenticeship, onApply, onSave, isSaved }) {
  const [expanded, setExpanded] = useState(false);
  const closingDate = new Date(apprenticeship.closingDate);
  const daysLeft = Math.ceil((closingDate - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className={`bg-slate-800/50 border rounded-xl overflow-hidden transition-all ${
      apprenticeship.featured ? 'border-purple-700/50' : 'border-slate-700/50'
    }`}>
      {/* Featured badge */}
      {apprenticeship.featured && (
        <div className="bg-purple-600/20 text-purple-400 text-xs text-center py-1 border-b border-purple-700/30">
          <Star className="w-3 h-3 inline mr-1" />
          Featured Opportunity
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white hover:text-purple-400 transition-colors">
              {apprenticeship.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">{apprenticeship.employer}</span>
            </div>
          </div>
          
          {apprenticeship.indigenous && (
            <span className="flex-shrink-0 bg-amber-900/30 text-amber-400 text-xs px-2 py-1 rounded">
              Indigenous Employer
            </span>
          )}
        </div>

        {/* Quick info */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="w-4 h-4" />
            {apprenticeship.location}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock className="w-4 h-4" />
            {apprenticeship.duration}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <DollarSign className="w-4 h-4" />
            {apprenticeship.wage}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users className="w-4 h-4" />
            {apprenticeship.positions} positions
          </div>
        </div>

        {/* Qualification */}
        <div className="flex items-center gap-2 bg-slate-700/30 px-3 py-2 rounded-lg mb-4">
          <GraduationCap className="w-5 h-5 text-green-400" />
          <span className="text-sm text-slate-300">{apprenticeship.qualification}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
          {apprenticeship.description}
        </p>

        {/* Expandable content */}
        {expanded && (
          <div className="space-y-4 mb-4 border-t border-slate-700/50 pt-4">
            {/* Requirements */}
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Requirements</h4>
              <ul className="space-y-1">
                {apprenticeship.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            {/* Benefits */}
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Benefits</h4>
              <div className="flex flex-wrap gap-2">
                {apprenticeship.benefits.map((benefit, i) => (
                  <span key={i} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className={`text-sm ${daysLeft <= 7 ? 'text-red-400' : 'text-slate-400'}`}>
              {daysLeft > 0 ? `${daysLeft} days left` : 'Closing soon'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              {expanded ? 'Show less' : 'Learn more'}
            </button>
            
            <button
              onClick={() => onSave(apprenticeship.id)}
              className={`p-2 rounded-lg transition-colors ${
                isSaved
                  ? 'bg-red-900/30 text-red-400'
                  : 'bg-slate-700/50 text-slate-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            
            <button
              onClick={() => onApply(apprenticeship)}
              className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Apply
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplyModal({ apprenticeship, isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    coverLetter: '',
    availability: '',
    experience: '',
    whyInterested: '',
  });

  if (!isOpen || !apprenticeship) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // In production, submit application
    console.log('Submitting application:', formData);
    setStep(3); // Success step
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg mx-4 my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            Apply for {apprenticeship.title}
          </h3>
          <p className="text-sm text-slate-400 mt-1">{apprenticeship.employer}</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-1 rounded-full ${
                s <= step ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Why are you interested in this apprenticeship?
                </label>
                <textarea
                  value={formData.whyInterested}
                  onChange={(e) => setFormData({ ...formData, whyInterested: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-600 resize-none"
                  rows={4}
                  placeholder="Tell us what attracts you to this opportunity..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Relevant experience (if any)
                </label>
                <textarea
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-600 resize-none"
                  rows={3}
                  placeholder="Describe any relevant experience, skills, or training..."
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!formData.whyInterested}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  When can you start?
                </label>
                <select
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-600"
                  required
                >
                  <option value="">Select availability</option>
                  <option value="immediately">Immediately</option>
                  <option value="2-weeks">2 weeks notice</option>
                  <option value="1-month">1 month notice</option>
                  <option value="other">Other (specify in cover letter)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Cover letter (optional)
                </label>
                <textarea
                  value={formData.coverLetter}
                  onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-600 resize-none"
                  rows={4}
                  placeholder="Add a cover letter to strengthen your application..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition-colors"
                >
                  Submit Application
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Application Submitted!</h4>
              <p className="text-slate-400 mb-6">
                Your application has been sent to {apprenticeship.employer}. 
                They'll be in touch if you're shortlisted.
              </p>
              <button
                onClick={onClose}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Apprenticeships() {
  const { token } = useAuth();
  const [apprenticeships, setApprenticeships] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [showIndigenousOnly, setShowIndigenousOnly] = useState(false);
  const [applyingTo, setApplyingTo] = useState(null);

  const fetchApprenticeships = useCallback(async () => {
    try {
      // In production, fetch from API
      // const res = await fetch(`${API_URL}/apprenticeships`, {
      //   headers: { Authorization: `Bearer ${token}` },
      // });
      // const data = await res.json();
      
      // Using mock data for now
      setApprenticeships(MOCK_APPRENTICESHIPS);
    } catch (err) {
      console.error('Failed to fetch apprenticeships:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchApprenticeships();
  }, [fetchApprenticeships]);

  const handleSave = (id) => {
    setSaved(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Filter apprenticeships
  const filteredApprenticeships = apprenticeships.filter(a => {
    const matchesIndustry = selectedIndustry === 'all' || a.industry === selectedIndustry;
    const matchesIndigenous = !showIndigenousOnly || a.indigenous;
    const matchesSearch = !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.employer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesIndustry && matchesIndigenous && matchesSearch;
  });

  // Sort: featured first, then by closing date
  const sortedApprenticeships = [...filteredApprenticeships].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return new Date(a.closingDate) - new Date(b.closingDate);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wrench className="w-6 h-6 text-purple-400" />
          Apprenticeships & Traineeships
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Earn while you learn with hands-on training opportunities
        </p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search apprenticeships..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-600/50"
          />
        </div>

        {/* Industry filter */}
        <select
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600/50"
        >
          {INDUSTRIES.map((ind) => (
            <option key={ind.id} value={ind.id}>{ind.label}</option>
          ))}
        </select>
      </div>

      {/* Indigenous filter toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showIndigenousOnly}
          onChange={(e) => setShowIndigenousOnly(e.target.checked)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-600"
        />
        <span className="text-sm text-slate-300">Show Indigenous employers only</span>
      </label>

      {/* Results */}
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          {sortedApprenticeships.length} opportunities found
        </p>

        {sortedApprenticeships.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-xl">
            <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No apprenticeships found
            </h3>
            <p className="text-slate-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedApprenticeships.map((apprenticeship) => (
              <ApprenticeshipCard
                key={apprenticeship.id}
                apprenticeship={apprenticeship}
                isSaved={saved.includes(apprenticeship.id)}
                onSave={handleSave}
                onApply={setApplyingTo}
              />
            ))}
          </div>
        )}
      </div>

      {/* Apply modal */}
      <ApplyModal
        apprenticeship={applyingTo}
        isOpen={!!applyingTo}
        onClose={() => setApplyingTo(null)}
      />
    </div>
  );
}
