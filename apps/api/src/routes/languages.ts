/**
 * Indigenous Language API Routes
 * 
 * Endpoints for Aboriginal and Torres Strait Islander language resources
 */

import { Router, Request, Response } from 'express';
import { indigenousLanguageService } from '../services/indigenousLanguageService';
import { authenticate } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

/**
 * @route GET /api/languages
 * @desc Get all Indigenous languages
 * @access Public
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const languages = await indigenousLanguageService.getAllLanguages();
    
    res.json({
      success: true,
      data: languages,
      count: languages.length,
    });
  } catch (error: any) {
    logger.error('Failed to get languages', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get languages' });
  }
});

/**
 * @route GET /api/languages/search
 * @desc Search languages by name, nation, or region
 * @access Public
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return void res.status(400).json({ success: false, message: 'Search query required' });
    }
    
    const languages = await indigenousLanguageService.searchLanguages(q as string);
    
    res.json({
      success: true,
      data: languages,
      count: languages.length,
    });
  } catch (error: any) {
    logger.error('Failed to search languages', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to search languages' });
  }
});

/**
 * @route GET /api/languages/endangered
 * @desc Get endangered languages
 * @access Public
 */
router.get('/endangered', async (req: Request, res: Response) => {
  try {
    const languages = await indigenousLanguageService.getEndangeredLanguages();
    
    res.json({
      success: true,
      data: languages,
      count: languages.length,
      message: 'These languages need community support for revitalization',
    });
  } catch (error: any) {
    logger.error('Failed to get endangered languages', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get languages' });
  }
});

/**
 * @route GET /api/languages/region/:state
 * @desc Get languages by state/region
 * @access Public
 */
router.get('/region/:state', async (req: Request, res: Response) => {
  try {
    const { state } = req.params;
    const languages = await indigenousLanguageService.getLanguagesByRegion(state);
    
    res.json({
      success: true,
      data: languages,
      region: state,
      count: languages.length,
    });
  } catch (error: any) {
    logger.error('Failed to get languages by region', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get languages' });
  }
});

/**
 * @route GET /api/languages/stats
 * @desc Get language statistics
 * @access Public
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await indigenousLanguageService.getLanguageStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Failed to get language stats', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get statistics' });
  }
});

/**
 * @route GET /api/languages/:id
 * @desc Get language by ID
 * @access Public
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const language = await indigenousLanguageService.getLanguageById(id);
    
    if (!language) {
      return void res.status(404).json({ success: false, message: 'Language not found' });
    }
    
    res.json({
      success: true,
      data: language,
    });
  } catch (error: any) {
    logger.error('Failed to get language', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get language' });
  }
});

/**
 * @route GET /api/languages/:id/phrases
 * @desc Get platform phrases in a specific language
 * @access Public
 */
router.get('/:id/phrases', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const phrases = await indigenousLanguageService.getPhrasesForLanguage(id);
    
    res.json({
      success: true,
      data: phrases,
      languageId: id,
    });
  } catch (error: any) {
    logger.error('Failed to get phrases', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get phrases' });
  }
});

/**
 * @route GET /api/languages/:id/resources
 * @desc Get learning resources for a language
 * @access Public
 */
router.get('/:id/resources', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, accessLevel } = req.query;
    
    const resources = await indigenousLanguageService.getLanguageResources(id, {
      type: type as any,
      accessLevel: accessLevel as string,
    });
    
    res.json({
      success: true,
      data: resources,
      languageId: id,
    });
  } catch (error: any) {
    logger.error('Failed to get resources', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get resources' });
  }
});

/**
 * @route POST /api/languages/:id/resources
 * @desc Add a language resource (requires approval)
 * @access Private
 */
router.post('/:id/resources', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const resourceData = req.body;
    
    const resource = await indigenousLanguageService.addLanguageResource(
      id,
      resourceData,
      userId
    );
    
    res.status(201).json({
      success: true,
      data: resource,
      message: 'Resource submitted for community approval',
    });
  } catch (error: any) {
    logger.error('Failed to add resource', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to add resource' });
  }
});

/**
 * @route GET /api/languages/:id/mentors
 * @desc Get language teachers/mentors
 * @access Public
 */
router.get('/:id/mentors', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { region, available } = req.query;
    
    const mentors = await indigenousLanguageService.getLanguageMentors(id, {
      region: region as string,
      onlyAvailable: available === 'true',
    });
    
    res.json({
      success: true,
      data: mentors,
      languageId: id,
    });
  } catch (error: any) {
    logger.error('Failed to get mentors', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get mentors' });
  }
});

/**
 * @route GET /api/languages/:id/programs
 * @desc Get language revitalization programs
 * @access Public
 */
router.get('/:id/programs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const programs = await indigenousLanguageService.getRevitalizationPrograms(id);
    
    res.json({
      success: true,
      data: programs,
      languageId: id,
    });
  } catch (error: any) {
    logger.error('Failed to get programs', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get programs' });
  }
});

// === Phrase Routes ===

/**
 * @route GET /api/languages/phrases/all
 * @desc Get all platform phrases with translations
 * @access Public
 */
router.get('/phrases/all', async (req: Request, res: Response) => {
  try {
    const phrases = await indigenousLanguageService.getAllPhrases();
    
    res.json({
      success: true,
      data: phrases,
    });
  } catch (error: any) {
    logger.error('Failed to get all phrases', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get phrases' });
  }
});

/**
 * @route GET /api/languages/phrases/:key
 * @desc Get specific phrase translation
 * @access Public
 */
router.get('/phrases/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { languageId } = req.query;
    
    const phrase = await indigenousLanguageService.getPhraseTranslation(
      key,
      languageId as string
    );
    
    if (!phrase) {
      return void res.status(404).json({ success: false, message: 'Phrase not found' });
    }
    
    res.json({
      success: true,
      data: phrase,
    });
  } catch (error: any) {
    logger.error('Failed to get phrase', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get phrase' });
  }
});

/**
 * @route GET /api/languages/greeting/localized
 * @desc Get localized greeting based on location
 * @access Public
 */
router.get('/greeting/localized', async (req: Request, res: Response) => {
  try {
    const { state, city, languageId } = req.query;
    
    const greeting = await indigenousLanguageService.getLocalizedGreeting(
      { state: state as string, city: city as string },
      languageId as string
    );
    
    res.json({
      success: true,
      data: greeting,
    });
  } catch (error: any) {
    logger.error('Failed to get greeting', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get greeting' });
  }
});

// === Learner Routes ===

/**
 * @route POST /api/languages/learner/register
 * @desc Register as a language learner
 * @access Private
 */
router.post('/learner/register', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const preferences = req.body;
    
    const learner = await indigenousLanguageService.registerLearner(userId, preferences);
    
    res.status(201).json({
      success: true,
      data: learner,
      message: 'Successfully registered as a language learner',
    });
  } catch (error: any) {
    logger.error('Failed to register learner', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to register' });
  }
});

/**
 * @route GET /api/languages/learner/progress
 * @desc Get learner's progress
 * @access Private
 */
router.get('/learner/progress', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const progress = await indigenousLanguageService.getLearnerProgress(userId);
    
    res.json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    logger.error('Failed to get progress', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get progress' });
  }
});

export default router;


