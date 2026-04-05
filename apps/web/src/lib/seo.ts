/**
 * SEO Metadata Component
 * 
 * Provides consistent SEO metadata across the application.
 * Use this component in page layouts for proper meta tags.
 */

import { Metadata } from 'next';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

const SITE_NAME = 'Vantage';
const DEFAULT_DESCRIPTION = 'Vantage helps you see your next step — and take it. Jobs, learning, mentors, community, business tools, and real-world opportunities in one guided platform.';
const DEFAULT_IMAGE = '/images/og-default.png';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vantageplatform.com';

/**
 * Generate metadata object for Next.js App Router
 */
export function generateSEOMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = [],
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noIndex = false,
  publishedTime,
  modifiedTime,
  author,
}: SEOProps): Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL;
  const fullImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  const defaultKeywords = [
    'pathway platform',
    'job discovery',
    'career guidance',
    'mentorship',
    'learning pathways',
    'opportunity matching',
    'business tools',
    'financial wellbeing',
  ];

  return {
    title: fullTitle,
    description,
    keywords: [...defaultKeywords, ...keywords],
    authors: author ? [{ name: author }] : undefined,
    robots: noIndex ? 'noindex, nofollow' : 'index, follow',
    
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: title || SITE_NAME,
        },
      ],
      locale: 'en_AU',
      type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [fullImage],
    },
    
    alternates: {
      canonical: fullUrl,
    },
    
    other: {
      'format-detection': 'telephone=no',
    },
  };
}

/**
 * Structured Data for Jobs (JSON-LD)
 */
export interface JobStructuredData {
  title: string;
  description: string;
  datePosted: string;
  validThrough?: string;
  employmentType: string;
  hiringOrganization: {
    name: string;
    logo?: string;
    website?: string;
  };
  jobLocation: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion: string;
    postalCode?: string;
    addressCountry: string;
  };
  baseSalary?: {
    currency: string;
    minValue: number;
    maxValue: number;
    unitText: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  };
  identifier?: {
    name: string;
    value: string;
  };
}

export function generateJobStructuredData(job: JobStructuredData): string {
  const structuredData = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    employmentType: job.employmentType,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.hiringOrganization.name,
      logo: job.hiringOrganization.logo,
      sameAs: job.hiringOrganization.website,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: job.jobLocation.streetAddress,
        addressLocality: job.jobLocation.addressLocality,
        addressRegion: job.jobLocation.addressRegion,
        postalCode: job.jobLocation.postalCode,
        addressCountry: job.jobLocation.addressCountry,
      },
    },
    ...(job.baseSalary && {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: job.baseSalary.currency,
        value: {
          '@type': 'QuantitativeValue',
          minValue: job.baseSalary.minValue,
          maxValue: job.baseSalary.maxValue,
          unitText: job.baseSalary.unitText,
        },
      },
    }),
    ...(job.identifier && {
      identifier: {
        '@type': 'PropertyValue',
        name: job.identifier.name,
        value: job.identifier.value,
      },
    }),
  };

  return JSON.stringify(structuredData);
}

/**
 * Structured Data for Organization (JSON-LD)
 */
export function generateOrganizationStructuredData(): string {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/images/logo.png`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [
      'https://www.facebook.com/vantageplatform',
      'https://www.linkedin.com/company/vantage-platform',
      'https://twitter.com/vantagehq',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '',
      contactType: 'customer service',
      areaServed: 'AU',
      availableLanguage: 'English',
    },
  };

  return JSON.stringify(structuredData);
}

/**
 * Structured Data for Course (JSON-LD)
 */
export interface CourseStructuredData {
  name: string;
  description: string;
  provider: {
    name: string;
    url?: string;
  };
  url?: string;
  duration?: string;
  educationalCredentialAwarded?: string;
}

export function generateCourseStructuredData(course: CourseStructuredData): string {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: course.provider.name,
      sameAs: course.provider.url,
    },
    url: course.url,
    ...(course.duration && { timeRequired: course.duration }),
    ...(course.educationalCredentialAwarded && {
      educationalCredentialAwarded: course.educationalCredentialAwarded,
    }),
  };

  return JSON.stringify(structuredData);
}

/**
 * Structured Data for Events (JSON-LD) - Cultural events, workshops, etc.
 */
export interface EventStructuredData {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address?: string;
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
  };
  organizer: {
    name: string;
    url?: string;
  };
  image?: string;
  url?: string;
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled';
  eventAttendanceMode?: 'OfflineEventAttendanceMode' | 'OnlineEventAttendanceMode' | 'MixedEventAttendanceMode';
  offers?: {
    price: number;
    priceCurrency: string;
    availability?: 'InStock' | 'SoldOut' | 'PreOrder';
    validFrom?: string;
  };
  performer?: {
    name: string;
    type?: 'Person' | 'Organization';
  };
}

export function generateEventStructuredData(event: EventStructuredData): string {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    ...(event.endDate && { endDate: event.endDate }),
    location: event.eventAttendanceMode === 'OnlineEventAttendanceMode'
      ? {
          '@type': 'VirtualLocation',
          url: event.url,
        }
      : {
          '@type': 'Place',
          name: event.location.name,
          address: {
            '@type': 'PostalAddress',
            streetAddress: event.location.address,
            addressLocality: event.location.addressLocality,
            addressRegion: event.location.addressRegion,
            addressCountry: event.location.addressCountry || 'AU',
          },
        },
    organizer: {
      '@type': 'Organization',
      name: event.organizer.name,
      ...(event.organizer.url && { url: event.organizer.url }),
    },
    ...(event.image && { image: event.image }),
    ...(event.url && { url: event.url }),
    ...(event.eventStatus && { eventStatus: `https://schema.org/${event.eventStatus}` }),
    ...(event.eventAttendanceMode && { eventAttendanceMode: `https://schema.org/${event.eventAttendanceMode}` }),
    ...(event.offers && {
      offers: {
        '@type': 'Offer',
        price: event.offers.price,
        priceCurrency: event.offers.priceCurrency,
        ...(event.offers.availability && { availability: `https://schema.org/${event.offers.availability}` }),
        ...(event.offers.validFrom && { validFrom: event.offers.validFrom }),
      },
    }),
    ...(event.performer && {
      performer: {
        '@type': event.performer.type || 'Organization',
        name: event.performer.name,
      },
    }),
  };

  return JSON.stringify(structuredData);
}

export default generateSEOMetadata;
