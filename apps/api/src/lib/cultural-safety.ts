// @ts-nocheck
/**
 * Cultural Safety Module
 * 
 * Provides cultural safety features for Aboriginal and Torres Strait Islander users:
 * - Indigenous language support stubs (for future on-device translation)
 * - Cultural context preservation
 * - Sorry Business detection and sensitivity
 * - Cultural event awareness
 * - Community-specific customization
 */

import { prisma } from '../db';

// Types
interface CulturalProfile {
    userId: string;
    primaryLanguage: string;
    secondaryLanguages: string[];
    communityAffiliation?: string;
    region?: string;
    culturalPreferences: CulturalPreferences;
}

interface CulturalPreferences {
    respectSorryBusiness: boolean;
    showCulturalEvents: boolean;
    preferIndigenousContent: boolean;
    enableCulturalSafetyAlerts: boolean;
    acknowledgeCountry: boolean;
    hideDeceasedProfiles: boolean;
}

interface LanguageSupportInfo {
    code: string;
    name: string;
    region: string;
    status: 'available' | 'coming_soon' | 'requested';
    speakerCount?: number;
}

// Indigenous Australian Languages
const INDIGENOUS_LANGUAGES: LanguageSupportInfo[] = [
    { code: 'wbp', name: 'Warlpiri', region: 'Northern Territory', status: 'coming_soon', speakerCount: 3000 },
    { code: 'pjt', name: 'Pitjantjatjara', region: 'SA/NT/WA tri-state', status: 'coming_soon', speakerCount: 3500 },
    { code: 'aer', name: 'Eastern Arrernte', region: 'Central Australia', status: 'coming_soon', speakerCount: 2000 },
    { code: 'kld', name: 'Gamilaraay', region: 'NSW', status: 'coming_soon', speakerCount: 100 },
    { code: 'wrh', name: 'Wiradjuri', region: 'NSW', status: 'coming_soon', speakerCount: 500 },
    { code: 'rop', name: 'Kriol', region: 'Northern Australia', status: 'coming_soon', speakerCount: 20000 },
    { code: 'tiw', name: 'Tiwi', region: 'Tiwi Islands, NT', status: 'coming_soon', speakerCount: 2000 },
    { code: 'yii', name: 'Yidiny', region: 'Far North QLD', status: 'requested', speakerCount: 150 },
    { code: 'aus-tsi', name: 'Torres Strait Creole', region: 'Torres Strait', status: 'coming_soon', speakerCount: 4000 },
    { code: 'mwp', name: 'Kala Lagaw Ya', region: 'Torres Strait', status: 'requested', speakerCount: 3000 },
    { code: 'dax', name: 'Dhurga', region: 'South Coast NSW', status: 'requested', speakerCount: 50 },
    { code: 'nia', name: 'Noongar', region: 'South-West WA', status: 'coming_soon', speakerCount: 400 }
];

// Cultural events and dates to be aware of
const CULTURAL_DATES = [
    { name: 'National Sorry Day', date: '05-26', description: 'Remembering the Stolen Generations' },
    { name: 'National Reconciliation Week Start', date: '05-27', description: 'Week of reflection and reconciliation' },
    { name: 'Mabo Day', date: '06-03', description: 'Commemoration of the Mabo Decision' },
    { name: 'NAIDOC Week', date: '07-first-week', description: 'Celebration of Aboriginal and Torres Strait Islander cultures' },
    { name: 'International Day of the World\'s Indigenous Peoples', date: '08-09', description: 'UN observance day' },
    { name: 'National Aboriginal and Torres Strait Islander Children\'s Day', date: '08-04', description: 'Celebrating children and youth' },
    { name: 'Anniversary of the Apology', date: '02-13', description: 'Anniversary of the National Apology' },
    { name: 'National Close the Gap Day', date: '03-third-thursday', description: 'Health equity awareness' }
];

/**
 * Get available indigenous languages for translation support
 */
