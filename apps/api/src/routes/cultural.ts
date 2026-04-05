/**
 * Cultural Safety Routes
 * 
 * API endpoints for cultural safety features:
 * - Indigenous language support
 * - Cultural preferences
 * - Sorry Business awareness
 * - Cultural events
 * - Acknowledgement of Country
 */

import express from 'express';
import authenticateJWT from '../middleware/auth';
import {
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
} from '../lib/cultural-safety';

const router = express.Router();

/**
 * GET /cultural/languages - Get supported indigenous languages
 */
router.get('/languages', (req, res) => {
    try {
        const languages = getSupportedIndigenousLanguages();
        
        res.json({
            ok: true,
            languages,
            note: 'Language support is developed in consultation with community language keepers.'
        });
    } catch (error) {
        console.error('Error getting languages:', error);
        res.status(500).json({ error: 'Failed to get languages' });
    }
});

/**
 * POST /cultural/languages/request - Request support for a new language
 */
router.post('/languages/request', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { languageCode, languageName, region } = req.body;
        
        if (!languageCode || !languageName) {
            return void res.status(400).json({ error: 'languageCode and languageName are required' });
        }
        
        const result = await requestLanguageSupport(userId, languageCode, languageName, region || 'Unknown');
        
        res.json({
            ok: result.success,
            message: result.message
        });
    } catch (error) {
        console.error('Error requesting language:', error);
        res.status(500).json({ error: 'Failed to submit language request' });
    }
});

/**
 * GET /cultural/profile - Get user's cultural profile
 */
router.get('/profile', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getCulturalProfile(userId);
        
        if (!profile) {
            return void res.status(404).json({ error: 'Cultural profile not found' });
        }
        
        res.json({
            ok: true,
            profile
        });
    } catch (error) {
        console.error('Error getting cultural profile:', error);
        res.status(500).json({ error: 'Failed to get cultural profile' });
    }
});

/**
 * PUT /cultural/preferences - Update cultural preferences
 */
router.put('/preferences', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const preferences = req.body;
        
        const success = await updateCulturalPreferences(userId, preferences);
        
        if (success) {
            res.json({ ok: true, message: 'Preferences updated' });
        } else {
            res.status(500).json({ error: 'Failed to update preferences' });
        }
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

/**
 * POST /cultural/check-sensitivity - Check content for cultural sensitivity
 */
router.post('/check-sensitivity', (req, res) => {
    try {
        const { content } = req.body;
        
        if (!content) {
            return void res.status(400).json({ error: 'content is required' });
        }
        
        const sorryCheck = checkSorryBusinessSensitivity(content);
        const validationResult = validateCulturalSafety(content);
        
        res.json({
            ok: true,
            sorryBusiness: sorryCheck,
            culturalSafety: validationResult
        });
    } catch (error) {
        console.error('Error checking sensitivity:', error);
        res.status(500).json({ error: 'Failed to check sensitivity' });
    }
});

/**
 * POST /cultural/add-warning - Add deceased person warning to content
 */
router.post('/add-warning', (req, res) => {
    try {
        const { content, personName } = req.body;
        
        if (!content) {
            return void res.status(400).json({ error: 'content is required' });
        }
        
        const warningContent = addDeceasedWarning(content, personName);
        
        res.json({
            ok: true,
            content: warningContent
        });
    } catch (error) {
        console.error('Error adding warning:', error);
        res.status(500).json({ error: 'Failed to add warning' });
    }
});

/**
 * GET /cultural/events - Get upcoming cultural events
 */
router.get('/events', (req, res) => {
    try {
        const daysAhead = parseInt(req.query.days as string) || 30;
        const events = getUpcomingCulturalEvents(daysAhead);
        
        res.json({
            ok: true,
            events,
            daysAhead
        });
    } catch (error) {
        console.error('Error getting events:', error);
        res.status(500).json({ error: 'Failed to get events' });
    }
});

/**
 * GET /cultural/acknowledgement - Get Acknowledgement of Country
 */
router.get('/acknowledgement', (req, res) => {
    try {
        const { region } = req.query;
        const acknowledgement = generateAcknowledgementOfCountry(region as string);
        
        res.json({
            ok: true,
            acknowledgement,
            region: region || 'general'
        });
    } catch (error) {
        console.error('Error getting acknowledgement:', error);
        res.status(500).json({ error: 'Failed to get acknowledgement' });
    }
});

/**
 * POST /cultural/translate - Translate text (stub for future implementation)
 */
router.post('/translate', (req, res) => {
    try {
        const { text, targetLanguage } = req.body;
        
        if (!text || !targetLanguage) {
            return void res.status(400).json({ error: 'text and targetLanguage are required' });
        }
        
        const result = translateToIndigenousLanguage(text, targetLanguage);
        
        res.json({
            ok: true,
            result,
            note: result.isPlaceholder 
                ? 'Full translation support is being developed with community language keepers.' 
                : undefined
        });
    } catch (error) {
        console.error('Error translating:', error);
        res.status(500).json({ error: 'Failed to translate' });
    }
});

/**
 * GET /cultural/phrases/:languageCode - Get common phrases in a language
 */
router.get('/phrases/:languageCode', (req, res) => {
    try {
        const { languageCode } = req.params;
        
        if (!isLanguageSupported(languageCode)) {
            // Still return phrases even if not "officially" supported
        }
        
        const phrases = getCommonPhrases(languageCode);
        
        res.json({
            ok: true,
            languageCode,
            phrases,
            note: Object.keys(phrases).length === 0 
                ? 'Phrases for this language are being developed with community consultation.'
                : undefined
        });
    } catch (error) {
        console.error('Error getting phrases:', error);
        res.status(500).json({ error: 'Failed to get phrases' });
    }
});

/**
 * POST /cultural/validate - Validate content for cultural safety
 */
router.post('/validate', (req, res) => {
    try {
        const { content } = req.body;
        
        if (!content) {
            return void res.status(400).json({ error: 'content is required' });
        }
        
        const result = validateCulturalSafety(content);
        
        res.json({
            ok: true,
            result
        });
    } catch (error) {
        console.error('Error validating content:', error);
        res.status(500).json({ error: 'Failed to validate content' });
    }
});

export default router;

