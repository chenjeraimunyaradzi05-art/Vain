'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { Space_Grotesk } from 'next/font/google';
import MediaUpload from './MediaUpload';
import {
  Home,
  MapPin,
  Bed,
  Bath,
  Car,
  Calculator,
  ShieldCheck,
  Users,
  Phone,
  Mail,
  Star,
  Heart,
  Share2,
  Camera,
  Video,
  ChevronRight,
  ChevronDown,
  Filter,
  Grid3X3,
  List,
  Plus,
  X,
  Check,
  AlertTriangle,
  MessageCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

// Theme colors
const colors = {
  pink: '#E91E8C',
  purple: '#8B5CF6',
  emerald: '#10B981',
  amber: '#F59E0B',
  sky: '#0EA5E9',
  teal: '#14B8A6',
};

// Types
interface Listing {
  id: string;
  title: string;
  description?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  weeklyRent?: number;
  bond?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  status: string;
  availableFrom?: string;
  ownerUserId?: string;
  photos?: string[];
  videos?: string[];
  floorPlan?: string;
  propertyType?: string;
  features?: string[];
  petFriendly?: boolean;
  furnished?: boolean;
  agentId?: string;
  agent?: Agent;
}

interface Agent {
  id: string;
  name: string;
  company: string;
  phone?: string;
  email?: string;
  avatar?: string;
  licenseNumber?: string;
  verified: boolean;
  rating?: number;
  reviewCount?: number;
  type: 'agent' | 'broker';
  specializations?: string[];
}

interface HousingIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  link?: string;
}

// Mock verified agents
const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'Sarah Williams',
    company: 'First Nations Realty',
    phone: '0412 345 678',
    email: 'sarah@fnrealty.com.au',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    licenseNumber: 'NSW12345',
    verified: true,
    rating: 4.9,
    reviewCount: 127,
    type: 'agent',
    specializations: ['Residential', 'First Home Buyers', 'Indigenous Housing'],
  },
  {
    id: 'agent-2',
    name: 'David Mundine',
    company: 'Indigenous Property Group',
    phone: '0423 456 789',
    email: 'david@ipg.com.au',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    licenseNumber: 'QLD67890',
    verified: true,
    rating: 4.8,
    reviewCount: 89,
    type: 'agent',
    specializations: ['Commercial', 'Land Sales', 'Remote Communities'],
  },
  {
    id: 'broker-1',
    name: 'Michelle Pearson',
    company: 'Community Home Loans',
    phone: '0434 567 890',
    email: 'michelle@communityloans.com.au',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop',
    licenseNumber: 'ACL123456',
    verified: true,
    rating: 4.9,
    reviewCount: 203,
    type: 'broker',
    specializations: ['First Home Buyer Loans', 'Indigenous Home Ownership', 'Low Deposit Loans'],
  },
  {
    id: 'broker-2',
    name: 'James Kurrumarra',
    company: 'Pathways Finance',
    phone: '0445 678 901',
    email: 'james@pathwaysfinance.com.au',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
    licenseNumber: 'ACL789012',
    verified: true,
    rating: 4.7,
    reviewCount: 156,
    type: 'broker',
    specializations: ['NRAS Properties', 'Government Schemes', 'Rent-to-Buy'],
  },
];

// Housing issues and support resources
const housingIssues: HousingIssue[] = [
  {
    id: '1',
    title: 'Rental Discrimination',
    description: 'Report discrimination in rental applications based on race or background',
    category: 'Rights',
    icon: '⚖️',
    link: '/support/discrimination',
  },
  {
    id: '2',
    title: 'Emergency Housing',
    description: 'Access emergency accommodation and crisis support services',
    category: 'Crisis',
    icon: '🆘',
    link: '/support/emergency-housing',
  },
  {
    id: '3',
    title: 'Tenant Rights',
    description: 'Know your rights as a tenant and how to address disputes',
    category: 'Rights',
    icon: '📋',
    link: '/support/tenant-rights',
  },
  {
    id: '4',
    title: 'Maintenance Issues',
    description: 'Report urgent repairs and maintenance problems',
    category: 'Maintenance',
    icon: '🔧',
    link: '/support/maintenance',
  },
  {
    id: '5',
    title: 'Rental Assistance',
    description: 'Find financial assistance programs for rent and bonds',
    category: 'Financial',
    icon: '💰',
    link: '/support/rental-assistance',
  },
  {
    id: '6',
    title: 'Homelessness Support',
    description: 'Connect with support services for housing instability',
    category: 'Crisis',
    icon: '🏠',
    link: '/support/homelessness',
  },
];

