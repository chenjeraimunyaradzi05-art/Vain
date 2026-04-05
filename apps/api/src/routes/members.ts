import express from 'express';
import { MemberService } from '../services/memberService';
import { validateRequest } from '../middleware/validate';
import { updateProfileSchema, updateFoundationPreferencesSchema } from '../schemas/member';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const profile = await MemberService.getProfile(userId);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

router.put('/profile', validateRequest(updateProfileSchema), async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const profile = await MemberService.updateProfile(userId, req.body);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// Foundation Preferences Routes
router.get('/foundation-preferences', async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const prefs = await MemberService.getFoundationPreferences(userId);
    res.json(prefs);
  } catch (error) {
    next(error);
  }
});

router.put('/foundation-preferences', validateRequest(updateFoundationPreferencesSchema), async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const prefs = await MemberService.updateFoundationPreferences(userId, req.body);
    res.json(prefs);
  } catch (error) {
    next(error);
  }
});

router.get('/applications', async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const applications = await MemberService.getApplications(userId);
    res.json(applications);
  } catch (error) {
    next(error);
  }
});

export default router;

