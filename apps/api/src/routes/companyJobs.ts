import express from 'express';
import { CompanyService } from '../services/companyService';
import { validateRequest } from '../middleware/validate';
import { jobSchema } from '../schemas/company';
import { authenticate } from '../middleware/auth';
// @ts-ignore
import { checkJobLimit } from './subscriptions-v2';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const jobs = await CompanyService.getJobs(userId);
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

router.post('/', checkJobLimit, validateRequest(jobSchema), async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const job = await CompanyService.createJob(userId, req.body);
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const job = await CompanyService.getJob(userId, req.params.id);
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/applicants', async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const applicants = await CompanyService.getApplicants(userId, req.params.id);
    res.json({ applicants });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/applicants/:appId', async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const { status } = req.body;
    const application = await CompanyService.updateApplicationStatus(userId, req.params.id, req.params.appId, status);
    res.json({ application });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const job = await CompanyService.updateJob(userId, req.params.id, req.body);
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

export default router;

