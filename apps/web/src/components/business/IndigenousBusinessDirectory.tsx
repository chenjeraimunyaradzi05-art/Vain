'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * IndigenousBusinessDirectory - Indigenous business directory and support
 * 
 * Features:
 * - Browse Indigenous-owned businesses
 * - Filter by category, location, certification
 * - Business profiles and reviews
 * - Support local Indigenous businesses
 */

interface IndigenousBusiness {
  id: string;
  name: string;
  logo?: string;
  coverImage?: string;
  description: string;
  shortDescription: string;
  category: string;
  subcategory?: string;
  location: {
    city: string;
    state: string;
    region?: string;
  };
  nation?: string;
  founders: {
    name: string;
    avatar?: string;
    title: string;
  }[];
  certifications: {
    name: string;
    issuer: string;
    verified: boolean;
  }[];
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    socialMedia?: {
      platform: string;
      url: string;
    }[];
  };
  services: string[];
  rating: number;
  reviewCount: number;
  yearEstablished: number;
  employeeCount: string;
  isVerified: boolean;
  isFavorite: boolean;
  tags: string[];
}

interface BusinessReview {
  id: string;
  author: {
    name: string;
    avatar?: string;
  };
  rating: number;
  title: string;
  content: string;
  createdAt: string;
  helpful: number;
  isHelpful: boolean;
}

interface BusinessCategory {
  value: string;
  label: string;
  icon: string;
  count: number;
}

