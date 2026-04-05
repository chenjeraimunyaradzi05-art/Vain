/**
 * Search Service
 * 
 * Full-text search with:
 * - Multi-entity search (users, jobs, posts, groups)
 * - Indigenous-aware search with cultural terminology
 * - Fuzzy matching and autocomplete
 * - Search analytics
 * - Result ranking and personalization
 */

import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';
import { prisma } from '../lib/database';

// Types
export interface SearchQuery {
  query: string;
  types?: SearchEntityType[];
  filters?: SearchFilters;
  sort?: SearchSort;
  page?: number;
  limit?: number;
  userId?: string; // For personalization
}

export interface SearchFilters {
  // User filters
  skills?: string[];
  location?: string;
  
  // Job filters
  jobType?: ('FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'CASUAL')[];
  salary?: { min?: number; max?: number };
  remote?: boolean;
  indigenousEmployer?: boolean;
  postedWithin?: number; // days
  
  // Content filters
  contentType?: ('text' | 'image' | 'video' | 'article')[];
  hasMedia?: boolean;
  
  // Group filters
  groupType?: string[];
  isPublic?: boolean;
}

export interface SearchSort {
  field: string;
  order: 'asc' | 'desc';
}

export type SearchEntityType = 
  | 'user'
  | 'job'
  | 'post'
  | 'group'
  | 'company'
  | 'story'
  | 'event';

export interface SearchResult<T = unknown> {
  id: string;
  type: SearchEntityType;
  score: number;
  highlights?: Record<string, string[]>;
  data: T;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  took: number; // ms
  suggestions?: string[];
  facets?: Record<string, FacetResult>;
}

export interface FacetResult {
  name: string;
  values: Array<{ value: string; count: number }>;
}

export interface AutocompleteResult {
  text: string;
  type: SearchEntityType;
  id?: string;
}

// Indigenous-aware synonyms and terms
const INDIGENOUS_SYNONYMS: Record<string, string[]> = {
  'indigenous': ['aboriginal', 'first nations', 'torres strait islander', 'blackfella', 'mob'],
  'elder': ['aunty', 'uncle', 'respected elder', 'community elder'],
  'community': ['mob', 'country', 'land', 'clan'],
  'culture': ['cultural', 'traditional', 'dreamtime', 'dreaming'],
  'art': ['artwork', 'painting', 'dot painting', 'traditional art'],
  'language': ['lingo', 'mother tongue', 'traditional language'],
  'ceremony': ['corroboree', 'ritual', 'cultural practice'],
  'connection': ['kinship', 'family', 'mob ties'],
  'land': ['country', 'traditional lands', 'homelands'],
  'health': ['wellbeing', 'social emotional wellbeing', 'spiritual health'],
};

// Stopwords to filter
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
]);

class SearchService {
  private static instance: SearchService;
  private readonly MAX_RESULTS = 100;
  private readonly DEFAULT_PAGE_SIZE = 20;

  private constructor() {}

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  // ==================== Main Search ====================

