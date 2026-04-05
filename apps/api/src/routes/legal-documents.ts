/**
 * Legal Documents Routes
 * Phase 3 Steps 226-250: Legal Document Lab
 */

import { Router } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import { authenticate } from '../middleware/auth';
import {
  listLegalDocumentTemplates,
  renderLegalDocumentTemplate,
  renderTemplateContent,
} from '../lib/legalDocumentTemplates';

const router = Router();

const createDocumentSchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1),
  content: z.string().min(1).optional(),
  fileUrl: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
});

const updateDocumentSchema = createDocumentSchema.partial();

const renderTemplateSchema = z.object({
  templateId: z.string().min(1),
  variables: z.record(z.any()).optional(),
});

const createFromTemplateSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  variables: z.record(z.any()).optional(),
});

const renderDocumentSchema = z.object({
  variables: z.record(z.any()).optional(),
});

router.use(authenticate);

// Templates must be declared before `/:documentId` routes.
router.get('/templates', async (_req, res) => {
  try {
    res.json({ templates: listLegalDocumentTemplates() });
  } catch (error) {
    console.error('[legal-documents] templates error', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

router.post('/templates/render', async (req, res) => {
  try {
    const input = renderTemplateSchema.parse(req.body || {});
    const result = renderLegalDocumentTemplate(input.templateId, input.variables || {});
    res.json({
      template: result.template,
      content: result.content,
      missingVariables: result.missingVariables,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    const message = error instanceof Error ? error.message : 'Failed to render template';
    res.status(message === 'Template not found' ? 404 : 500).json({ error: message });
  }
});

router.post('/from-template', async (req, res) => {
  try {
    const input = createFromTemplateSchema.parse(req.body || {});
    const rendered = renderLegalDocumentTemplate(input.templateId, input.variables || {});

    const document = await prisma.legalDocument.create({
      data: {
        userId: (req as any).user.id,
        title: input.title || rendered.template.title,
        type: rendered.template.type,
        content: rendered.content,
        status: input.status || 'DRAFT',
      },
    });

    res.status(201).json({
      document,
      missingVariables: rendered.missingVariables,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    const message = error instanceof Error ? error.message : 'Failed to create from template';
    res.status(message === 'Template not found' ? 404 : 500).json({ error: message });
  }
});

router.get('/', async (req, res) => {
  try {
    const documents = await prisma.legalDocument.findMany({
      where: { userId: (req as any).user.id },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ documents });
  } catch (error) {
    console.error('[legal-documents] list error', error);
    res.status(500).json({ error: 'Failed to load legal documents' });
  }
});

router.post('/', async (req, res) => {
  try {
    const input = createDocumentSchema.parse(req.body || {});

    const document = await prisma.legalDocument.create({
      data: {
        userId: (req as any).user.id,
        title: input.title,
        type: input.type,
        content: input.content,
        fileUrl: input.fileUrl,
        status: input.status || 'DRAFT',
      },
    });

    res.status(201).json({ document });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[legal-documents] create error', error);
    res.status(500).json({ error: 'Failed to create legal document' });
  }
});

router.get('/:documentId', async (req, res) => {
  try {
    const document = await prisma.legalDocument.findFirst({
      where: { id: req.params.documentId, userId: (req as any).user.id },
    });

    if (!document) {
      return void res.status(404).json({ error: 'Legal document not found' });
    }

    res.json({ document });
  } catch (error) {
    console.error('[legal-documents] get error', error);
    res.status(500).json({ error: 'Failed to load legal document' });
  }
});

router.post('/:documentId/render', async (req, res) => {
  try {
    const input = renderDocumentSchema.parse(req.body || {});

    const document = await prisma.legalDocument.findFirst({
      where: { id: req.params.documentId, userId: (req as any).user.id },
    });

    if (!document) {
      return void res.status(404).json({ error: 'Legal document not found' });
    }

    const { content, missingVariables } = renderTemplateContent(String(document.content || ''), input.variables || {});

    res.json({
      documentId: document.id,
      content,
      missingVariables,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[legal-documents] render error', error);
    res.status(500).json({ error: 'Failed to render legal document' });
  }
});

router.get('/:documentId/export/pdf', async (req, res) => {
  try {
    const document = await prisma.legalDocument.findFirst({
      where: { id: req.params.documentId, userId: (req as any).user.id },
    });

    if (!document) {
      return void res.status(404).json({ error: 'Legal document not found' });
    }

    const title = document.title || 'Legal Document';
    const safeFileName = title
      .replace(/[^a-z0-9\- _]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80);

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (d: any) => chunks.push(d));

      doc.fontSize(18).text(title, { align: 'left' });
      doc.moveDown(0.25);
      doc.fontSize(10).fillColor('#666').text(`Type: ${document.type || ''}`);
      doc.fontSize(10).fillColor('#666').text(`Status: ${document.status || ''}`);
      doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toISOString()}`);
      doc.moveDown(1);
      doc.fillColor('#000');
      doc.fontSize(11).text(String(document.content || ''), { align: 'left' });

      doc.end();

      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName || 'legal_document'}.pdf"`);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('[legal-documents] export pdf error', error);
    res.status(500).json({ error: 'Failed to export legal document' });
  }
});

router.patch('/:documentId', async (req, res) => {
  try {
    const input = updateDocumentSchema.parse(req.body || {});

    const existing = await prisma.legalDocument.findFirst({
      where: { id: req.params.documentId, userId: (req as any).user.id },
      select: { id: true },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Legal document not found' });
    }

    const document = await prisma.legalDocument.update({
      where: { id: req.params.documentId },
      data: input,
    });

    res.json({ document });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[legal-documents] update error', error);
    res.status(500).json({ error: 'Failed to update legal document' });
  }
});

router.delete('/:documentId', async (req, res) => {
  try {
    const existing = await prisma.legalDocument.findFirst({
      where: { id: req.params.documentId, userId: (req as any).user.id },
      select: { id: true },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Legal document not found' });
    }

    await prisma.legalDocument.delete({ where: { id: req.params.documentId } });
    res.status(204).send();
  } catch (error) {
    console.error('[legal-documents] delete error', error);
    res.status(500).json({ error: 'Failed to delete legal document' });
  }
});

export default router;

