/**
 * Indigenous Language Service
 * 
 * Supports Aboriginal and Torres Strait Islander language preservation and learning.
 * This service provides:
 * - Language resources and learning materials
 * - Phrase translations for common platform interactions
 * - Language teacher/mentor matching
 * - Community language programs
 * - Language revitalization initiatives tracking
 * 
 * Note: All language content should be developed in consultation with
 * Traditional Custodians and language authorities of each nation.
 */

import { prisma as prismaClient } from '../lib/database';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';

const prisma = prismaClient as any;

// Types
export interface IndigenousLanguage {
  id: string;
  name: string;
  alternateNames?: string[];
  nation?: string;
  region: string;
  state?: string;
  status: LanguageStatus;
  speakersEstimate?: number;
  dialectOf?: string;
  languageFamily?: string;
  iso639?: string; // ISO 639-3 code if available
  aiatsis?: string; // AIATSIS code
  resources?: LanguageResource[];
}

export type LanguageStatus = 
  | 'STRONG' // Many fluent speakers, active transmission
  | 'HEALTHY' // Good number of speakers, some youth speakers
  | 'VULNERABLE' // Declining speakers, limited transmission
  | 'ENDANGERED' // Few speakers, mostly elderly
  | 'CRITICALLY_ENDANGERED' // Very few speakers
  | 'SLEEPING' // No fluent speakers, revitalization efforts
  | 'AWAKENING'; // Being revitalized from historical records

export interface LanguageResource {
  id: string;
  languageId: string;
  type: ResourceType;
  title: string;
  description?: string;
  url?: string;
  author?: string;
  createdBy?: string;
  approvedBy?: string; // Community authority approval
  isVerified: boolean;
  accessLevel: 'PUBLIC' | 'COMMUNITY' | 'RESTRICTED';
  createdAt: Date;
}

export type ResourceType = 
  | 'DICTIONARY'
  | 'PHRASE_BOOK'
  | 'AUDIO_RECORDING'
  | 'VIDEO'
  | 'LESSON'
  | 'SONG'
  | 'STORY'
  | 'GRAMMAR_GUIDE'
  | 'APP'
  | 'BOOK';

export interface PlatformPhrase {
  key: string;
  english: string;
  translations: LanguageTranslation[];
}

export interface LanguageTranslation {
  languageId: string;
  languageName: string;
  text: string;
  pronunciation?: string;
  audioUrl?: string;
  notes?: string;
  verifiedBy?: string;
}

export interface LanguageMentor {
  id: string;
  userId: string;
  name: string;
  languages: string[];
  proficiencyLevel: 'LEARNER' | 'SPEAKER' | 'FLUENT' | 'ELDER';
  teachingAvailable: boolean;
  region: string;
  specializations: string[];
  hourlyRate?: number;
  isVerified: boolean;
}

export interface LanguageLearner {
  userId: string;
  targetLanguages: string[];
  currentLevel: Record<string, 'BEGINNER' | 'ELEMENTARY' | 'INTERMEDIATE' | 'ADVANCED'>;
  learningGoals: string[];
  preferredLearningStyle: 'VISUAL' | 'AUDIO' | 'CONVERSATION' | 'IMMERSION';
  weeklyHoursAvailable: number;
}

