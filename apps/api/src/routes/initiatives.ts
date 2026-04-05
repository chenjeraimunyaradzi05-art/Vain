/**
 * Community Initiatives API Routes
 * 
 * Endpoints for managing community programs, volunteering, and initiatives
 */

import { Router, Request, Response } from 'express';
import { communityInitiativesService } from '../services/communityInitiativesService';
import { authenticate, authorize } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

// === Public Routes ===

/**
 * @route GET /api/initiatives
 * @desc Get community initiatives with filters
 * @access Public
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      type,
      category,
      status,
      region,
      isElderLed,
      isYouthFocused,
      search,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
    } = req.query;

    const filters: any = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (region) filters.region = region;
    if (isElderLed === 'true') filters.isElderLed = true;
    if (isYouthFocused === 'true') filters.isYouthFocused = true;
    if (search) filters.search = search;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const result = await communityInitiativesService.getInitiatives(filters, {
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      sortBy: sortBy as string,
    });

    res.json({
      success: true,
      data: result.initiatives,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get initiatives', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get initiatives' });
  }
});

/**
 * @route GET /api/initiatives/elder-led
 * @desc Get elder-led initiatives
 * @access Public
 */
router.get('/elder-led', async (req: Request, res: Response) => {
  try {
    const initiatives = await communityInitiativesService.getElderLedInitiatives();
    
    res.json({
      success: true,
      data: initiatives,
      count: initiatives.length,
    });
  } catch (error: any) {
    logger.error('Failed to get elder-led initiatives', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get initiatives' });
  }
});

/**
 * @route GET /api/initiatives/youth
 * @desc Get youth-focused initiatives
 * @access Public
 */
router.get('/youth', async (req: Request, res: Response) => {
  try {
    const initiatives = await communityInitiativesService.getYouthInitiatives();
    
    res.json({
      success: true,
      data: initiatives,
      count: initiatives.length,
    });
  } catch (error: any) {
    logger.error('Failed to get youth initiatives', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get initiatives' });
  }
});

/**
 * @route GET /api/initiatives/nation/:nation
 * @desc Get initiatives by nation/community
 * @access Public
 */
router.get('/nation/:nation', async (req: Request, res: Response) => {
  try {
    const { nation } = req.params;
    const initiatives = await communityInitiativesService.getInitiativesByNation(nation);
    
    res.json({
      success: true,
      data: initiatives,
      nation,
      count: initiatives.length,
    });
  } catch (error: any) {
    logger.error('Failed to get initiatives by nation', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get initiatives' });
  }
});

/**
 * @route GET /api/initiatives/impact
 * @desc Get community impact report
 * @access Public
 */
router.get('/impact', async (req: Request, res: Response) => {
  try {
    const { region, category } = req.query;
    
    const report = await communityInitiativesService.getImpactReport({
      region: region as string,
      category: category as any,
    });
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    logger.error('Failed to get impact report', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get impact report' });
  }
});

/**
 * @route GET /api/initiatives/volunteer-opportunities
 * @desc Get volunteer opportunities
 * @access Public
 */
router.get('/volunteer-opportunities', async (req: Request, res: Response) => {
  try {
    const { region, skills, isRemote } = req.query;
    
    const opportunities = await communityInitiativesService.getVolunteerOpportunities({
      region: region as string,
      skills: skills ? (skills as string).split(',') : undefined,
      isRemote: isRemote === 'true',
    });
    
    res.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
    });
  } catch (error: any) {
    logger.error('Failed to get volunteer opportunities', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get opportunities' });
  }
});

/**
 * @route GET /api/initiatives/grants
 * @desc Get grant opportunities
 * @access Public
 */
router.get('/grants', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    const grants = await communityInitiativesService.getGrantOpportunities(category as any);
    
    res.json({
      success: true,
      data: grants,
      count: grants.length,
    });
  } catch (error: any) {
    logger.error('Failed to get grants', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get grants' });
  }
});

/**
 * @route GET /api/initiatives/:id
 * @desc Get initiative by ID
 * @access Public
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const initiative = await communityInitiativesService.getInitiativeById(id);
    
    if (!initiative) {
      return void res.status(404).json({ success: false, message: 'Initiative not found' });
    }
    
    res.json({
      success: true,
      data: initiative,
    });
  } catch (error: any) {
    logger.error('Failed to get initiative', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get initiative' });
  }
});

// === Authenticated Routes ===

/**
 * @route POST /api/initiatives
 * @desc Create a new initiative
 * @access Private
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const initiativeData = req.body;
    
    const initiative = await communityInitiativesService.createInitiative(userId, initiativeData);
    
    res.status(201).json({
      success: true,
      data: initiative,
      message: 'Initiative created successfully',
    });
  } catch (error: any) {
    logger.error('Failed to create initiative', { error: error.message });
    res.status(500).json({ success: false, message: error.message || 'Failed to create initiative' });
  }
});

/**
 * @route PUT /api/initiatives/:id
 * @desc Update an initiative
 * @access Private (owner only)
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updates = req.body;
    
    const initiative = await communityInitiativesService.updateInitiative(id, userId, updates);
    
    if (!initiative) {
      return void res.status(404).json({ success: false, message: 'Initiative not found or unauthorized' });
    }
    
    res.json({
      success: true,
      data: initiative,
      message: 'Initiative updated successfully',
    });
  } catch (error: any) {
    logger.error('Failed to update initiative', { error: error.message });
    res.status(500).json({ success: false, message: error.message || 'Failed to update' });
  }
});

/**
 * @route POST /api/initiatives/:id/join
 * @desc Join an initiative as volunteer
 * @access Private
 */
router.post('/:id/join', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { role = 'Volunteer' } = req.body;
    
    const volunteer = await communityInitiativesService.joinAsVolunteer(id, userId, role);
    
    res.status(201).json({
      success: true,
      data: volunteer,
      message: 'Successfully joined the initiative',
    });
  } catch (error: any) {
    logger.error('Failed to join initiative', { error: error.message });
    res.status(500).json({ success: false, message: error.message || 'Failed to join' });
  }
});