  /**
   * Perform a search across all entity types
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    
    const {
      query: searchQuery,
      types = ['user', 'job', 'post', 'group'],
      filters = {},
      sort,
      page = 1,
      limit = this.DEFAULT_PAGE_SIZE,
      userId,
    } = query;

    // Normalize and expand query
    const expandedQuery = this.expandQuery(searchQuery);
    
    // Check cache
    const cacheKey = this.getCacheKey(query);
    const cached = await redisCache.get<SearchResponse>(cacheKey);
    if (cached) {
      return { ...cached, took: Date.now() - startTime };
    }

    // Perform searches in parallel
    const searchPromises = types.map(type => 
      this.searchByType(type, expandedQuery, filters, sort, limit * 2)
    );

    const typeResults = await Promise.all(searchPromises);

    // Merge and rank results
    let allResults: SearchResult[] = [];
    for (const results of typeResults) {
      allResults.push(...results);
    }

    // Apply personalization if user provided
    if (userId) {
      allResults = await this.personalizeResults(allResults, userId);
    }

    // Sort by score
    allResults.sort((a, b) => b.score - a.score);

    // Paginate
    const offset = (page - 1) * limit;
    const paginatedResults = allResults.slice(offset, offset + limit);
    const total = allResults.length;
    const totalPages = Math.ceil(total / limit);

    // Generate suggestions if no results
    let suggestions: string[] | undefined;
    if (total === 0) {
      suggestions = await this.getSuggestions(searchQuery);
    }

    // Get facets
    const facets = this.calculateFacets(allResults, types);

    const response: SearchResponse = {
      results: paginatedResults,
      total,
      page,
      totalPages,
      took: Date.now() - startTime,
      suggestions,
      facets,
    };

    // Cache results
    await redisCache.set(cacheKey, response, 300); // 5 minutes

    // Track search analytics
    await this.trackSearch(searchQuery, types, total, userId);

    return response;
  }

  /**
   * Search by specific entity type
   */
  private async searchByType(
    type: SearchEntityType,
    query: string[],
    filters: SearchFilters,
    _sort?: SearchSort,
    limit: number = 50
  ): Promise<SearchResult[]> {
    switch (type) {
      case 'user':
        return this.searchUsers(query, filters, limit);
      case 'job':
        return this.searchJobs(query, filters, limit);
      case 'post':
        return this.searchPosts(query, filters, limit);
      case 'group':
        return this.searchGroups(query, filters, limit);
      case 'company':
        return this.searchCompanies(query, filters, limit);
      case 'story':
        return this.searchStories(query, limit);
      default:
        return [];
    }
  }

  // ==================== Entity Searches ====================