// Major Aboriginal and Torres Strait Islander languages
// Note: This is a representative sample - there are over 250 distinct language groups
const INDIGENOUS_LANGUAGES: IndigenousLanguage[] = [
  // Strong/Healthy Languages
  {
    id: 'yolngu-matha',
    name: 'Yolŋu Matha',
    alternateNames: ['Yolngu', 'Yolngu Sign Language'],
    nation: 'Yolngu',
    region: 'Northeast Arnhem Land',
    state: 'NT',
    status: 'STRONG',
    speakersEstimate: 4000,
    languageFamily: 'Pama-Nyungan',
  },
  {
    id: 'pitjantjatjara',
    name: 'Pitjantjatjara',
    alternateNames: ['Pitjantjatjara-Yankunytjatjara', 'APY Languages'],
    nation: 'Pitjantjatjara',
    region: 'Central Australia',
    state: 'SA/NT/WA',
    status: 'STRONG',
    speakersEstimate: 3500,
    languageFamily: 'Pama-Nyungan, Western Desert',
  },
  {
    id: 'warlpiri',
    name: 'Warlpiri',
    nation: 'Warlpiri',
    region: 'Tanami Desert',
    state: 'NT',
    status: 'STRONG',
    speakersEstimate: 3000,
    languageFamily: 'Pama-Nyungan',
  },
  {
    id: 'arrernte',
    name: 'Arrernte',
    alternateNames: ['Aranda', 'Eastern Arrernte', 'Western Arrernte'],
    nation: 'Arrernte',
    region: 'Alice Springs region',
    state: 'NT',
    status: 'HEALTHY',
    speakersEstimate: 2000,
    languageFamily: 'Pama-Nyungan, Arandic',
  },
  {
    id: 'tiwi',
    name: 'Tiwi',
    nation: 'Tiwi',
    region: 'Tiwi Islands',
    state: 'NT',
    status: 'HEALTHY',
    speakersEstimate: 2000,
    languageFamily: 'Language Isolate',
  },
  {
    id: 'kriol',
    name: 'Kriol',
    alternateNames: ['Roper River Kriol', 'Australian Kriol'],
    region: 'Northern Australia',
    state: 'NT/WA/QLD',
    status: 'STRONG',
    speakersEstimate: 20000,
    languageFamily: 'English-based Creole',
  },
  {
    id: 'torres-strait-creole',
    name: 'Torres Strait Creole',
    alternateNames: ['Yumplatok', 'Broken'],
    region: 'Torres Strait Islands',
    state: 'QLD',
    status: 'STRONG',
    speakersEstimate: 6000,
    languageFamily: 'English-based Creole',
  },
  // Endangered Languages
  {
    id: 'kaurna',
    name: 'Kaurna',
    nation: 'Kaurna',
    region: 'Adelaide Plains',
    state: 'SA',
    status: 'AWAKENING',
    speakersEstimate: 100,
    languageFamily: 'Pama-Nyungan, Thura-Yura',
  },
  {
    id: 'noongar',
    name: 'Noongar',
    alternateNames: ['Nyungar', 'Bibbulmun'],
    nation: 'Noongar',
    region: 'Southwest Western Australia',
    state: 'WA',
    status: 'VULNERABLE',
    speakersEstimate: 500,
    languageFamily: 'Pama-Nyungan',
  },
  {
    id: 'gamilaraay',
    name: 'Gamilaraay',
    alternateNames: ['Kamilaroi'],
    nation: 'Gamilaraay',
    region: 'Northwest NSW',
    state: 'NSW',
    status: 'ENDANGERED',
    speakersEstimate: 100,
    languageFamily: 'Pama-Nyungan',
  },
  {
    id: 'wiradjuri',
    name: 'Wiradjuri',
    nation: 'Wiradjuri',
    region: 'Central NSW',
    state: 'NSW',
    status: 'ENDANGERED',
    speakersEstimate: 500,
    languageFamily: 'Pama-Nyungan',
  },
  {
    id: 'dharug',
    name: 'Dharug',
    alternateNames: ['Darug', 'Dharuk', 'Sydney Language'],
    nation: 'Dharug',
    region: 'Sydney Basin',
    state: 'NSW',
    status: 'AWAKENING',
    speakersEstimate: 50,
    languageFamily: 'Pama-Nyungan',
  },
  {
    id: 'palawa-kani',
    name: 'Palawa Kani',
    nation: 'Tasmanian Aboriginal',
    region: 'Tasmania',
    state: 'TAS',
    status: 'AWAKENING',
    languageFamily: 'Tasmanian (reconstructed)',
  },
  {
    id: 'bundjalung',
    name: 'Bundjalung',
    nation: 'Bundjalung',
    region: 'Northern Rivers NSW',
    state: 'NSW/QLD',
    status: 'ENDANGERED',
    speakersEstimate: 50,
    languageFamily: 'Pama-Nyungan',
  },
  {
    id: 'meriam-mir',
    name: 'Meriam Mir',
    nation: 'Meriam',
    region: 'Eastern Torres Strait Islands',
    state: 'QLD',
    status: 'ENDANGERED',
    speakersEstimate: 300,
    languageFamily: 'Eastern Trans-Fly',
  },
  {
    id: 'kala-lagaw-ya',
    name: 'Kala Lagaw Ya',
    alternateNames: ['Kalaw Lagaw Ya'],
    nation: 'Torres Strait Islander',
    region: 'Western Torres Strait Islands',
    state: 'QLD',
    status: 'VULNERABLE',
    speakersEstimate: 3000,
    languageFamily: 'Pama-Nyungan',
  },
];

