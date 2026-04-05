import express from 'express';
import authenticateJWT from '../middleware/auth';
import { prisma } from '../db';

const router = express.Router();

// Generate unique invoice number
function generateInvoiceNumber(): string {
  const prefix = 'INV';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${random}`;
}

// Calculate totals from line items
function calculateTotals(lineItems: any[], taxRate = 10) {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;
  return { subtotal, taxAmount, totalAmount };
}

/**
 * GET /invoices
 * List all business invoices for the authenticated user
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, clientName, page = '1', limit = '20' } = req.query;

    const where: any = { userId };
    if (status) where.status = String(status).toUpperCase();
    if (clientName) where.clientName = { contains: String(clientName), mode: 'insensitive' };

    const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
    const take = parseInt(String(limit));

    const [invoices, total] = await Promise.all([
      prisma.businessInvoice.findMany({
        where,
        include: {
          lineItems: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.businessInvoice.count({ where }),
    ]);

    return void res.json({
      invoices,
      total,
      page: parseInt(String(page)),
      totalPages: Math.ceil(total / take),
    });
  } catch (err: any) {
    console.error('List invoices error:', err);
    return void res.status(500).json({ error: 'Failed to list invoices' });
  }
});

/**
 * GET /invoices/:id
 * Get a single invoice by ID
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const invoice = await prisma.businessInvoice.findFirst({
      where: { id, userId },
      include: {
        lineItems: true,
        payments: true,
      },
    });

    if (!invoice) {
      return void res.status(404).json({ error: 'Invoice not found' });
    }

    return void res.json({ invoice });
  } catch (err: any) {
    console.error('Get invoice error:', err);
    return void res.status(500).json({ error: 'Failed to get invoice' });
  }
});

/**
 * POST /invoices
 * Create a new invoice
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      clientAbn,
      issueDate,
      dueDate,
      currency = 'AUD',
      notes,
      termsAndConditions,
      lineItems = [],
      taxRate = 10,
    } = req.body;

    if (!clientName) {
      return void res.status(400).json({ error: 'Client name is required' });
    }

    const invoiceNumber = generateInvoiceNumber();
    const { subtotal, taxAmount, totalAmount } = calculateTotals(lineItems, taxRate);

    const invoice = await prisma.businessInvoice.create({
      data: {
        userId,
        invoiceNumber,
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        clientAbn,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        currency,
        subtotal,
        taxAmount,
        totalAmount,
        notes,
        termsAndConditions,
        status: 'DRAFT',
        lineItems: {
          create: lineItems.map((item: any, index: number) => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            amount: (item.quantity || 1) * (item.unitPrice || 0),
            taxRate: item.taxRate || taxRate,
            sortOrder: index,
          })),
        },
      },
      include: {
        lineItems: true,
      },
    });

    return void res.status(201).json({ invoice });
  } catch (err: any) {
    console.error('Create invoice error:', err);
    return void res.status(500).json({ error: 'Failed to create invoice' });
  }
});

/**
 * PUT /invoices/:id
 * Update an invoice (only if DRAFT status)
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      clientAbn,
      issueDate,
      dueDate,
      currency,
      notes,
      termsAndConditions,
      lineItems,
      taxRate = 10,
    } = req.body;

    const existing = await prisma.businessInvoice.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Invoice not found' });
    }

    if (existing.status !== 'DRAFT') {
      return void res.status(400).json({ error: 'Only draft invoices can be edited' });
    }

    const updateData: any = {};
    if (clientName !== undefined) updateData.clientName = clientName;
    if (clientEmail !== undefined) updateData.clientEmail = clientEmail;
    if (clientPhone !== undefined) updateData.clientPhone = clientPhone;
    if (clientAddress !== undefined) updateData.clientAddress = clientAddress;
    if (clientAbn !== undefined) updateData.clientAbn = clientAbn;
    if (issueDate !== undefined) updateData.issueDate = new Date(issueDate);
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (currency !== undefined) updateData.currency = currency;
    if (notes !== undefined) updateData.notes = notes;
    if (termsAndConditions !== undefined) updateData.termsAndConditions = termsAndConditions;

    // Update line items if provided
    if (lineItems !== undefined) {
      const { subtotal, taxAmount, totalAmount } = calculateTotals(lineItems, taxRate);
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.totalAmount = totalAmount;

      // Delete existing line items and create new ones
      await prisma.businessInvoiceLineItem.deleteMany({ where: { invoiceId: id } });
    }

    const invoice = await prisma.businessInvoice.update({
      where: { id },
      data: {
        ...updateData,
        ...(lineItems !== undefined && {
          lineItems: {
            create: lineItems.map((item: any, index: number) => ({
              description: item.description,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              amount: (item.quantity || 1) * (item.unitPrice || 0),
              taxRate: item.taxRate || taxRate,
              sortOrder: index,
            })),
          },
        }),
      },
      include: {
        lineItems: true,
        payments: true,
      },
    });

    return void res.json({ invoice });
  } catch (err: any) {
    console.error('Update invoice error:', err);
    return void res.status(500).json({ error: 'Failed to update invoice' });
  }
});

/**
 * DELETE /invoices/:id
 * Delete an invoice (only if DRAFT status)
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.businessInvoice.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Invoice not found' });
    }

    if (existing.status !== 'DRAFT') {
      return void res.status(400).json({ error: 'Only draft invoices can be deleted' });
    }

    // Delete line items first
    await prisma.businessInvoiceLineItem.deleteMany({ where: { invoiceId: id } });
    
    // Delete the invoice
    await prisma.businessInvoice.delete({ where: { id } });

    return void res.json({ success: true });
  } catch (err: any) {
    console.error('Delete invoice error:', err);
    return void res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

/**
 * POST /invoices/:id/send
 * Send an invoice (changes status to SENT)
 */
router.post('/:id/send', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.businessInvoice.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Invoice not found' });
    }

    if (existing.status !== 'DRAFT') {
      return void res.status(400).json({ error: 'Invoice has already been sent' });
    }

    const invoice = await prisma.businessInvoice.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
      include: {
        lineItems: true,
        payments: true,
      },
    });

    // TODO: Send email notification to client
    // await sendInvoiceEmail(invoice);

    return void res.json({ invoice });
  } catch (err: any) {
    console.error('Send invoice error:', err);
    return void res.status(500).json({ error: 'Failed to send invoice' });
  }
});

/**
 * POST /invoices/:id/cancel
 * Cancel an invoice
 */
router.post('/:id/cancel', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.businessInvoice.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Invoice not found' });
    }

    if (existing.status === 'PAID' || existing.status === 'CANCELLED') {
      return void res.status(400).json({ error: 'Invoice cannot be cancelled' });
    }

    const invoice = await prisma.businessInvoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        lineItems: true,
        payments: true,
      },
    });

    return void res.json({ invoice });
  } catch (err: any) {
    console.error('Cancel invoice error:', err);
    return void res.status(500).json({ error: 'Failed to cancel invoice' });
  }
});

/**
 * POST /invoices/:id/duplicate
 * Create a copy of an invoice
 */
router.post('/:id/duplicate', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.businessInvoice.findFirst({
      where: { id, userId },
      include: { lineItems: true },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Invoice not found' });
    }

    const newInvoiceNumber = generateInvoiceNumber();

    const invoice = await prisma.businessInvoice.create({
      data: {
        userId,
        invoiceNumber: newInvoiceNumber,
        clientName: existing.clientName,
        clientEmail: existing.clientEmail,
        clientPhone: existing.clientPhone,
        clientAddress: existing.clientAddress,
        clientAbn: existing.clientAbn,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: existing.currency,
        subtotal: existing.subtotal,
        taxAmount: existing.taxAmount,
        totalAmount: existing.totalAmount,
        notes: existing.notes,
        termsAndConditions: existing.termsAndConditions,
        status: 'DRAFT',
        lineItems: {
          create: existing.lineItems.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            taxRate: item.taxRate,
            sortOrder: index,
          })),
        },
      },
      include: {
        lineItems: true,
      },
    });

    return void res.status(201).json({ invoice });
  } catch (err: any) {
    console.error('Duplicate invoice error:', err);
    return void res.status(500).json({ error: 'Failed to duplicate invoice' });
  }
});

/**
 * POST /invoices/:id/payments
 * Record a payment for an invoice
 */
router.post('/:id/payments', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { amount, method = 'BANK_TRANSFER', reference, paidAt } = req.body;

    if (!amount || amount <= 0) {
      return void res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const existing = await prisma.businessInvoice.findFirst({
      where: { id, userId },
      include: { payments: true },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Invoice not found' });
    }

    if (existing.status === 'DRAFT' || existing.status === 'CANCELLED') {
      return void res.status(400).json({ error: 'Cannot record payment for this invoice' });
    }

    // Calculate total paid
    const totalPaid = existing.payments.reduce((sum, p) => sum + p.amount, 0) + amount;
    
    // Determine new status
    let newStatus = existing.status;
    if (totalPaid >= existing.totalAmount) {
      newStatus = 'PAID';
    }

    // Create payment and update invoice in transaction
    const [payment, invoice] = await prisma.$transaction([
      prisma.businessInvoicePayment.create({
        data: {
          invoiceId: id,
          amount,
          method,
          reference,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        },
      }),
      prisma.businessInvoice.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === 'PAID' && { paidAt: new Date() }),
        },
        include: {
          lineItems: true,
          payments: true,
        },
      }),
    ]);

    return void res.status(201).json({ payment, invoice });
  } catch (err: any) {
    console.error('Record payment error:', err);
    return void res.status(500).json({ error: 'Failed to record payment' });
  }
});

/**
 * GET /invoices/stats
 * Get invoice statistics
 */
router.get('/stats/summary', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalInvoices, paidInvoices, pendingInvoices, overdueInvoices] = await Promise.all([
      prisma.businessInvoice.count({ where: { userId } }),
      prisma.businessInvoice.aggregate({
        where: { userId, status: 'PAID' },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.businessInvoice.aggregate({
        where: { userId, status: { in: ['SENT', 'VIEWED'] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.businessInvoice.aggregate({
        where: { userId, status: 'OVERDUE' },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    return void res.json({
      totalInvoices,
      paid: {
        count: paidInvoices._count,
        amount: paidInvoices._sum.totalAmount || 0,
      },
      pending: {
        count: pendingInvoices._count,
        amount: pendingInvoices._sum.totalAmount || 0,
      },
      overdue: {
        count: overdueInvoices._count,
        amount: overdueInvoices._sum.totalAmount || 0,
      },
    });
  } catch (err: any) {
    console.error('Get invoice stats error:', err);
    return void res.status(500).json({ error: 'Failed to get invoice statistics' });
  }
});

export default router;