// API functions
const businessApi = {
  async getBusinesses(params?: {
    category?: string;
    location?: string;
    search?: string;
    certified?: boolean;
    sortBy?: 'rating' | 'reviews' | 'newest';
  }): Promise<{ businesses: IndigenousBusiness[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.location) searchParams.set('location', params.location);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.certified) searchParams.set('certified', 'true');
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);

    const res = await fetch(`/api/indigenous-businesses?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch businesses');
    return res.json();
  },

  async getBusiness(businessId: string): Promise<IndigenousBusiness> {
    const res = await fetch(`/api/indigenous-businesses/${businessId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch business');
    return res.json();
  },

  async getBusinessReviews(businessId: string): Promise<{ reviews: BusinessReview[] }> {
    const res = await fetch(`/api/indigenous-businesses/${businessId}/reviews`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  async addReview(businessId: string, data: {
    rating: number;
    title: string;
    content: string;
  }): Promise<BusinessReview> {
    const res = await fetch(`/api/indigenous-businesses/${businessId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add review');
    return res.json();
  },

  async toggleFavorite(businessId: string): Promise<void> {
    const res = await fetch(`/api/indigenous-businesses/${businessId}/favorite`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to toggle favorite');
  },

  async markReviewHelpful(businessId: string, reviewId: string): Promise<void> {
    const res = await fetch(`/api/indigenous-businesses/${businessId}/reviews/${reviewId}/helpful`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to mark helpful');
  },

  async getCategories(): Promise<{ categories: BusinessCategory[] }> {
    const res = await fetch('/api/indigenous-businesses/categories', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  async submitBusiness(data: Partial<IndigenousBusiness>): Promise<void> {
    const res = await fetch('/api/indigenous-businesses/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to submit business');
  },
};

// Default categories
const defaultCategories: BusinessCategory[] = [
  { value: 'professional-services', label: 'Professional Services', icon: '💼', count: 0 },
  { value: 'arts-culture', label: 'Arts & Culture', icon: '🎨', count: 0 },
  { value: 'construction', label: 'Construction & Trades', icon: '🔨', count: 0 },
  { value: 'tourism', label: 'Tourism & Hospitality', icon: '🏨', count: 0 },
  { value: 'retail', label: 'Retail & E-commerce', icon: '🛍️', count: 0 },
  { value: 'technology', label: 'Technology', icon: '💻', count: 0 },
  { value: 'health', label: 'Health & Wellness', icon: '🏥', count: 0 },
  { value: 'education', label: 'Education & Training', icon: '📚', count: 0 },
  { value: 'food-beverage', label: 'Food & Beverage', icon: '🍽️', count: 0 },
  { value: 'media', label: 'Media & Communications', icon: '📺', count: 0 },
  { value: 'agriculture', label: 'Agriculture', icon: '🌾', count: 0 },
  { value: 'environmental', label: 'Environmental Services', icon: '🌿', count: 0 },
];

// Australian states
const australianStates = [
  'New South Wales',
  'Victoria',
  'Queensland',
  'Western Australia',
  'South Australia',
  'Tasmania',
  'Northern Territory',
  'Australian Capital Territory',
];

// Star Rating Component
function StarRating({
  rating,
  size = 'md',
  interactive,
  onRate,
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRate?: (rating: number) => void;
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeClass = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' }[size];

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => interactive && onRate?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
          disabled={!interactive}
        >
          <svg
            className={`${sizeClass} ${
              star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'
            } transition-colors`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// Business Card
function BusinessCard({
  business,
  onView,
  onToggleFavorite,
}: {
  business: IndigenousBusiness;
  onView: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden group">
      {/* Cover Image */}
      <div className="relative h-40 bg-gradient-to-br from-amber-500 to-orange-600">
        {business.coverImage && (
          <OptimizedImage
            src={toCloudinaryAutoUrl(business.coverImage)}
            alt={`${business.name} cover image`}
            width={1200}
            height={160}
            className="w-full h-full object-cover"
          />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full hover:bg-white transition-colors"
        >
          <svg
            className={`w-5 h-5 ${business.isFavorite ? 'text-red-500' : 'text-gray-400'}`}
            fill={business.isFavorite ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        {business.isVerified && (
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Verified
          </div>
        )}
      </div>

      {/* Logo */}
      <div className="px-6 -mt-8 relative z-10">
        {business.logo ? (
          <OptimizedImage
            src={toCloudinaryAutoUrl(business.logo)}
            alt={`${business.name} logo`}
            width={64}
            height={64}
            className="w-16 h-16 rounded-xl border-4 border-white dark:border-gray-800 object-cover bg-white"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl border-4 border-white dark:border-gray-800 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xl font-bold">
            {business.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 pt-3">
        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{business.name}</h3>
        <p className="text-sm text-gray-500">{business.category}</p>

        {business.nation && (
          <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
            <span>🌿</span> {business.nation}
          </p>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
          {business.shortDescription}
        </p>

        {/* Location & Rating */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {business.location.city}, {business.location.state}
          </span>
          <div className="flex items-center gap-1">
            <StarRating rating={business.rating} size="sm" />
            <span className="text-sm text-gray-500">({business.reviewCount})</span>
          </div>
        </div>

        {/* Certifications */}
        {business.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {business.certifications.slice(0, 2).map((cert, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs rounded-full flex items-center gap-1"
              >
                {cert.verified && <span>✓</span>}
                {cert.name}
              </span>
            ))}
          </div>
        )}

        {/* Action */}
        <Button onClick={onView} className="w-full mt-4">
          View Business
        </Button>
      </div>
    </div>
  );
}

// Business Detail Modal
function BusinessDetailModal({
  business,
  onClose,
  onToggleFavorite,
}: {
  business: IndigenousBusiness;
  onClose: () => void;
  onToggleFavorite: () => void;
}) {
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [activeTab, setActiveTab] = useState<'about' | 'services' | 'reviews'>('about');
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    if (activeTab === 'reviews') {
      setIsLoadingReviews(true);
      businessApi.getBusinessReviews(business.id)
        .then(res => setReviews(res.reviews))
        .catch(console.error)
        .finally(() => setIsLoadingReviews(false));
    }
  }, [activeTab, business.id]);

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      await businessApi.markReviewHelpful(business.id, reviewId);
      setReviews(prev =>
        prev.map(r =>
          r.id === reviewId
            ? { ...r, isHelpful: !r.isHelpful, helpful: r.isHelpful ? r.helpful - 1 : r.helpful + 1 }
            : r
        )
      );
    } catch (error) {
      console.error('Failed to mark helpful:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Cover */}
        <div className="relative h-48 bg-gradient-to-br from-amber-500 to-orange-600 flex-shrink-0">
          {business.coverImage && (
            <OptimizedImage
              src={toCloudinaryAutoUrl(business.coverImage)}
              alt={`${business.name} cover image`}
              width={1200}
              height={192}
              className="w-full h-full object-cover"
            />
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-end gap-4 -mt-10">
            {business.logo ? (
              <OptimizedImage
                src={toCloudinaryAutoUrl(business.logo)}
                alt={`${business.name} logo`}
                width={80}
                height={80}
                className="w-20 h-20 rounded-xl border-4 border-white dark:border-gray-800 object-cover bg-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl border-4 border-white dark:border-gray-800 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
                {business.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{business.name}</h2>
                {business.isVerified && (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-gray-500">{business.category}</p>
            </div>
            <button
              onClick={onToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                business.isFavorite
                  ? 'bg-red-50 text-red-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
              }`}
            >
              <svg
                className="w-6 h-6"
                fill={business.isFavorite ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {/* Rating and Info */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <StarRating rating={business.rating} size="sm" />
              <span className="text-gray-600 dark:text-gray-400">
                {business.rating.toFixed(1)} ({business.reviewCount} reviews)
              </span>
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-400">
              {business.location.city}, {business.location.state}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-400">Est. {business.yearEstablished}</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            {(['about', 'services', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 font-medium capitalize transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">About</h3>
                <p className="text-gray-600 dark:text-gray-400">{business.description}</p>
              </div>

              {/* Nation */}
              {business.nation && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <h3 className="font-medium text-amber-900 dark:text-amber-200 mb-1">Traditional Owners</h3>
                  <p className="text-amber-700 dark:text-amber-300">{business.nation}</p>
                </div>
              )}

              {/* Founders */}
              {business.founders.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Founders</h3>
                  <div className="flex flex-wrap gap-4">
                    {business.founders.map((founder, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {founder.avatar ? (
                          <OptimizedImage
                            src={toCloudinaryAutoUrl(founder.avatar)}
                            alt={`${founder.name} avatar`}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500">
                            {founder.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{founder.name}</p>
                          <p className="text-sm text-gray-500">{founder.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {business.certifications.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Certifications</h3>
                  <div className="space-y-2">
                    {business.certifications.map((cert, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{cert.name}</p>
                          <p className="text-sm text-gray-500">{cert.issuer}</p>
                        </div>
                        {cert.verified && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs font-medium rounded-full">
                            Verified
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Contact</h3>
                <div className="space-y-2">
                  {business.contactInfo.phone && (
                    <a
                      href={`tel:${business.contactInfo.phone}`}
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {business.contactInfo.phone}
                    </a>
                  )}
                  {business.contactInfo.email && (
                    <a
                      href={`mailto:${business.contactInfo.email}`}
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {business.contactInfo.email}
                    </a>
                  )}
                  {business.contactInfo.website && (
                    <a
                      href={business.contactInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      {business.contactInfo.website}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="grid gap-3">
                {business.services.map((service, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">{service}</span>
                  </div>
                ))}
              </div>

              {/* Tags */}
              {business.tags.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {business.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {isLoadingReviews ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                </div>
              ) : reviews.length > 0 ? (
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3">
                        {review.author.avatar ? (
                          <OptimizedImage
                            src={toCloudinaryAutoUrl(review.author.avatar)}
                            alt={`${review.author.name} avatar`}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 text-sm">
                            {review.author.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{review.author.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString('en-AU')}
                          </p>
                        </div>
                      </div>
                      <StarRating rating={review.rating} size="sm" />
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">{review.title}</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{review.content}</p>
                    <button
                      onClick={() => handleMarkHelpful(review.id)}
                      className={`mt-3 flex items-center gap-1 text-sm ${
                        review.isHelpful ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      Helpful ({review.helpful})
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No reviews yet</p>
                  <Button size="sm" className="mt-3">Write a Review</Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          {business.contactInfo.website && (
            <Button
              onClick={() => window.open(business.contactInfo.website, '_blank')}
              className="flex-1"
            >
              Visit Website
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component
export function IndigenousBusinessDirectory() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<IndigenousBusiness[]>([]);
  const [categories, setCategories] = useState<BusinessCategory[]>(defaultCategories);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<IndigenousBusiness | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'newest'>('rating');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [businessesRes, categoriesRes] = await Promise.all([
        businessApi.getBusinesses({
          search: searchQuery,
          category: categoryFilter,
          location: locationFilter,
          certified: certifiedOnly,
          sortBy,
        }),
        businessApi.getCategories(),
      ]);
      setBusinesses(businessesRes.businesses);
      setCategories(categoriesRes.categories.length > 0 ? categoriesRes.categories : defaultCategories);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, categoryFilter, locationFilter, certifiedOnly, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleFavorite = async (businessId: string) => {
    try {
      await businessApi.toggleFavorite(businessId);
      setBusinesses(prev =>
        prev.map(b => b.id === businessId ? { ...b, isFavorite: !b.isFavorite } : b)
      );
      if (selectedBusiness?.id === businessId) {
        setSelectedBusiness(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Indigenous Business Directory</h1>
        <p className="text-gray-500 mt-1">Support and connect with Indigenous-owned businesses across Australia</p>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-8 mb-8 text-white">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold mb-2">Support Indigenous Enterprise</h2>
          <p className="text-amber-100 mb-4">
            Discover and connect with Indigenous-owned businesses. From professional services to 
            arts and culture, find verified Indigenous businesses making a difference.
          </p>
          <div className="flex gap-3">
            <Button className="bg-white text-amber-600 hover:bg-amber-50">
              Submit Your Business
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white/10">
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Browse by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(categoryFilter === cat.value ? '' : cat.value)}
              className={`p-4 rounded-xl text-center transition-colors ${
                categoryFilter === cat.value
                  ? 'bg-amber-100 border-2 border-amber-500 dark:bg-amber-900/30'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-amber-300'
              }`}
            >
              <div className="text-2xl mb-1">{cat.icon}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{cat.label}</div>
              {cat.count > 0 && (
                <div className="text-xs text-gray-500">{cat.count} businesses</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[250px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search businesses..."
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All States</option>
          {australianStates.map((state) => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="rating">Highest Rated</option>
          <option value="reviews">Most Reviews</option>
          <option value="newest">Newest</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={certifiedOnly}
            onChange={(e) => setCertifiedOnly(e.target.checked)}
            className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Certified only</span>
        </label>
      </div>

      {/* Results */}
      {businesses.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              onView={() => setSelectedBusiness(business)}
              onToggleFavorite={() => handleToggleFavorite(business.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No businesses found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your filters or search criteria</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedBusiness && (
        <BusinessDetailModal
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
          onToggleFavorite={() => handleToggleFavorite(selectedBusiness.id)}
        />
      )}
    </div>
  );
}

export default IndigenousBusinessDirectory;