// Common platform phrases with translations
// Note: These are placeholder translations and should be verified by language authorities
const PLATFORM_PHRASES: PlatformPhrase[] = [
  {
    key: 'welcome',
    english: 'Welcome',
    translations: [
      { languageId: 'kaurna', languageName: 'Kaurna', text: 'Niina marni', pronunciation: 'nee-nah mar-nee' },
      { languageId: 'noongar', languageName: 'Noongar', text: 'Kaya', pronunciation: 'ky-ah' },
      { languageId: 'dharug', languageName: 'Dharug', text: 'Yaama', pronunciation: 'yah-mah' },
      { languageId: 'wiradjuri', languageName: 'Wiradjuri', text: 'Yaama', pronunciation: 'yah-mah' },
      { languageId: 'gamilaraay', languageName: 'Gamilaraay', text: 'Yaama', pronunciation: 'yah-mah' },
    ],
  },
  {
    key: 'hello',
    english: 'Hello / Greetings',
    translations: [
      { languageId: 'kaurna', languageName: 'Kaurna', text: 'Niina marni', pronunciation: 'nee-nah mar-nee' },
      { languageId: 'noongar', languageName: 'Noongar', text: 'Kaya', pronunciation: 'ky-ah' },
      { languageId: 'pitjantjatjara', languageName: 'Pitjantjatjara', text: 'Palya', pronunciation: 'pal-ya' },
      { languageId: 'arrernte', languageName: 'Arrernte', text: 'Werte', pronunciation: 'wer-teh' },
    ],
  },
  {
    key: 'thank_you',
    english: 'Thank you',
    translations: [
      { languageId: 'kaurna', languageName: 'Kaurna', text: 'Ngai-tya mari', pronunciation: 'ny-tya ma-ree' },
      { languageId: 'noongar', languageName: 'Noongar', text: 'Boorda', pronunciation: 'boor-da' },
      { languageId: 'pitjantjatjara', languageName: 'Pitjantjatjara', text: 'Palya', pronunciation: 'pal-ya' },
      { languageId: 'wiradjuri', languageName: 'Wiradjuri', text: 'Mandaang guwu', pronunciation: 'man-daang goo-woo' },
    ],
  },
  {
    key: 'goodbye',
    english: 'Goodbye / See you later',
    translations: [
      { languageId: 'kaurna', languageName: 'Kaurna', text: 'Nakutha', pronunciation: 'na-koo-tha' },
      { languageId: 'noongar', languageName: 'Noongar', text: 'Boodja-ri', pronunciation: 'bood-ja-ree' },
      { languageId: 'dharug', languageName: 'Dharug', text: 'Waranara', pronunciation: 'wa-ra-na-ra' },
    ],
  },
  {
    key: 'country',
    english: 'Country / Land',
    translations: [
      { languageId: 'noongar', languageName: 'Noongar', text: 'Boodja', pronunciation: 'bood-ja' },
      { languageId: 'dharug', languageName: 'Dharug', text: 'Ngurra', pronunciation: 'n-goo-rra' },
      { languageId: 'wiradjuri', languageName: 'Wiradjuri', text: 'Ngurambang', pronunciation: 'n-goo-ram-bang' },
      { languageId: 'gamilaraay', languageName: 'Gamilaraay', text: 'Ngurrambaa', pronunciation: 'n-goo-ram-bah' },
    ],
  },
  {
    key: 'family',
    english: 'Family / Kin',
    translations: [
      { languageId: 'noongar', languageName: 'Noongar', text: 'Moort', pronunciation: 'moort' },
      { languageId: 'wiradjuri', languageName: 'Wiradjuri', text: 'Miyagan', pronunciation: 'mee-ya-gan' },
    ],
  },
  {
    key: 'work',
    english: 'Work / Job',
    translations: [
      { languageId: 'noongar', languageName: 'Noongar', text: 'Djinda', pronunciation: 'jin-da' },
    ],
  },
  {
    key: 'learn',
    english: 'Learn / Study',
    translations: [
      { languageId: 'kaurna', languageName: 'Kaurna', text: 'Ngadlu', pronunciation: 'n-gad-loo' },
      { languageId: 'noongar', languageName: 'Noongar', text: 'Dandjoo', pronunciation: 'dan-joo' },
    ],
  },
  {
    key: 'together',
    english: 'Together / Unity',
    translations: [
      { languageId: 'noongar', languageName: 'Noongar', text: 'Wadiny', pronunciation: 'wad-in-ee' },
    ],
  },
];

