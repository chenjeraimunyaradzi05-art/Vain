import express from 'express';
import { _testCaptureGetAll, _testCaptureClear } from '../lib/mailer';
import { prisma } from '../db';

const router = express.Router();

router.get('/ses-captured', (req, res) => {
    const all = _testCaptureGetAll();
    // For convenience return buffers as base64 strings
    const normalized = all.map((m: any) => {
        if (m && m.RawMessage && m.RawMessage.Data) {
            const data = Buffer.isBuffer(m.RawMessage.Data) ? m.RawMessage.Data.toString('base64') : Buffer.from(String(m.RawMessage.Data)).toString('base64');
            return { RawMessage: { Data: data } };
        }
        return m;
    });
    res.json({ messages: normalized });
});

router.post('/ses-clear', (req, res) => {
    _testCaptureClear();
    res.json({ ok: true });
});

// Test-only: fetch audit logs (non-production only)
router.get('/audit-logs', async (req, res) => {
    const nodeEnv = String(process.env.NODE_ENV || 'development').toLowerCase();
    if (nodeEnv === 'production') return void res.status(404).json({ error: 'Not found' });
    const { companyId } = req.query;
    const logs = await prisma.auditLog.findMany({ where: companyId ? { companyId: String(companyId) } : {}, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({ logs });
});

export default router;