export function getSupportedIndigenousLanguages(): LanguageSupportInfo[] {
    return INDIGENOUS_LANGUAGES;
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(languageCode: string): boolean {
    const lang = INDIGENOUS_LANGUAGES.find(l => l.code === languageCode);
    return lang?.status === 'available';
}

/**
 * Request support for a new language
 */
export async function requestLanguageSupport(
    userId: string,
    languageCode: string,
    languageName: string,
    region: string
): Promise<{ success: boolean; message: string }> {
    try {
        // Log the request for tracking
        console.log(`Language support requested: ${languageName} (${languageCode}) by user ${userId}`);
        
        // In production, store in database for review
        // Could also notify community language workers
        
        return {
            success: true,
            message: `Thank you for requesting ${languageName} support. We'll work with language keepers to add this.`
        };
    } catch (error) {
        console.error('Error requesting language support:', error);
        return {
            success: false,
            message: 'Failed to submit language request'
        };
    }
}

/**
 * Get user's cultural profile
 */
export async function getCulturalProfile(userId: string): Promise<CulturalProfile | null> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
            }
        });
        
        if (!user) return null;
        
        // Parse preferences if stored as JSON
        const prefs = typeof (user as any).preferences === 'object' ? (user as any).preferences : {};
        
        return {
            userId: user.id,
            primaryLanguage: (user as any).language || 'en',
            secondaryLanguages: (prefs as any).secondaryLanguages || [],
            region: (user as any).region,
            communityAffiliation: (prefs as any).communityAffiliation,
            culturalPreferences: {
                respectSorryBusiness: (prefs as any).respectSorryBusiness ?? true,
                showCulturalEvents: (prefs as any).showCulturalEvents ?? true,
                preferIndigenousContent: (prefs as any).preferIndigenousContent ?? false,
                enableCulturalSafetyAlerts: (prefs as any).enableCulturalSafetyAlerts ?? true,
                acknowledgeCountry: (prefs as any).acknowledgeCountry ?? true,
                hideDeceasedProfiles: (prefs as any).hideDeceasedProfiles ?? true
            }
        };
    } catch (error) {
        console.error('Error getting cultural profile:', error);
        return null;
    }
}

/**
 * Update cultural preferences
 */
export async function updateCulturalPreferences(
    userId: string,
    preferences: Partial<CulturalPreferences>
): Promise<boolean> {
    try {
        // Update user preferences in database
        await prisma.user.update({
            where: { id: userId },
            data: {
                preferences: preferences as any
            }
        });
        
        return true;
    } catch (error) {
        console.error('Error updating cultural preferences:', error);
        return false;
    }
}

/**
 * Check for Sorry Business - detection of potentially sensitive content
 * regarding recently deceased community members
 */
export function checkSorryBusinessSensitivity(content: string): {
    isSensitive: boolean;
    reason?: string;
    suggestion?: string;
} {
    const sorryBusinessIndicators = [
        'passed away',
        'passing of',
        'sorry business',
        'in memory of',
        'rest in peace',
        'rip',
        'vale',
        'funeral',
        'mourning',
        'deceased'
    ];
    
    const lowerContent = content.toLowerCase();
    
    for (const indicator of sorryBusinessIndicators) {
        if (lowerContent.includes(indicator)) {
            return {
                isSensitive: true,
                reason: 'Content may relate to Sorry Business',
                suggestion: 'Consider adding a cultural sensitivity warning for community members who may need to avoid images or names of deceased persons.'
            };
        }
    }
    
    return { isSensitive: false };
}

/**
 * Add deceased person warning to content
 */
export function addDeceasedWarning(content: string, personName?: string): string {
    const warning = personName
        ? `⚠️ Cultural Warning: This content contains images and/or names of ${personName}, who has passed away. Aboriginal and Torres Strait Islander viewers should exercise caution.`
        : '⚠️ Cultural Warning: This content may contain images and/or names of deceased persons. Aboriginal and Torres Strait Islander viewers should exercise caution.';
    
    return `${warning}\n\n${content}`;
}

/**
 * Get upcoming cultural events
 */
export function getUpcomingCulturalEvents(daysAhead: number = 30): Array<{
    name: string;
    date: Date;
    description: string;
    daysUntil: number;
}> {
    const today = new Date();
    const events: Array<{ name: string; date: Date; description: string; daysUntil: number }> = [];
    
    for (const event of CULTURAL_DATES) {
        // Parse date (handle special cases like "first-week" or "third-thursday")
        let eventDate: Date;
        
        if (event.date.includes('first-week')) {
            // First week of month
            const [month] = event.date.split('-');
            eventDate = new Date(today.getFullYear(), parseInt(month) - 1, 7);
        } else if (event.date.includes('third-thursday')) {
            // Third Thursday of month
            const [month] = event.date.split('-');
            const firstDay = new Date(today.getFullYear(), parseInt(month) - 1, 1);
            const firstThursday = (11 - firstDay.getDay()) % 7 + 1;
            eventDate = new Date(today.getFullYear(), parseInt(month) - 1, firstThursday + 14);
        } else {
            // Standard MM-DD format
            const [month, day] = event.date.split('-');
            eventDate = new Date(today.getFullYear(), parseInt(month) - 1, parseInt(day));
        }
        
        // If date has passed this year, use next year
        if (eventDate < today) {
            eventDate.setFullYear(eventDate.getFullYear() + 1);
        }
        
        const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= daysAhead) {
            events.push({
                name: event.name,
                date: eventDate,
                description: event.description,
                daysUntil
            });
        }
    }
    
    return events.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Generate Acknowledgement of Country
 */