class IndigenousLanguageService {
  private static instance: IndigenousLanguageService;
  private cachePrefix = 'indigenous_lang:';
  private cacheTTL = 86400; // 24 hours

  static getInstance(): IndigenousLanguageService {
    if (!IndigenousLanguageService.instance) {
      IndigenousLanguageService.instance = new IndigenousLanguageService();
    }
    return IndigenousLanguageService.instance;
  }

  /**
   * Get all available Indigenous languages
   */
  async getAllLanguages(): Promise<IndigenousLanguage[]> {
    try {
      const cacheKey = `${this.cachePrefix}all`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached as string);
      }

      // In production, this would come from the database
      const languages = INDIGENOUS_LANGUAGES.sort((a, b) => a.name.localeCompare(b.name));
      
      await redisCache.set(cacheKey, JSON.stringify(languages), this.cacheTTL);
      return languages;
    } catch (error: any) {
      logger.error('Failed to get languages', { error: error.message });
      return INDIGENOUS_LANGUAGES;
    }
  }

  /**
   * Get language by ID
   */
  async getLanguageById(languageId: string): Promise<IndigenousLanguage | null> {
    const languages = await this.getAllLanguages();
    return languages.find(l => l.id === languageId) || null;
  }

  /**
   * Get languages by region/state
   */
  async getLanguagesByRegion(state: string): Promise<IndigenousLanguage[]> {
    const languages = await this.getAllLanguages();
    return languages.filter(l => 
      l.state?.includes(state) || l.region.toLowerCase().includes(state.toLowerCase())
    );
  }

  /**
   * Get languages by status
   */
  async getLanguagesByStatus(status: LanguageStatus): Promise<IndigenousLanguage[]> {
    const languages = await this.getAllLanguages();
    return languages.filter(l => l.status === status);
  }

  /**
   * Get endangered languages (for highlighting revitalization needs)
   */
  async getEndangeredLanguages(): Promise<IndigenousLanguage[]> {
    const languages = await this.getAllLanguages();
    return languages.filter(l => 
      ['ENDANGERED', 'CRITICALLY_ENDANGERED', 'SLEEPING'].includes(l.status)
    );
  }

  /**
   * Get platform phrase translations
   */
  async getPhraseTranslation(key: string, languageId?: string): Promise<PlatformPhrase | null> {
    const phrase = PLATFORM_PHRASES.find(p => p.key === key);
    if (!phrase) return null;

    if (languageId) {
      return {
        ...phrase,
        translations: phrase.translations.filter(t => t.languageId === languageId),
      };
    }

    return phrase;
  }

  /**
   * Get all platform phrases
   */
  async getAllPhrases(): Promise<PlatformPhrase[]> {
    return PLATFORM_PHRASES;
  }

  /**
   * Get phrases available in a specific language
   */
  async getPhrasesForLanguage(languageId: string): Promise<PlatformPhrase[]> {
    return PLATFORM_PHRASES.filter(p => 
      p.translations.some(t => t.languageId === languageId)
    ).map(p => ({
      ...p,
      translations: p.translations.filter(t => t.languageId === languageId),
    }));
  }

  /**
   * Get language resources
   */
  async getLanguageResources(
    languageId: string,
    options: { type?: ResourceType; accessLevel?: string } = {}
  ): Promise<LanguageResource[]> {
    try {
      const where: any = { languageId };
      if (options.type) where.type = options.type;
      if (options.accessLevel) where.accessLevel = options.accessLevel;

      const resources = await prisma.languageResource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return resources as LanguageResource[];
    } catch (error: any) {
      logger.error('Failed to get language resources', { error: error.message, languageId });
      return [];
    }
  }

  /**
   * Add a language resource (requires approval)
   */
  async addLanguageResource(
    languageId: string,
    resource: {
      type: ResourceType;
      title: string;
      description?: string;
      url?: string;
      author?: string;
      accessLevel?: 'PUBLIC' | 'COMMUNITY' | 'RESTRICTED';
    },
    createdBy: string
  ): Promise<LanguageResource> {
    try {
      const newResource = await prisma.languageResource.create({
        data: {
          languageId,
          ...resource,
          accessLevel: resource.accessLevel || 'PUBLIC',
          createdBy,
          isVerified: false, // Requires community approval
        },
      });

      logger.info('Language resource added (pending approval)', {
        languageId,
        resourceId: newResource.id,
        createdBy,
      });

      return newResource as LanguageResource;
    } catch (error: any) {
      logger.error('Failed to add language resource', { error: error.message, languageId });
      throw error;
    }
  }

  /**
   * Approve a language resource (by community authority)
   */
  async approveResource(resourceId: string, approvedBy: string): Promise<LanguageResource> {
    try {
      const resource = await prisma.languageResource.update({
        where: { id: resourceId },
        data: {
          isVerified: true,
          approvedBy,
        },
      });

      logger.info('Language resource approved', { resourceId, approvedBy });
      return resource as LanguageResource;
    } catch (error: any) {
      logger.error('Failed to approve resource', { error: error.message, resourceId });
      throw error;
    }
  }

  /**
   * Get language mentors/teachers
   */
  async getLanguageMentors(
    languageId?: string,
    options: { region?: string; onlyAvailable?: boolean } = {}
  ): Promise<LanguageMentor[]> {
    try {
      const where: any = {
        isLanguageMentor: true,
      };

      if (options.onlyAvailable) {
        where.teachingAvailable = true;
      }

      const mentors = await prisma.mentorProfile.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      });

      // Filter by language if specified
      let result = mentors.map(m => ({
        id: m.id,
        userId: m.userId,
        name: (m.user as any)?.name || 'Unknown',
        languages: (m as any).teachingLanguages || [],
        proficiencyLevel: (m as any).languageProficiency || 'SPEAKER',
        teachingAvailable: (m as any).teachingAvailable || false,
        region: (m as any).region || '',
        specializations: m.specializations || [],
        hourlyRate: m.hourlyRate,
        isVerified: m.isVerified,
      }));

      if (languageId) {
        result = result.filter(m => m.languages.includes(languageId));
      }

      if (options.region) {
        result = result.filter(m => 
          m.region.toLowerCase().includes(options.region!.toLowerCase())
        );
      }

      return result;
    } catch (error: any) {
      logger.error('Failed to get language mentors', { error: error.message, languageId });
      return [];
    }
  }

  /**
   * Register as a language learner
   */
  async registerLearner(
    userId: string,
    preferences: Omit<LanguageLearner, 'userId'>
  ): Promise<LanguageLearner> {
    try {
      await prisma.languageLearner.upsert({
        where: { userId },
        create: {
          userId,
          ...preferences,
          currentLevel: preferences.currentLevel || {},
        },
        update: preferences,
      });

      logger.info('Language learner registered', { userId, languages: preferences.targetLanguages });

      return { userId, ...preferences };
    } catch (error: any) {
      logger.error('Failed to register learner', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get language learning progress
   */
  async getLearnerProgress(userId: string): Promise<{
    learner: LanguageLearner | null;
    completedLessons: number;
    streakDays: number;
    badges: string[];
  }> {
    try {
      const learner = await prisma.languageLearner.findUnique({
        where: { userId },
      });

      if (!learner) {
        return {
          learner: null,
          completedLessons: 0,
          streakDays: 0,
          badges: [],
        };
      }

      // Get progress stats
      const stats = await prisma.learningProgress.aggregate({
        where: { userId },
        _count: { lessonId: true },
      });

      return {
        learner: learner as unknown as LanguageLearner,
        completedLessons: stats._count.lessonId || 0,
        streakDays: (learner as any).streakDays || 0,
        badges: (learner as any).badges || [],
      };
    } catch (error: any) {
      logger.error('Failed to get learner progress', { error: error.message, userId });
      return {
        learner: null,
        completedLessons: 0,
        streakDays: 0,
        badges: [],
      };
    }
  }

  /**
   * Get localized greeting based on user's location or preference
   */
  async getLocalizedGreeting(
    location?: { state?: string; city?: string },
    preferredLanguageId?: string
  ): Promise<{ english: string; indigenous: LanguageTranslation | null }> {
    const welcomePhrase = PLATFORM_PHRASES.find(p => p.key === 'welcome');
    if (!welcomePhrase) {
      return { english: 'Welcome', indigenous: null };
    }

    // If user has a preferred language
    if (preferredLanguageId) {
      const translation = welcomePhrase.translations.find(
        t => t.languageId === preferredLanguageId
      );
      if (translation) {
        return { english: welcomePhrase.english, indigenous: translation };
      }
    }

    // Try to match by location
    if (location?.state) {
      const stateMap: Record<string, string[]> = {
        'SA': ['kaurna'],
        'WA': ['noongar'],
        'NSW': ['dharug', 'wiradjuri', 'gamilaraay'],
        'VIC': ['wurundjeri'],
        'QLD': ['bundjalung', 'torres-strait-creole'],
        'NT': ['arrernte', 'pitjantjatjara'],
        'TAS': ['palawa-kani'],
      };

      const languageIds = stateMap[location.state] || [];
      for (const langId of languageIds) {
        const translation = welcomePhrase.translations.find(t => t.languageId === langId);
        if (translation) {
          return { english: welcomePhrase.english, indigenous: translation };
        }
      }
    }

    // Default: return first available translation
    return {
      english: welcomePhrase.english,
      indigenous: welcomePhrase.translations[0] || null,
    };
  }

  /**
   * Get language revitalization programs
   */
  async getRevitalizationPrograms(languageId?: string): Promise<any[]> {
    try {
      const where: any = { type: 'LANGUAGE_REVITALIZATION' };
      if (languageId) {
        where.languageId = languageId;
      }

      const programs = await prisma.communityProgram.findMany({
        where,
        include: {
          organizer: {
            select: { id: true, name: true },
          },
        },
        orderBy: { startDate: 'asc' },
      });

      return programs;
    } catch (error: any) {
      logger.error('Failed to get revitalization programs', { error: error.message });
      return [];
    }
  }

  /**
   * Search languages by name or nation
   */
  async searchLanguages(query: string): Promise<IndigenousLanguage[]> {
    const languages = await this.getAllLanguages();
    const lowerQuery = query.toLowerCase();

    return languages.filter(l =>
      l.name.toLowerCase().includes(lowerQuery) ||
      l.nation?.toLowerCase().includes(lowerQuery) ||
      l.alternateNames?.some(n => n.toLowerCase().includes(lowerQuery)) ||
      l.region.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get language statistics for the platform
   */
  async getLanguageStats(): Promise<{
    totalLanguages: number;
    languagesByStatus: Record<LanguageStatus, number>;
    totalLearners: number;
    totalMentors: number;
    topLanguages: { languageId: string; learnerCount: number }[];
  }> {
    try {
      const languages = await this.getAllLanguages();

      const statusCounts = languages.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {} as Record<LanguageStatus, number>);

      const [learnerCount, mentorCount] = await Promise.all([
        prisma.languageLearner.count(),
        prisma.mentorProfile.count({
          where: { isLanguageMentor: true },
        }),
      ]);

      return {
        totalLanguages: languages.length,
        languagesByStatus: statusCounts,
        totalLearners: learnerCount,
        totalMentors: mentorCount,
        topLanguages: [], // Would be computed from learner preferences
      };
    } catch (error: any) {
      logger.error('Failed to get language stats', { error: error.message });
      return {
        totalLanguages: INDIGENOUS_LANGUAGES.length,
        languagesByStatus: {} as Record<LanguageStatus, number>,
        totalLearners: 0,
        totalMentors: 0,
        topLanguages: [],
      };
    }
  }
}

// Export singleton instance
export const indigenousLanguageService = IndigenousLanguageService.getInstance();

// Export class for testing
export { IndigenousLanguageService };
