/**
 * Marketplace Routes
 * Phase 3 Steps 276-300: Business Network & Marketplace
 *
 * This provides a simple public listing surface for published women-owned
 * businesses, plus cross-business product/service discovery.
 */

import { Router } from 'express';
import { prisma } from '../db';
import { searchBusinesses } from '../services/womenBusiness';

const router = Router();

router.get('/businesses', async (req, res) => {
  try {
    const { industry, state, query, isFirstNationsBusiness, supplyNationCertified, limit, offset } = req.query;

    const result = await searchBusinesses({
      industry: industry ? String(industry) : undefined,
      state: state ? String(state) : undefined,
      query: query ? String(query) : undefined,
      isFirstNationsBusiness: String(isFirstNationsBusiness || '').toLowerCase() === 'true',
      supplyNationCertified: String(supplyNationCertified || '').toLowerCase() === 'true',
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('[marketplace] businesses search error', error);
    res.status(500).json({ error: 'Failed to search marketplace' });
  }
});

router.get('/businesses/:businessId', async (req, res) => {
  try {
    const business = await prisma.womenBusiness.findFirst({
      where: { id: req.params.businessId, isPublished: true },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        products: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
        services: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!business) {
      return void res.status(404).json({ error: 'Business not found' });
    }

    res.json({ business });
  } catch (error) {
    console.error('[marketplace] business details error', error);
    res.status(500).json({ error: 'Failed to load business' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const where: any = {
      isActive: true,
      business: { isPublished: true },
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.womenBusinessProduct.findMany({
        where,
        include: {
          business: {
            select: { id: true, name: true, industry: true, ownerId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.womenBusinessProduct.count({ where }),
    ]);

    res.json({ products, total });
  } catch (error) {
    console.error('[marketplace] products error', error);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

router.get('/services', async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const where: any = {
      isActive: true,
      business: { isPublished: true },
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [services, total] = await Promise.all([
      prisma.womenBusinessService.findMany({
        where,
        include: {
          business: {
            select: { id: true, name: true, industry: true, ownerId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.womenBusinessService.count({ where }),
    ]);

    res.json({ services, total });
  } catch (error) {
    console.error('[marketplace] services error', error);
    res.status(500).json({ error: 'Failed to load services' });
  }
});

router.get('/industries', async (_req, res) => {
  try {
    const industries = await prisma.womenBusiness.findMany({
      where: { isPublished: true },
      select: { industry: true },
      distinct: ['industry'],
      orderBy: { industry: 'asc' },
    });

    res.json({ industries: industries.map((i) => i.industry).filter(Boolean) });
  } catch (error) {
    console.error('[marketplace] industries error', error);
    res.status(500).json({ error: 'Failed to load industries' });
  }
});

router.get('/categories', async (_req, res) => {
  try {
    const [productCategories, serviceCategories] = await Promise.all([
      prisma.womenBusinessProduct.findMany({
        where: { isActive: true, business: { isPublished: true } },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
      prisma.womenBusinessService.findMany({
        where: { isActive: true, business: { isPublished: true } },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
    ]);

    res.json({
      productCategories: productCategories.map((c) => c.category).filter(Boolean),
      serviceCategories: serviceCategories.map((c) => c.category).filter(Boolean),
    });
  } catch (error) {
    console.error('[marketplace] categories error', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

export default router;