export function generateAcknowledgementOfCountry(region?: string): string {
    if (region) {
        // Region-specific acknowledgements (would be expanded with proper consultation)
        const regionAcknowledgements: Record<string, string> = {
            'sydney': 'We acknowledge the Gadigal people of the Eora Nation as the Traditional Custodians of this land and pay our respects to Elders past and present.',
            'melbourne': 'We acknowledge the Wurundjeri Woi-wurrung people of the Kulin Nation as the Traditional Custodians of this land and pay our respects to Elders past and present.',
            'brisbane': 'We acknowledge the Turrbal and Jagera peoples as the Traditional Custodians of this land and pay our respects to Elders past and present.',
            'perth': 'We acknowledge the Whadjuk people of the Noongar Nation as the Traditional Custodians of this land and pay our respects to Elders past and present.',
            'adelaide': 'We acknowledge the Kaurna people as the Traditional Custodians of this land and pay our respects to Elders past and present.',
            'darwin': 'We acknowledge the Larrakia people as the Traditional Custodians of this land and pay our respects to Elders past and present.',
            'hobart': 'We acknowledge the Muwinina people as the Traditional Custodians of this land and pay our respects to Elders past and present.',
            'canberra': 'We acknowledge the Ngunnawal people as the Traditional Custodians of this land and pay our respects to Elders past and present.'
        };
        
        const lowerRegion = region.toLowerCase();
        if (regionAcknowledgements[lowerRegion]) {
            return regionAcknowledgements[lowerRegion];
        }
    }
    
    // Default acknowledgement
    return 'We acknowledge the Traditional Custodians of the lands on which we work, live and gather. We pay our respects to Elders past and present, and recognise the continuing connection to lands, waters and communities.';
}

/**
 * Translation stub - placeholder for future on-device translation
 * This would be replaced with actual translation logic when available
 */
export function translateToIndigenousLanguage(
    text: string,
    targetLanguageCode: string
): {
    translated: string;
    isPlaceholder: boolean;
    languageName: string;
} {
    const language = INDIGENOUS_LANGUAGES.find(l => l.code === targetLanguageCode);
    
    if (!language) {
        return {
            translated: text,
            isPlaceholder: true,
            languageName: 'Unknown'
        };
    }
    
    // This is a stub - real translation would require:
    // 1. Community-approved dictionaries
    // 2. Language worker review
    // 3. On-device processing for privacy
    // 4. Context-aware translation
    
    return {
        translated: text, // Return original text for now
        isPlaceholder: true,
        languageName: language.name
    };
}

/**
 * Get common phrases in indigenous languages (for UI localization)
 * These would be community-approved translations
 */
export function getCommonPhrases(languageCode: string): Record<string, string> {
    // Stub - these would be filled in with community consultation
    const phrases: Record<string, Record<string, string>> = {
        'wbp': {
            'hello': 'Ngurrju',
            'goodbye': 'Ngurrju-manyu',
            'thank_you': 'Yungulu',
            'yes': 'Yuwayi',
            'no': 'Lawa'
        },
        'pjt': {
            'hello': 'Palya',
            'goodbye': 'Palya',
            'thank_you': 'Palya',
            'yes': 'Uwa',
            'no': 'Wiya'
        },
        'rop': {
            'hello': 'Gudei',
            'goodbye': 'Seeyou',
            'thank_you': 'Thenks',
            'yes': 'Yuwai',
            'no': 'No'
        }
    };
    
    return phrases[languageCode] || {};
}

/**
 * Validate content for cultural safety
 */
export function validateCulturalSafety(content: string): {
    isApproved: boolean;
    warnings: string[];
    suggestions: string[];
} {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Check for Sorry Business sensitivity
    const sorryCheck = checkSorryBusinessSensitivity(content);
    if (sorryCheck.isSensitive) {
        warnings.push(sorryCheck.reason!);
        suggestions.push(sorryCheck.suggestion!);
    }
    
    // Check for potentially inappropriate cultural references
    const sensitiveTerms = [
        { term: 'dreamtime', suggestion: 'Consider using "Dreaming" or specific traditional name' },
        { term: 'tribal', suggestion: 'Consider using "First Nations", "community" or specific nation name' },
        { term: 'full-blood', suggestion: 'This term is considered offensive. Avoid blood-quantum language.' },
        { term: 'half-caste', suggestion: 'This term is offensive and should not be used.' },
        { term: 'primitive', suggestion: 'This term is offensive when describing Indigenous cultures.' }
    ];
    
    const lowerContent = content.toLowerCase();
    for (const { term, suggestion } of sensitiveTerms) {
        if (lowerContent.includes(term)) {
            suggestions.push(`"${term}": ${suggestion}`);
        }
    }
    
    return {
        isApproved: warnings.length === 0,
        warnings,
        suggestions
    };
}

export default {
    getSupportedIndigenousLanguages,
    isLanguageSupported,
    requestLanguageSupport,
    getCulturalProfile,
    updateCulturalPreferences,
    checkSorryBusinessSensitivity,
    addDeceasedWarning,
    getUpcomingCulturalEvents,
    generateAcknowledgementOfCountry,
    translateToIndigenousLanguage,
    getCommonPhrases,
    validateCulturalSafety
};