/**
 * @route POST /api/initiatives/:id/log-hours
 * @desc Log volunteer hours
 * @access Private
 */
router.post('/:id/log-hours', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { hours, description } = req.body;
    
    if (!hours || hours <= 0) {
      return void res.status(400).json({ success: false, message: 'Valid hours required' });
    }
    
    await communityInitiativesService.logVolunteerHours(id, userId, hours, description);
    
    res.json({
      success: true,
      message: `Logged ${hours} volunteer hours`,
    });
  } catch (error: any) {
    logger.error('Failed to log hours', { error: error.message });
    res.status(500).json({ success: false, message: error.message || 'Failed to log hours' });
  }
});

/**
 * @route POST /api/initiatives/:id/milestones
 * @desc Add a milestone to an initiative
 * @access Private (owner only)
 */
router.post('/:id/milestones', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const milestoneData = req.body;
    
    const milestone = await communityInitiativesService.addMilestone(id, userId, milestoneData);
    
    res.status(201).json({
      success: true,
      data: milestone,
      message: 'Milestone added successfully',
    });
  } catch (error: any) {
    logger.error('Failed to add milestone', { error: error.message });
    res.status(500).json({ success: false, message: error.message || 'Failed to add milestone' });
  }
});

/**
 * @route PUT /api/initiatives/milestones/:milestoneId
 * @desc Update milestone status
 * @access Private (owner only)
 */
router.put('/milestones/:milestoneId', authenticate, async (req: Request, res: Response) => {
  try {
    const { milestoneId } = req.params;
    const userId = (req as any).user.id;
    const { status } = req.body;
    
    await communityInitiativesService.updateMilestoneStatus(milestoneId, status, userId);
    
    res.json({
      success: true,
      message: 'Milestone status updated',
    });
  } catch (error: any) {
    logger.error('Failed to update milestone', { error: error.message });
    res.status(500).json({ success: false, message: error.message || 'Failed to update' });
  }
});

/**
 * @route POST /api/initiatives/:id/impact
 * @desc Record impact metric
 * @access Private (owner only)
 */
router.post('/:id/impact', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const metric = req.body;
    
    await communityInitiativesService.recordImpact(id, metric);
    
    res.json({
      success: true,
      message: 'Impact metric recorded',
    });
  } catch (error: any) {
    logger.error('Failed to record impact', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to record impact' });
  }
});

/**
 * @route GET /api/initiatives/user/volunteer-history
 * @desc Get user's volunteer history
 * @access Private
 */
router.get('/user/volunteer-history', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const history = await communityInitiativesService.getUserVolunteerHistory(userId);
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    logger.error('Failed to get volunteer history', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to get history' });
  }
});

// === Admin Routes ===

/**
 * @route POST /api/initiatives/grants
 * @desc Add a grant opportunity (admin only)
 * @access Private (Admin)
 */
router.post('/grants', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const grantData = req.body;
    
    const grant = await communityInitiativesService.addGrantOpportunity(grantData);
    
    res.status(201).json({
      success: true,
      data: grant,
      message: 'Grant opportunity added',
    });
  } catch (error: any) {
    logger.error('Failed to add grant', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to add grant' });
  }
});

export default router;