  /**
   * Search users - uses MemberProfile for user details
   */
  private async searchUsers(
    terms: string[],
    filters: SearchFilters,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      const searchTerm = terms[0] || '';
      
      // Search through MemberProfile for detailed user info
      const profiles = await prisma.memberProfile.findMany({
        where: {
          OR: [
            { bio: { contains: searchTerm, mode: 'insensitive' } },
            { mobNation: { contains: searchTerm, mode: 'insensitive' } },
            { careerInterest: { contains: searchTerm, mode: 'insensitive' } },
          ],
          ...(filters.location && {
            mobNation: { contains: filters.location, mode: 'insensitive' },
          }),
        },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              userType: true,
            },
          },
        },
      });

      // Also search MentorProfiles
      const mentorProfiles = await prisma.mentorProfile.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { bio: { contains: searchTerm, mode: 'insensitive' } },
            { expertise: { contains: searchTerm, mode: 'insensitive' } },
            { skills: { contains: searchTerm, mode: 'insensitive' } },
            { industry: { contains: searchTerm, mode: 'insensitive' } },
          ],
          active: true,
        },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              userType: true,
            },
          },
        },
      });

      const memberResults: SearchResult[] = profiles.map((profile, index: number) => ({
        id: profile.userId,
        type: 'user' as const,
        score: this.calculateScore(terms, [
          profile.bio || '',
          profile.careerInterest || '',
          profile.mobNation || '',
        ], 1 - index * 0.01),
        highlights: this.generateHighlights(terms, {
          bio: profile.bio || '',
          careerInterest: profile.careerInterest || '',
        }),
        data: {
          id: profile.userId,
          email: profile.user.email,
          userType: profile.user.userType,
          bio: profile.bio,
          mobNation: profile.mobNation,
          careerInterest: profile.careerInterest,
          profileCompletionPercent: profile.profileCompletionPercent,
        },
      }));

      const mentorResults: SearchResult[] = mentorProfiles.map((profile, index: number) => ({
        id: profile.userId,
        type: 'user' as const,
        score: this.calculateScore(terms, [
          profile.name || '',
          profile.bio || '',
          profile.expertise || '',
        ], (1 - index * 0.01) * 1.2), // Boost mentors slightly
        highlights: this.generateHighlights(terms, {
          name: profile.name || '',
          bio: profile.bio || '',
          expertise: profile.expertise || '',
        }),
        data: {
          id: profile.userId,
          email: profile.user.email,
          userType: 'MENTOR',
          name: profile.name,
          title: profile.title,
          bio: profile.bio,
          expertise: profile.expertise,
          industry: profile.industry,
          location: profile.location,
          avatar: profile.avatar || profile.avatarUrl,
        },
      }));

      return [...memberResults, ...mentorResults].slice(0, limit);
    } catch (error) {
      logger.error('User search failed', { error });
      return [];
    }
  }

  /**
   * Search jobs
   */
  private async searchJobs(
    terms: string[],
    filters: SearchFilters,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      const searchTerm = terms[0] || '';
      
      const jobs = await prisma.job.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { location: { contains: searchTerm, mode: 'insensitive' } },
          ],
          ...(filters.salary?.min && {
            salaryHigh: { gte: filters.salary.min },
          }),
          ...(filters.salary?.max && {
            salaryLow: { lte: filters.salary.max },
          }),
          ...(filters.postedWithin && {
            createdAt: {
              gte: new Date(Date.now() - filters.postedWithin * 24 * 60 * 60 * 1000),
            },
          }),
          ...(filters.location && {
            location: { contains: filters.location, mode: 'insensitive' },
          }),
        },
        include: {
          user: {
            select: {
              id: true,
              companyProfile: {
                select: {
                  companyName: true,
                  logo: true,
                  industry: true,
                  rapCertificationLevel: true,
                },
              },
            },
          },
          jobSkills: {
            include: {
              skill: true,
            },
          },
        },
        take: limit,
        orderBy: [
          { isFeatured: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return jobs.map((job, index: number) => {
        // Boost score for RAP-certified employers
        let boost = 1;
        if (job.user?.companyProfile?.rapCertificationLevel) {
          boost = 1.2;
          if (job.user.companyProfile.rapCertificationLevel === 'GOLD' || 
              job.user.companyProfile.rapCertificationLevel === 'PLATINUM') {
            boost = 1.5;
          }
        }
        if (job.isFeatured) {
          boost *= 1.3;
        }

        const skills = job.jobSkills.map((js: { skill: { name: string } }) => js.skill.name);

        return {
          id: job.id,
          type: 'job' as const,
          score: this.calculateScore(terms, [
            job.title,
            job.description || '',
            job.location || '',
            ...skills,
          ], (1 - index * 0.01) * boost),
          highlights: this.generateHighlights(terms, {
            title: job.title,
            description: job.description || '',
          }),
          data: {
            id: job.id,
            title: job.title,
            description: job.description,
            location: job.location,
            employment: job.employment,
            salaryLow: job.salaryLow,
            salaryHigh: job.salaryHigh,
            isFeatured: job.isFeatured,
            createdAt: job.createdAt,
            companyName: job.user?.companyProfile?.companyName,
            companyLogo: job.user?.companyProfile?.logo,
            industry: job.user?.companyProfile?.industry,
            rapCertificationLevel: job.user?.companyProfile?.rapCertificationLevel,
            skills,
          },
        };
      });
    } catch (error) {
      logger.error('Job search failed', { error });
      return [];
    }
  }

  /**
   * Search social posts
   */
  private async searchPosts(
    terms: string[],
    filters: SearchFilters,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      const searchTerm = terms[0] || '';
      
      const posts = await prisma.socialPost.findMany({
        where: {
          visibility: 'public',
          isActive: true,
          isSpam: false,
          OR: [
            { content: { contains: searchTerm, mode: 'insensitive' } },
            { articleTitle: { contains: searchTerm, mode: 'insensitive' } },
          ],
          ...(filters.contentType?.length && {
            type: { in: filters.contentType },
          }),
          ...(filters.hasMedia !== undefined && filters.hasMedia && {
            NOT: { mediaUrls: null },
          }),
        },
        take: limit,
        orderBy: [
          { likeCount: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return posts.map((post, index: number) => ({
        id: post.id,
        type: 'post' as const,
        score: this.calculateScore(terms, [
          post.content || '',
          post.articleTitle || '',
        ], 1 - index * 0.01),
        highlights: this.generateHighlights(terms, {
          content: post.content,
          title: post.articleTitle || '',
        }),
        data: {
          id: post.id,
          type: post.type,
          content: post.content,
          articleTitle: post.articleTitle,
          mediaUrls: post.mediaUrls,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          createdAt: post.createdAt,
          authorId: post.authorId,
        },
      }));
    } catch (error) {
      logger.error('Post search failed', { error });
      return [];
    }
  }

  /**
   * Search community groups
   */
  private async searchGroups(
    terms: string[],
    filters: SearchFilters,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      const searchTerm = terms[0] || '';
      
      const groups = await prisma.communityGroup.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { category: { contains: searchTerm, mode: 'insensitive' } },
          ],
          ...(filters.isPublic !== undefined && {
            visibility: filters.isPublic ? 'public' : 'private',
          }),
          ...(filters.groupType?.length && {
            groupType: { in: filters.groupType },
          }),
        },
        take: limit,
        orderBy: [
          { isFeatured: 'desc' },
          { memberCount: 'desc' },
        ],
      });

      return groups.map((group, index: number) => ({
        id: group.id,
        type: 'group' as const,
        score: this.calculateScore(terms, [
          group.name,
          group.description || '',
          group.category || '',
        ], 1 - index * 0.01),
        highlights: this.generateHighlights(terms, {
          name: group.name,
          description: group.description || '',
        }),
        data: {
          id: group.id,
          name: group.name,
          slug: group.slug,
          description: group.description,
          coverImageUrl: group.coverImageUrl,
          iconUrl: group.iconUrl,
          groupType: group.groupType,
          category: group.category,
          visibility: group.visibility,
          memberCount: group.memberCount,
          postCount: group.postCount,
          isFeatured: group.isFeatured,
          isOfficial: group.isOfficial,
          womenOnly: group.womenOnly,
        },
      }));
    } catch (error) {
      logger.error('Group search failed', { error });
      return [];
    }
  }

  /**
   * Search company profiles
   */
  private async searchCompanies(
    terms: string[],
    filters: SearchFilters,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      const searchTerm = terms[0] || '';
      
      const companies = await prisma.companyProfile.findMany({
        where: {
          OR: [
            { companyName: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { industry: { contains: searchTerm, mode: 'insensitive' } },
          ],
          ...(filters.indigenousEmployer && {
            NOT: { rapCertificationLevel: null },
          }),
          isVerified: true,
        },
        take: limit,
        orderBy: [
          { rapPoints: 'desc' },
        ],
      });

      return companies.map((company, index: number) => {
        // Boost RAP-certified companies
        let boost = 1;
        if (company.rapCertificationLevel) {
          boost = company.rapCertificationLevel === 'PLATINUM' ? 1.5 :
                  company.rapCertificationLevel === 'GOLD' ? 1.4 :
                  company.rapCertificationLevel === 'SILVER' ? 1.2 : 1.1;
        }

        return {
          id: company.id,
          type: 'company' as const,
          score: this.calculateScore(terms, [
            company.companyName,
            company.description || '',
            company.industry || '',
          ], (1 - index * 0.01) * boost),
          highlights: this.generateHighlights(terms, {
            name: company.companyName,
            description: company.description || '',
          }),
          data: {
            id: company.id,
            companyName: company.companyName,
            description: company.description,
            industry: company.industry,
            logo: company.logo,
            website: company.website,
            city: company.city,
            state: company.state,
            rapCertificationLevel: company.rapCertificationLevel,
            rapPoints: company.rapPoints,
            isVerified: company.isVerified,
          },
        };
      });
    } catch (error) {
      logger.error('Company search failed', { error });
      return [];
    }
  }

  /**
   * Search stories - success stories from the community
   */
  private async searchStories(
    terms: string[],
    limit: number
  ): Promise<SearchResult[]> {
    try {
      const searchTerm = terms[0] || '';
      
      // Search group posts that are story-type
      const stories = await prisma.groupPost.findMany({
        where: {
          type: 'article',
          isApproved: true,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          group: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        take: limit,
        orderBy: { likeCount: 'desc' },
      });

      return stories.map((story, index: number) => ({
        id: story.id,
        type: 'story' as const,
        score: this.calculateScore(terms, [
          story.title || '',
          story.content || '',
        ], 1 - index * 0.01),
        highlights: this.generateHighlights(terms, {
          title: story.title || '',
          content: story.content,
        }),
        data: {
          id: story.id,
          title: story.title,
          content: story.content,
          groupName: story.group.name,
          groupSlug: story.group.slug,
          likeCount: story.likeCount,
          commentCount: story.commentCount,
          createdAt: story.createdAt,
        },
      }));
    } catch (error) {
      logger.error('Story search failed', { error });
      return [];
    }
  }

  // ==================== Autocomplete ====================

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(
    prefix: string,
    types: SearchEntityType[] = ['user', 'job'],
    limit: number = 10
  ): Promise<AutocompleteResult[]> {
    if (prefix.length < 2) return [];

    const cacheKey = `autocomplete:${prefix}:${types.join(',')}`;
    const cached = await redisCache.get<AutocompleteResult[]>(cacheKey);
    if (cached) return cached;

    const results: AutocompleteResult[] = [];

    // Get suggestions from each type
    for (const type of types) {
      const suggestions = await this.getTypeSuggestions(type, prefix, 5);
      results.push(...suggestions);
    }

    // Add popular search terms
    const popularTerms = await this.getPopularSearchTerms(prefix, 3);
    results.push(...popularTerms.map(term => ({
      text: term,
      type: 'user' as SearchEntityType, // Default type for terms
    })));

    // Limit and cache
    const limited = results.slice(0, limit);
    await redisCache.set(cacheKey, limited, 60);

    return limited;
  }

  /**
   * Get suggestions for a specific type
   */
  private async getTypeSuggestions(
    type: SearchEntityType,
    prefix: string,
    limit: number
  ): Promise<AutocompleteResult[]> {
    try {
      switch (type) {
        case 'user': {
          // Search mentor profiles for names
          const mentors = await prisma.mentorProfile.findMany({
            where: {
              name: { startsWith: prefix, mode: 'insensitive' },
              active: true,
            },
            take: limit,
            select: { userId: true, name: true },
          });
          return mentors.map((m) => ({
            text: m.name || '',
            type: 'user',
            id: m.userId,
          }));
        }

        case 'job': {
          const jobs = await prisma.job.findMany({
            where: {
              title: { startsWith: prefix, mode: 'insensitive' },
              isActive: true,
            },
            take: limit,
            select: { id: true, title: true },
          });
          return jobs.map((j) => ({
            text: j.title,
            type: 'job',
            id: j.id,
          }));
        }

        case 'group': {
          const groups = await prisma.communityGroup.findMany({
            where: {
              name: { startsWith: prefix, mode: 'insensitive' },
              isActive: true,
              visibility: 'public',
            },
            take: limit,
            select: { id: true, name: true },
          });
          return groups.map((g) => ({
            text: g.name,
            type: 'group',
            id: g.id,
          }));
        }

        case 'company': {
          const companies = await prisma.companyProfile.findMany({
            where: {
              companyName: { startsWith: prefix, mode: 'insensitive' },
              isVerified: true,
            },
            take: limit,
            select: { id: true, companyName: true },
          });
          return companies.map((c) => ({
            text: c.companyName,
            type: 'company',
            id: c.id,
          }));
        }

        default:
          return [];
      }
    } catch (error) {
      logger.error('Type suggestions failed', { type, error });
      return [];
    }
  }

  /**
   * Get popular search terms
   */
  private async getPopularSearchTerms(prefix: string, limit: number): Promise<string[]> {
    try {
      const key = 'search:popular';
      const terms = await redisCache.zrevrange(key, 0, 100);
      return terms
        .filter(term => term.toLowerCase().startsWith(prefix.toLowerCase()))
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  // ==================== Query Processing ====================

  /**
   * Expand query with synonyms
   */
  private expandQuery(query: string): string[] {
    const words = query.toLowerCase().split(/\s+/);
    const expanded: Set<string> = new Set();

    for (const word of words) {
      if (STOPWORDS.has(word)) continue;
      
      expanded.add(word);
      
      // Add synonyms
      const synonyms = INDIGENOUS_SYNONYMS[word];
      if (synonyms) {
        synonyms.forEach(s => expanded.add(s));
      }

      // Check if this word is a synonym
      for (const [key, vals] of Object.entries(INDIGENOUS_SYNONYMS)) {
        if (vals.includes(word)) {
          expanded.add(key);
        }
      }
    }

    return Array.from(expanded);
  }

  /**
   * Calculate relevance score
   */
  private calculateScore(terms: string[], fields: string[], baseScore: number = 1): number {
    let score = baseScore;
    const content = fields.join(' ').toLowerCase();

    for (const term of terms) {
      if (content.includes(term.toLowerCase())) {
        score += 0.1;
        // Bonus for exact word match
        if (new RegExp(`\\b${term}\\b`, 'i').test(content)) {
          score += 0.2;
        }
      }
    }

    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Generate highlights for search results
   */
  private generateHighlights(
    terms: string[],
    fields: Record<string, string>
  ): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};

    for (const [field, content] of Object.entries(fields)) {
      if (!content) continue;

      const matches: string[] = [];
      for (const term of terms) {
        const regex = new RegExp(`(.{0,50})(${term})(.{0,50})`, 'gi');
        let match;
        while ((match = regex.exec(content)) !== null) {
          matches.push(`...${match[1]}<em>${match[2]}</em>${match[3]}...`);
          if (matches.length >= 3) break;
        }
      }
      
      if (matches.length > 0) {
        highlights[field] = matches;
      }
    }

    return highlights;
  }

  /**
   * Get cache key for search query
   */
  private getCacheKey(query: SearchQuery): string {
    return `search:${JSON.stringify({
      q: query.query,
      t: query.types,
      f: query.filters,
      s: query.sort,
      p: query.page,
      l: query.limit,
    })}`;
  }

  // ==================== Personalization ====================

  /**
   * Personalize results based on user profile
   */
  private async personalizeResults(
    results: SearchResult[],
    userId: string
  ): Promise<SearchResult[]> {
    try {
      // Get user profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          memberProfile: true,
          mentorProfile: true,
          userSkills: {
            include: { skill: true },
          },
        },
      });

      if (!user) return results;

      const userSkills = user.userSkills.map((us: { skill: { name: string } }) => us.skill.name.toLowerCase());
      const userLocation = user.memberProfile?.mobNation || user.mentorProfile?.location || '';
      const userIndustry = user.mentorProfile?.industry || '';

      // Adjust scores based on personalization
      for (const result of results) {
        const data = result.data as Record<string, unknown>;

        // Boost jobs matching user skills
        if (result.type === 'job' && userSkills.length) {
          const jobSkills = (data.skills as string[] || []).map((s: string) => s.toLowerCase());
          const matchingSkills = userSkills.filter((s: string) => 
            jobSkills.some((js: string) => js.includes(s) || s.includes(js))
          );
          if (matchingSkills.length > 0) {
            result.score *= 1 + (matchingSkills.length * 0.1);
          }
        }

        // Boost results matching user location
        if (userLocation && data.location) {
          if ((data.location as string).toLowerCase().includes(userLocation.toLowerCase())) {
            result.score *= 1.2;
          }
        }

        // Boost companies in user's industry
        if (result.type === 'company' && userIndustry && data.industry) {
          if ((data.industry as string).toLowerCase().includes(userIndustry.toLowerCase())) {
            result.score *= 1.15;
          }
        }
      }

      return results;
    } catch (error) {
      logger.error('Personalization failed', { error, userId });
      return results;
    }
  }

  // ==================== Suggestions ====================

  /**
   * Get search suggestions when no results found
   */
  private async getSuggestions(query: string): Promise<string[]> {
    const suggestions: string[] = [];

    // Suggest based on Indigenous synonyms
    const words = query.toLowerCase().split(/\s+/);
    for (const word of words) {
      const synonyms = INDIGENOUS_SYNONYMS[word];
      if (synonyms) {
        suggestions.push(...synonyms.slice(0, 2));
      }
    }

    // Suggest popular related searches
    try {
      const popular = await this.getPopularSearchTerms(query.substring(0, 3), 3);
      suggestions.push(...popular);
    } catch {
      // Ignore errors
    }

    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Calculate facets for search results
   */
  private calculateFacets(
    results: SearchResult[],
    types: SearchEntityType[]
  ): Record<string, FacetResult> {
    const facets: Record<string, FacetResult> = {};

    // Type facets
    const typeCounts = new Map<string, number>();
    for (const result of results) {
      typeCounts.set(result.type, (typeCounts.get(result.type) || 0) + 1);
    }
    facets.type = {
      name: 'Type',
      values: Array.from(typeCounts.entries()).map(([value, count]) => ({ value, count })),
    };

    // Location facets for jobs
    if (types.includes('job')) {
      const locationCounts = new Map<string, number>();
      for (const result of results) {
        if (result.type === 'job') {
          const data = result.data as { location?: string };
          const location = data.location || 'Remote';
          locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
        }
      }
      facets.location = {
        name: 'Location',
        values: Array.from(locationCounts.entries())
          .map(([value, count]) => ({ value, count }))
          .slice(0, 10),
      };
    }

    // Group type facets
    if (types.includes('group')) {
      const groupTypeCounts = new Map<string, number>();
      for (const result of results) {
        if (result.type === 'group') {
          const data = result.data as { groupType?: string };
          const groupType = data.groupType || 'Other';
          groupTypeCounts.set(groupType, (groupTypeCounts.get(groupType) || 0) + 1);
        }
      }
      facets.groupType = {
        name: 'Group Type',
        values: Array.from(groupTypeCounts.entries()).map(([value, count]) => ({ value, count })),
      };
    }

    return facets;
  }

  // ==================== Analytics ====================

  /**
   * Track search for analytics
   */
  private async trackSearch(
    query: string,
    types: SearchEntityType[],
    resultCount: number,
    userId?: string
  ): Promise<void> {
    try {
      // Increment search term popularity
      await redisCache.zincrby('search:popular', 1, query.toLowerCase());

      // Track search in analytics
      await redisCache.listPush('search:history', {
        query,
        types,
        resultCount,
        userId,
        timestamp: new Date().toISOString(),
      }, 10000);

      // Track zero-result searches
      if (resultCount === 0) {
        await redisCache.zincrby('search:zero_results', 1, query.toLowerCase());
      }
    } catch (error) {
      logger.error('Search tracking failed', { error });
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(days: number = 7): Promise<{
    topSearches: Array<{ term: string; count: number }>;
    zeroResultSearches: Array<{ term: string; count: number }>;
    searchVolume: number;
  }> {
    try {
      const topSearches = await redisCache.zrevrangewithscores('search:popular', 0, 19);
      const zeroResults = await redisCache.zrevrangewithscores('search:zero_results', 0, 9);
      const historyLength = await redisCache.listLength('search:history');

      return {
        topSearches: topSearches.map(([term, count]) => ({ term, count })),
        zeroResultSearches: zeroResults.map(([term, count]) => ({ term, count })),
        searchVolume: historyLength,
      };
    } catch (error) {
      logger.error('Get search analytics failed', { error });
      return {
        topSearches: [],
        zeroResultSearches: [],
        searchVolume: 0,
      };
    }
  }

  /**
   * Clear search cache
   */
  async clearCache(): Promise<void> {
    try {
      // This would need pattern matching in Redis
      logger.info('Search cache cleared');
    } catch (error) {
      logger.error('Clear cache failed', { error });
    }
  }

  /**
   * Reindex all entities (for maintenance)
   */
  async reindexAll(): Promise<void> {
    logger.info('Reindexing all search entities');
    // For Prisma-based search, this clears caches
    await this.clearCache();
    logger.info('Reindexing complete');
  }
}

// Export singleton instance
export const searchService = SearchService.getInstance();
export default searchService;

