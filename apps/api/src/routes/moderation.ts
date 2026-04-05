import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { contentModerationService } from '../services/contentModeration';

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.get('/', (_req, res) => {
  res.json({
    routes: ['GET /health', 'POST /check'],
  });
});

const checkSchema = z.object({
  content: z.string().min(1).max(10000),
  contentType: z.enum(['post', 'comment', 'message', 'profile', 'group', 'image', 'video']),
  context: z
    .object({
      isReply: z.boolean().optional(),
      targetUserId: z.string().optional(),
      communityId: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /moderation/check
 * Runs automated moderation checks and returns the decision + sanitized content.
 */
router.post('/check', authenticate, async (req: any, res) => {
  const parsed = checkSchema.safeParse(req.body);
  if (!parsed.success) {
    return void res.status(400).json({ error: parsed.error.flatten() });
  }

  const userId = String(req.user?.id || '').trim();
  if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await contentModerationService.moderateContent(
      parsed.data.content,
      parsed.data.contentType,
      userId,
      parsed.data.context
    );
    return void res.json({ result });
  } catch (err: any) {
    console.error('[Moderation] check failed:', err);
    return void res.status(500).json({ error: 'Moderation check failed' });
  }
});

export default router;