// Default filters
const DEFAULT_FILTERS = {
  suburb: '',
  state: '',
  minRent: '',
  maxRent: '',
  bedrooms: '',
  bathrooms: '',
  propertyType: '',
  status: 'ACTIVE',
  petFriendly: false,
  furnished: false,
  hasFloorPlan: false,
  agentVerified: false,
  parking: '',
};

// Mortgage Calculator Component
function MortgageCalculator() {
  const [propertyPrice, setPropertyPrice] = useState(500000);
  const [deposit, setDeposit] = useState(50000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const loanAmount = propertyPrice - deposit;
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;

  const monthlyPayment =
    monthlyRate > 0
      ? (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : loanAmount / numPayments;

  const totalRepayment = monthlyPayment * numPayments;
  const totalInterest = totalRepayment - loanAmount;
  const lvr = ((loanAmount / propertyPrice) * 100).toFixed(1);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${colors.teal}, ${colors.emerald})` }}
        >
          <Calculator className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Mortgage Calculator</h3>
          <p className="text-sm text-gray-400">Estimate your repayments</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Property Price */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-300">Property Price</label>
            <span className="text-sm font-medium text-white">{formatCurrency(propertyPrice)}</span>
          </div>
          <input
            type="range"
            min="100000"
            max="2000000"
            step="10000"
            value={propertyPrice}
            onChange={(e) => setPropertyPrice(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${colors.teal} 0%, ${colors.teal} ${((propertyPrice - 100000) / 1900000) * 100}%, rgba(255,255,255,0.1) ${((propertyPrice - 100000) / 1900000) * 100}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
        </div>

        {/* Deposit */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-300">Deposit</label>
            <span className="text-sm font-medium text-white">
              {formatCurrency(deposit)} ({((deposit / propertyPrice) * 100).toFixed(0)}%)
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={propertyPrice * 0.5}
            step="5000"
            value={deposit}
            onChange={(e) => setDeposit(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${colors.emerald} 0%, ${colors.emerald} ${(deposit / (propertyPrice * 0.5)) * 100}%, rgba(255,255,255,0.1) ${(deposit / (propertyPrice * 0.5)) * 100}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
        </div>

        {/* Interest Rate */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-300">Interest Rate</label>
            <span className="text-sm font-medium text-white">{interestRate.toFixed(2)}% p.a.</span>
          </div>
          <input
            type="range"
            min="2"
            max="12"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${colors.amber} 0%, ${colors.amber} ${((interestRate - 2) / 10) * 100}%, rgba(255,255,255,0.1) ${((interestRate - 2) / 10) * 100}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
        </div>

        {/* Loan Term */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-300">Loan Term</label>
            <span className="text-sm font-medium text-white">{loanTerm} years</span>
          </div>
          <div className="flex gap-2">
            {[15, 20, 25, 30].map((term) => (
              <button
                key={term}
                onClick={() => setLoanTerm(term)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  loanTerm === term ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
                style={{
                  background:
                    loanTerm === term
                      ? `linear-gradient(135deg, ${colors.pink}, ${colors.purple})`
                      : 'rgba(255,255,255,0.1)',
                }}
              >
                {term}yr
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div
          className="p-4 rounded-xl mt-6"
          style={{ background: `linear-gradient(135deg, ${colors.pink}15, ${colors.purple}15)` }}
        >
          <div className="text-center mb-4">
            <p className="text-sm text-gray-400 mb-1">Monthly Repayment</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(monthlyPayment)}</p>
          </div>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            {showBreakdown ? 'Hide' : 'Show'} breakdown
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showBreakdown ? 'rotate-180' : ''}`}
            />
          </button>
          {showBreakdown && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Loan Amount</span>
                <span className="text-white">{formatCurrency(loanAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Interest</span>
                <span className="text-amber-400">{formatCurrency(totalInterest)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Repayment</span>
                <span className="text-white">{formatCurrency(totalRepayment)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">LVR</span>
                <span className={`${Number(lvr) > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {lvr}%
                </span>
              </div>
              {Number(lvr) > 80 && (
                <p className="text-xs text-amber-400 mt-2">
                  ⚠️ LVR above 80% may require Lenders Mortgage Insurance (LMI)
                </p>
              )}
            </div>
          )}
        </div>

        <Link
          href="/rentals/mortgage-preapproval"
          className="block w-full py-3 rounded-xl font-medium text-center text-white transition-all hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${colors.teal}, ${colors.emerald})`,
            boxShadow: '0 4px 15px rgba(20, 184, 166, 0.3)',
          }}
        >
          Get Pre-Approved
        </Link>
      </div>
    </div>
  );
}

// Verified Agent Card Component
function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div
      className="rounded-2xl p-5 transition-all hover:scale-[1.01] relative"
      style={{
        background: agent.verified
          ? 'linear-gradient(135deg, #10B98110, #8B5CF610)'
          : 'rgba(255, 255, 255, 0.05)',
        border: agent.verified ? '2px solid #10B981' : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: agent.verified ? '0 0 0 2px #10B98140' : undefined,
        backdropFilter: 'blur(10px)',
        zIndex: agent.verified ? 1 : 0,
      }}
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/10">
            {agent.avatar ? (
              <Image
                src={agent.avatar}
                alt={agent.name}
                width={64}
                height={64}
                className="object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xl"
                style={{
                  background: `linear-gradient(135deg, ${colors.pink}30, ${colors.purple}30)`,
                }}
              >
                {agent.name.charAt(0)}
              </div>
            )}
          </div>
          {agent.verified && (
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
              style={{ background: colors.emerald }}
              title="Verified Agent/Broker"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white truncate">{agent.name}</h4>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                agent.type === 'broker'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {agent.type === 'broker' ? 'Mortgage Broker' : 'Real Estate Agent'}
            </span>
            {agent.verified && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 inline" /> Verified
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-2">{agent.company}</p>
          <div className="flex items-center gap-3 text-sm">
            {agent.rating && (
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4 fill-current" />
                {agent.rating} ({agent.reviewCount})
              </span>
            )}
            <span className="text-gray-500">License: {agent.licenseNumber}</span>
          </div>
          {agent.specializations && (
            <div className="flex flex-wrap gap-1 mt-2">
              {agent.specializations.slice(0, 3).map((spec, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-gray-300"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
          {!agent.verified && (
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-700/40 text-gray-300">
                <X className="w-4 h-4 inline" /> Not Verified
              </span>
              <div className="mt-2 text-xs text-gray-400">
                <Link href="/rentals/apply-agent" className="text-emerald-400 underline">
                  Apply for verification
                </Link>{' '}
                to get priority listing and a verified badge.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <a
          href={`tel:${agent.phone}`}
          className="flex-1 py-2 rounded-xl text-sm font-medium text-center text-white transition-all"
          style={{ background: 'rgba(255, 255, 255, 0.1)' }}
        >
          <Phone className="w-4 h-4 inline mr-1" />
          Call
        </a>
        <a
          href={`mailto:${agent.email}`}
          className="flex-1 py-2 rounded-xl text-sm font-medium text-center text-white transition-all"
          style={{ background: `linear-gradient(135deg, ${colors.pink}, ${colors.purple})` }}
        >
          <Mail className="w-4 h-4 inline mr-1" />
          Email
        </a>
      </div>
      {agent.verified && (
        <div
          className="absolute top-2 right-2 bg-emerald-500/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10 flex items-center gap-1"
          title="Priority Listing"
        >
          <ShieldCheck className="w-4 h-4 inline" /> Priority
        </div>
      )}
    </div>
  );
}

// Property Listing Card Component
function PropertyCard({
  listing,
  onInquiry,
  isAuthenticated,
}: {
  listing: Listing;
  // eslint-disable-next-line no-unused-vars
  onInquiry: (id: string) => void;
  isAuthenticated: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');

  const mainImage = listing.photos?.[0] || null;
  const photoCount = listing.photos?.length || 0;
  const videoCount = listing.videos?.length || 0;

  return (
    <article
      className="group rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Image */}
      <div className="relative h-52 bg-gradient-to-br from-teal-500/20 to-purple-500/20">
        {mainImage ? (
          <Image src={mainImage} alt={listing.title} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Home className="w-16 h-16 text-white/20" />
          </div>
        )}

        {/* Media badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {photoCount > 0 && (
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-black/50 text-white backdrop-blur-sm flex items-center gap-1">
              <Camera className="w-3 h-3" /> {photoCount}
            </span>
          )}
          {videoCount > 0 && (
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-black/50 text-white backdrop-blur-sm flex items-center gap-1">
              <Video className="w-3 h-3" /> {videoCount}
            </span>
          )}
        </div>

        {/* Status badge */}
        <span
          className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${
            listing.status === 'ACTIVE'
              ? 'bg-emerald-500 text-white'
              : listing.status === 'DRAFT'
                ? 'bg-amber-500 text-white'
                : 'bg-gray-500 text-white'
          }`}
        >
          {listing.status === 'ACTIVE' ? 'Available' : listing.status}
        </span>

        {/* Like & Share */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            onClick={() => setLiked(!liked)}
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${
              liked ? 'bg-pink-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-all">
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Price */}
        {listing.weeklyRent && (
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-white/95 text-gray-900 font-bold text-lg shadow-lg">
            ${listing.weeklyRent}
            <span className="text-sm font-normal text-gray-500">/wk</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-white text-lg mb-2 line-clamp-1 group-hover:text-pink-300 transition-colors">
          {listing.title}
        </h3>

        <p className="text-sm text-gray-400 mb-3 flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          {[listing.suburb, listing.state].filter(Boolean).join(', ') || 'Location TBA'}
        </p>

        {/* Features */}
        <div className="flex items-center gap-4 text-sm text-gray-300 mb-4">
          {listing.bedrooms !== undefined && (
            <span className="flex items-center gap-1">
              <Bed className="w-4 h-4 text-gray-500" />
              {listing.bedrooms}
            </span>
          )}
          {listing.bathrooms !== undefined && (
            <span className="flex items-center gap-1">
              <Bath className="w-4 h-4 text-gray-500" />
              {listing.bathrooms}
            </span>
          )}
          {listing.parking !== undefined && (
            <span className="flex items-center gap-1">
              <Car className="w-4 h-4 text-gray-500" />
              {listing.parking}
            </span>
          )}
          {listing.propertyType && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/10">
              {listing.propertyType}
            </span>
          )}
        </div>

        {listing.description && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-4">{listing.description}</p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {listing.petFriendly && (
            <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
              🐾 Pet Friendly
            </span>
          )}
          {listing.furnished && (
            <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">
              🪑 Furnished
            </span>
          )}
          {listing.floorPlan && (
            <span className="px-2 py-1 rounded-full text-xs bg-sky-500/20 text-sky-400">
              📐 Floor Plan
            </span>
          )}
          {listing.agent?.verified && (
            <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/30 text-emerald-500 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 inline" /> Verified Agent
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-white/10">
          <Link
            href={`/rentals/${listing.id}`}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center text-white transition-all"
            style={{
              background: `linear-gradient(135deg, ${colors.pink}, ${colors.purple})`,
            }}
          >
            View Details
          </Link>
          {isAuthenticated && listing.status === 'ACTIVE' && (
            <button
              onClick={() => setShowInquiry(!showInquiry)}
              className="py-2.5 px-4 rounded-xl text-sm font-medium text-gray-300 transition-all"
              style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Inquiry Form */}
        {showInquiry && isAuthenticated && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
            <textarea
              value={inquiryMessage}
              onChange={(e) => setInquiryMessage(e.target.value)}
              placeholder="Hi, I'm interested in this property..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            />
            <button
              onClick={() => {
                onInquiry(listing.id);
                setShowInquiry(false);
                setInquiryMessage('');
              }}
              className="mt-2 w-full py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{ background: `linear-gradient(135deg, ${colors.emerald}, ${colors.teal})` }}
            >
              Send Inquiry
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

// Main Page Component
export default function RentalsPage() {
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'agents' | 'calculator' | 'support'>(
    'browse',
  );
  const [showReportModal, setShowReportModal] = useState<HousingIssue | null>(null);

  // Mock listings for fallback
  const mockListings: Listing[] = [
    {
      id: 'rental-1',
      title: 'Modern 2BR Apartment near the river',
      description:
        'Light-filled apartment with balcony, secure entry, and easy access to public transport.',
      suburb: 'South Brisbane',
      state: 'QLD',
      weeklyRent: 700,
      bedrooms: 2,
      bathrooms: 1,
      parking: 1,
      status: 'ACTIVE',
      propertyType: 'Apartment',
      petFriendly: true,
      photos: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'],
    },
    {
      id: 'rental-2',
      title: 'Family home with backyard and study',
      description: 'Three-bedroom home with a quiet workspace, fenced yard, and close to schools.',
      suburb: 'Redfern',
      state: 'NSW',
      weeklyRent: 620,
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      status: 'ACTIVE',
      propertyType: 'House',
      petFriendly: true,
      furnished: false,
      photos: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop'],
    },
    {
      id: 'rental-3',
      title: 'Coastal 1BR unit with ocean breeze',
      description: 'Compact unit ideal for singles or couples. Walk to beach and local cafes.',
      suburb: 'Broome',
      state: 'WA',
      weeklyRent: 780,
      bedrooms: 1,
      bathrooms: 1,
      parking: 1,
      status: 'ACTIVE',
      propertyType: 'Unit',
      photos: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop'],
    },
    {
      id: 'rental-4',
      title: 'Spacious 4BR house close to community hub',
      description: 'Open-plan living, shaded outdoor area, and storage for tools or equipment.',
      suburb: 'Darwin',
      state: 'NT',
      weeklyRent: 520,
      bedrooms: 4,
      bathrooms: 2,
      parking: 2,
      status: 'ACTIVE',
      propertyType: 'House',
      petFriendly: true,
      photos: ['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop'],
    },
    {
      id: 'rental-5',
      title: '2BR townhouse with garden courtyard',
      description: 'Quiet street, pet-friendly courtyard, and modern kitchen.',
      suburb: 'Adelaide',
      state: 'SA',
      weeklyRent: 690,
      bedrooms: 2,
      bathrooms: 1,
      parking: 1,
      status: 'ACTIVE',
      propertyType: 'Townhouse',
      petFriendly: true,
      photos: ['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop'],
    },
    {
      id: 'rental-6',
      title: 'Studio apartment in the city fringe',
      description: 'Furnished studio with secure building access and onsite laundry.',
      suburb: 'Footscray',
      state: 'VIC',
      weeklyRent: 560,
      bedrooms: 1,
      bathrooms: 1,
      parking: 0,
      status: 'ACTIVE',
      propertyType: 'Studio',
      furnished: true,
      photos: ['https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800&h=600&fit=crop'],
    },
  ];

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.suburb) params.set('suburb', filters.suburb);
    if (filters.state) params.set('state', filters.state);
    if (filters.minRent) params.set('minRent', filters.minRent);
    if (filters.maxRent) params.set('maxRent', filters.maxRent);
    if (filters.bedrooms) params.set('bedrooms', filters.bedrooms);
    if (filters.status) params.set('status', filters.status);
    return params.toString();
  }, [filters]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api(`/rentals?${queryParams}`, { timeout: 5000, skipRetry: true });
      if (res.ok && 'data' in res) {
        setListings(res.data?.listings || mockListings);
        setTotal(res.data?.total ?? mockListings.length);
      } else {
        // Use mock data on error
        setListings(mockListings);
        setTotal(mockListings.length);
      }
    } catch (err) {
      console.error('Failed to fetch listings:', err);
      setListings(mockListings);
      setTotal(mockListings.length);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleInquiry = async (listingId: string) => {
    if (!isAuthenticated) return;
    try {
      await api('/rentals/inquiries', {
        method: 'POST',
        body: { rentalListingId: listingId },
      });
    } catch (err) {
      console.error('Failed to send inquiry:', err);
    }
  };

  const tabs = [
    { id: 'browse' as const, label: 'Browse Properties', icon: Home },
    { id: 'agents' as const, label: 'Verified Agents', icon: Users },
    { id: 'calculator' as const, label: 'Mortgage Calculator', icon: Calculator },
    { id: 'support' as const, label: 'Housing Support', icon: HelpCircle },
  ];

  return (
    <div
      className={`${spaceGrotesk.className} min-h-screen`}
      style={{
        background: 'linear-gradient(135deg, #1A0F2E 0%, #2D1B69 50%, #1A2F2A 100%)',
      }}
    >
      {/* Decorative patterns */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, #14B8A6 1.5px, transparent 1.5px),
            radial-gradient(circle at 80% 70%, #10B981 1.5px, transparent 1.5px),
            radial-gradient(circle at 50% 50%, #E91E8C 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Hero Section */}
      <section className="relative pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
              style={{
                background: `linear-gradient(135deg, ${colors.teal}20, ${colors.emerald}20)`,
                border: `1px solid ${colors.teal}30`,
                color: colors.teal,
              }}
            >
              <Home className="w-4 h-4" />
              Housing Hub
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Find Your{' '}
              <span
                style={{
                  background: `linear-gradient(135deg, ${colors.teal}, ${colors.emerald})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Safe Haven
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 mb-8">
              Culturally safe housing listings with verified agents, mortgage calculators, and
              comprehensive support for your journey home.
            </p>

            {/* Quick Stats */}
            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{total}</p>
                <p className="text-sm text-gray-400">Properties</p>
              </div>
              <div className="text-center border-x border-white/20 px-8">
                <p className="text-3xl font-bold text-white">{mockAgents.length}</p>
                <p className="text-sm text-gray-400">Verified Agents</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">100%</p>
                <p className="text-sm text-gray-400">Verified</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              {isAuthenticated ? (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${colors.pink}, ${colors.purple})`,
                    boxShadow: '0 4px 20px rgba(233, 30, 140, 0.3)',
                  }}
                >
                  <Plus className="w-5 h-5" />
                  List Your Property
                </button>
              ) : (
                <Link
                  href="/signin?returnTo=/rentals"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${colors.pink}, ${colors.purple})`,
                    boxShadow: '0 4px 20px rgba(233, 30, 140, 0.3)',
                  }}
                >
                  Sign In to List Property
                </Link>
              )}
              <Link
                href="/rentals/apply-agent"
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <ShieldCheck className="w-5 h-5" />
                Become Verified Agent
              </Link>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div
              className="inline-flex p-1.5 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === tab.id ? 'text-white' : 'text-gray-400 hover:text-white'
                    }`}
                    style={
                      activeTab === tab.id
                        ? {
                            background: `linear-gradient(135deg, ${colors.teal}, ${colors.emerald})`,
                          }
                        : {}
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <span className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {activeTab === 'browse' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Filters */}
            <aside className="lg:col-span-1">
              <div
                className="sticky top-24 rounded-2xl p-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                  </h3>
                  <button
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="text-sm text-teal-400 hover:text-teal-300"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Location */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Location</label>
                    <input
                      type="text"
                      value={filters.suburb}
                      onChange={(e) => setFilters((prev) => ({ ...prev, suburb: e.target.value }))}
                      placeholder="Enter suburb"
                      className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">State</label>
                    <select
                      value={filters.state}
                      onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <option value="">All States</option>
                      <option value="NSW">NSW</option>
                      <option value="VIC">VIC</option>
                      <option value="QLD">QLD</option>
                      <option value="WA">WA</option>
                      <option value="SA">SA</option>
                      <option value="TAS">TAS</option>
                      <option value="ACT">ACT</option>
                      <option value="NT">NT</option>
                    </select>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Budget ($/week)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={filters.minRent}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, minRent: e.target.value }))
                        }
                        placeholder="Min"
                        className="w-1/2 px-3 py-2.5 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      />
                      <input
                        type="number"
                        value={filters.maxRent}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, maxRent: e.target.value }))
                        }
                        placeholder="Max"
                        className="w-1/2 px-3 py-2.5 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Bedrooms */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Bedrooms</label>
                    <div className="flex gap-2">
                      {['Any', '1+', '2+', '3+', '4+'].map((option, i) => (
                        <button
                          key={option}
                          onClick={() =>
                            setFilters((prev) => ({ ...prev, bedrooms: i === 0 ? '' : String(i) }))
                          }
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            (i === 0 && !filters.bedrooms) || filters.bedrooms === String(i)
                              ? 'text-white'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          style={
                            (i === 0 && !filters.bedrooms) || filters.bedrooms === String(i)
                              ? {
                                  background: `linear-gradient(135deg, ${colors.teal}, ${colors.emerald})`,
                                }
                              : { background: 'rgba(255, 255, 255, 0.1)' }
                          }
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Features</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.petFriendly}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, petFriendly: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-gray-600 text-teal-500 focus:ring-teal-500/50"
                        />
                        <span className="text-sm text-gray-300">🐾 Pet Friendly</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.furnished}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, furnished: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-gray-600 text-teal-500 focus:ring-teal-500/50"
                        />
                        <span className="text-sm text-gray-300">🪑 Furnished</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.hasFloorPlan}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, hasFloorPlan: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-gray-600 text-sky-500 focus:ring-sky-500/50"
                        />
                        <span className="text-sm text-sky-400">📐 Floor Plan</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.agentVerified}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, agentVerified: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500/50"
                        />
                        <span className="text-sm text-emerald-400">
                          <ShieldCheck className="w-4 h-4 inline mr-1" /> Verified Agent
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Parking */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Parking</label>
                    <select
                      value={filters.parking}
                      onChange={(e) => setFilters((prev) => ({ ...prev, parking: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <option value="">Any</option>
                      <option value="0">0</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                    </select>
                  </div>
                </div>
              </div>
            </aside>

            {/* Listings Grid */}
            <div className="lg:col-span-3">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {loading ? 'Loading...' : `${total} Properties Available`}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Grid3X3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'list'
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="rounded-2xl overflow-hidden animate-pulse"
                      style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <div className="h-52 bg-white/10" />
                      <div className="p-5 space-y-3">
                        <div className="h-5 bg-white/10 rounded w-3/4" />
                        <div className="h-4 bg-white/10 rounded w-1/2" />
                        <div className="h-4 bg-white/10 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div
                  className="text-center py-16 rounded-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Home className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Properties Found</h3>
                  <p className="text-gray-400 mb-6">
                    Try adjusting your filters or check back later
                  </p>
                  <button
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="px-6 py-2.5 rounded-xl font-medium text-teal-400 border border-teal-400 hover:bg-teal-400/10 transition-all"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div
                  className={`grid gap-6 ${viewMode === 'grid' ? 'sm:grid-cols-2' : 'grid-cols-1'}`}
                >
                  {listings.map((listing) => (
                    <PropertyCard
                      key={listing.id}
                      listing={listing}
                      onInquiry={handleInquiry}
                      isAuthenticated={isAuthenticated}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Verified Real Estate Professionals
                </h2>
                <p className="text-gray-400">
                  All agents and brokers are verified and committed to culturally safe practices.
                </p>
              </div>

              {/* Agents List */}
              <div className="grid gap-4 sm:grid-cols-2">
                {mockAgents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>

              {/* Become an Agent CTA */}
              <div
                className="mt-8 p-6 rounded-2xl text-center"
                style={{
                  background: `linear-gradient(135deg, ${colors.purple}15, ${colors.pink}15)`,
                  border: `1px solid ${colors.purple}30`,
                }}
              >
                <ShieldCheck className="w-12 h-12 mx-auto text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Are you a Real Estate Professional?
                </h3>
                <p className="text-gray-400 mb-4">
                  Join our verified network to connect with First Nations home seekers
                </p>
                <Link
                  href="/rentals/apply-agent"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${colors.purple}, ${colors.pink})`,
                  }}
                >
                  Apply for Verification
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Why Choose Verified */}
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3 className="font-semibold text-white mb-4">Why Choose Verified Agents?</h3>
                <ul className="space-y-3">
                  {[
                    'Cultural awareness training completed',
                    'Background checked and licensed',
                    'Committed to trauma-informed practices',
                    'No discrimination guarantee',
                    'Priority support access',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick Contact */}
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3 className="font-semibold text-white mb-4">Need Help Finding an Agent?</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Our housing support team can match you with the right professional.
                </p>
                <Link
                  href="/contact?topic=housing"
                  className="block w-full py-3 rounded-xl font-medium text-center text-white transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${colors.teal}, ${colors.emerald})`,
                  }}
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MortgageCalculator />

              {/* Additional Info */}
              <div
                className="mt-6 rounded-2xl p-6"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3 className="text-lg font-semibold text-white mb-4">Home Ownership Programs</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      title: 'First Home Guarantee',
                      description: 'Buy with as little as 5% deposit without paying LMI',
                      link: 'https://www.nhfic.gov.au/fhg',
                    },
                    {
                      title: 'Indigenous Home Ownership',
                      description: 'IBA home loans with competitive rates for First Nations people',
                      link: 'https://www.iba.gov.au/housing',
                    },
                    {
                      title: 'First Home Owner Grant',
                      description: 'State grants up to $30,000 for new homes',
                      link: '#',
                    },
                    {
                      title: 'Help to Buy',
                      description: 'Shared equity scheme reducing your mortgage by up to 40%',
                      link: '#',
                    },
                  ].map((program, i) => (
                    <a
                      key={i}
                      href={program.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-xl transition-all hover:scale-[1.02]"
                      style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <h4 className="font-medium text-white mb-1 flex items-center gap-2">
                        {program.title}
                        <ExternalLink className="w-3 h-3 text-gray-500" />
                      </h4>
                      <p className="text-sm text-gray-400">{program.description}</p>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar - Brokers */}
            <div className="space-y-6">
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3 className="font-semibold text-white mb-4">Verified Mortgage Brokers</h3>
                <div className="space-y-4">
                  {mockAgents
                    .filter((a) => a.type === 'broker')
                    .map((broker) => (
                      <AgentCard key={broker.id} agent={broker} />
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Housing Support & Resources</h2>
                <p className="text-gray-400">
                  Get help with housing issues, know your rights, and access emergency support.
                </p>
              </div>

              {/* Housing Issues Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {housingIssues.map((issue) => (
                  <button
                    key={issue.id}
                    className="p-5 rounded-2xl transition-all hover:scale-[1.01] w-full text-left"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                    onClick={() => setShowReportModal(issue)}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{issue.icon}</span>
                      <div>
                        <h3 className="font-semibold text-white mb-1">{issue.title}</h3>
                        <p className="text-sm text-gray-400">{issue.description}</p>
                        <span
                          className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs"
                          style={{
                            background:
                              issue.category === 'Crisis'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : issue.category === 'Rights'
                                  ? 'rgba(139, 92, 246, 0.2)'
                                  : 'rgba(20, 184, 166, 0.2)',
                            color:
                              issue.category === 'Crisis'
                                ? '#f87171'
                                : issue.category === 'Rights'
                                  ? '#a78bfa'
                                  : '#2dd4bf',
                          }}
                        >
                          {issue.category}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Report Modal */}
              {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                  <div
                    className="w-full max-w-md rounded-2xl p-6"
                    style={{
                      background: 'linear-gradient(135deg, #1A0F2E, #2D1B69)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Report Housing Issue</h3>
                      <button
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        onClick={() => setShowReportModal(null)}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl mr-2">{showReportModal.icon}</span>
                      <span className="font-semibold text-white">{showReportModal.title}</span>
                      <p className="text-sm text-gray-400 mt-2">{showReportModal.description}</p>
                    </div>
                    <form className="space-y-4">
                      <input
                        type="text"
                        placeholder="Your Name (optional)"
                        className="w-full px-4 py-2 rounded-xl text-white bg-white/10 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                      />
                      <input
                        type="email"
                        placeholder="Your Email (optional)"
                        className="w-full px-4 py-2 rounded-xl text-white bg-white/10 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                      />
                      <textarea
                        placeholder="Describe the issue..."
                        rows={4}
                        className="w-full px-4 py-2 rounded-xl text-white bg-white/10 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
                        style={{ background: 'linear-gradient(135deg, #8B5CF6, #E91E8C)' }}
                      >
                        Submit Report
                      </button>
                    </form>
                  </div>
                </div>
              )}

              <div className="mt-8 text-center">
                <p className="text-gray-400 mb-2">Need urgent help or want to talk to someone?</p>
                <Link
                  href="/contact?topic=housing"
                  className="inline-block px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #14B8A6, #10B981)' }}
                >
                  Contact Housing Support
                </Link>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Emergency Contact */}
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Emergency Housing
                </h3>
                <p className="text-sm text-gray-300 mb-4">
                  If you&apos;re experiencing homelessness or domestic violence, help is available
                  24/7.
                </p>
                <a
                  href="tel:1800737732"
                  className="block w-full py-3 rounded-xl font-medium text-center text-white bg-red-500 hover:bg-red-600 transition-all"
                >
                  <Phone className="w-4 h-4 inline mr-2" />
                  1800 737 732
                </a>
              </div>

              {/* Resources */}
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3 className="font-semibold text-white mb-4">Helpful Resources</h3>
                <ul className="space-y-3">
                  {[
                    { title: 'Tenants Union', link: 'https://www.tenants.org.au' },
                    { title: 'Housing NSW', link: 'https://www.facs.nsw.gov.au/housing' },
                    { title: 'Aboriginal Housing Victoria', link: 'https://www.ahvic.org.au' },
                    { title: 'Indigenous Business Australia', link: 'https://www.iba.gov.au' },
                    { title: 'First Nations Legal Service', link: 'https://www.fnls.org.au' },
                    { title: 'National Shelter', link: 'https://www.shelter.org.au' },
                    { title: 'Ask Izzy (Crisis Support)', link: 'https://askizzy.org.au' },
                  ].map((resource, i) => (
                    <li key={i}>
                      <a
                        href={resource.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        {resource.title}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, #1A0F2E, #2D1B69)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">List Your Property</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="space-y-6">
              {/* Basic Info */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Property Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Modern 2BR Apartment in Surry Hills"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Description</label>
                <textarea
                  rows={4}
                  placeholder="Describe your property, amenities, and special features..."
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                />
              </div>

              {/* Media Upload */}
              <MediaUpload />

              {/* Floor Plan */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Floor Plan (Optional)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="w-full px-4 py-3 rounded-xl text-white bg-white/10 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                />
              </div>

              {/* Location & Price */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Suburb</label>
                  <input
                    type="text"
                    placeholder="e.g., Surry Hills"
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Weekly Rent ($)</label>
                  <input
                    type="number"
                    placeholder="e.g., 550"
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  />
                </div>
              </div>

              {/* Features */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Bedrooms</label>
                  <input
                    type="number"
                    placeholder="2"
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Bathrooms</label>
                  <input
                    type="number"
                    placeholder="1"
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Parking</label>
                  <input
                    type="number"
                    placeholder="1"
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl font-medium text-gray-300 transition-all"
                  style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${colors.teal}, ${colors.emerald})`,
                    boxShadow: '0 4px 15px rgba(20, 184, 166, 0.3)',
                  }}
                >
                  Create Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
