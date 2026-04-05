// @ts-nocheck
"use strict";
/**
 * Bulk Import API Routes
 * 
 * Handle bulk data imports for jobs, candidates, and courses.
 */

import express from 'express';
import { prisma } from '../db';
import requireAuth from '../middleware/auth';

const router = express.Router();

// Maximum rows per import
const MAX_ROWS = 1000;

/**
 * Simple CSV parser (no external dependencies)
 * Handles quoted fields with commas
 */
function parseCSV(csvData) {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() || '';
    });
    rows.push(row);
  }
  
  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  
  return values;
}

/**
 * GET /bulk-import
 * List import jobs for company
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const imports = await prisma.bulkImportJob.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    res.json({ imports });
  } catch (err) {
    console.error('Failed to list imports:', err);
    res.status(500).json({ error: 'Failed to list imports' });
  }
});

/**
 * GET /bulk-import/:id
 * Get import job details
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { id } = req.params;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const importJob = await prisma.bulkImportJob.findFirst({
      where: { id, companyId: company.id }
    });
    
    if (!importJob) {
      return void res.status(404).json({ error: 'Import not found' });
    }
    
    const result = {
      ...importJob,
      errorLog: importJob.errorLog ? JSON.parse(importJob.errorLog) : []
    };
    
    res.json({ import: result });
  } catch (err) {
    console.error('Failed to get import:', err);
    res.status(500).json({ error: 'Failed to get import details' });
  }
});

/**
 * POST /bulk-import/jobs
 * Import jobs from CSV
 */
router.post('/jobs', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { csvData, fileName = 'jobs-import.csv' } = req.body;
    
    if (!csvData) {
      return void res.status(400).json({ error: 'CSV data required' });
    }
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    // Parse CSV
    let rows;
    try {
      rows = parseCSV(csvData);
    } catch (parseErr) {
      return void res.status(400).json({ error: 'Invalid CSV format', details: parseErr.message });
    }
    
    if (rows.length === 0) {
      return void res.status(400).json({ error: 'CSV is empty' });
    }
    
    if (rows.length > MAX_ROWS) {
      return void res.status(400).json({ error: `Maximum ${MAX_ROWS} rows per import` });
    }
    
    // Validate required columns
    const required = ['title', 'location', 'type'];
    const columns = Object.keys(rows[0]);
    const missing = required.filter(r => !columns.includes(r));
    
    if (missing.length > 0) {
      return void res.status(400).json({ 
        error: 'Missing required columns', 
        missing,
        received: columns 
      });
    }
    
    // Create import job
    const importJob = await prisma.bulkImportJob.create({
      data: {
        companyId: company.id,
        type: 'JOBS',
        fileName,
        status: 'PROCESSING',
        totalRows: rows.length,
        startedAt: new Date()
      }
    });
    
    // Process in background
    processJobsImport(importJob.id, rows, userId).catch(err => {
      console.error('Jobs import failed:', err);
    });
    
    res.status(202).json({
      importId: importJob.id,
      message: 'Import started',
      totalRows: rows.length
    });
  } catch (err) {
    console.error('Failed to start jobs import:', err);
    res.status(500).json({ error: 'Failed to start import' });
  }
});

/**
 * Process jobs import
 */
async function processJobsImport(importId, rows, userId) {
  const errors = [];
  let processed = 0;
  let failed = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      await prisma.job.create({
        data: {
          userId,
          title: row.title,
          description: row.description || '',
          location: row.location,
          type: row.type as any, // full-time, part-time, contract, etc.
          salary: row.salary || null,
          category: row.category || 'General',
          requirements: row.requirements || null,
          responsibilities: row.responsibilities || null,
          benefits: row.benefits || null,
          isRemote: row.remote?.toLowerCase() === 'yes' || row.remote?.toLowerCase() === 'true',
          status: 'active',
          isIndigenousOnly: row.indigenousOnly?.toLowerCase() === 'yes',
          deadline: row.deadline ? new Date(row.deadline) : null
        }
      });
      processed++;
    } catch (rowErr) {
      failed++;
      errors.push({
        row: i + 2, // +2 for header and 0-index
        error: rowErr.message,
        data: { title: row.title }
      });
    }
    
    // Update progress every 10 rows
    if ((i + 1) % 10 === 0) {
      await prisma.bulkImportJob.update({
        where: { id: importId },
        data: { processedRows: processed + failed }
      });
    }
  }
  
  // Final update
  await prisma.bulkImportJob.update({
    where: { id: importId },
    data: {
      status: failed === rows.length ? 'FAILED' : 'COMPLETED',
      processedRows: processed,
      failedRows: failed,
      errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
      completedAt: new Date()
    }
  });
}

/**
 * POST /bulk-import/candidates
 * Import candidates from CSV
 */
router.post('/candidates', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { csvData, fileName = 'candidates-import.csv' } = req.body;
    
    if (!csvData) {
      return void res.status(400).json({ error: 'CSV data required' });
    }
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    // Parse CSV
    let rows;
    try {
      rows = parseCSV(csvData);
    } catch (parseErr) {
      return void res.status(400).json({ error: 'Invalid CSV format', details: parseErr.message });
    }
    
    if (rows.length === 0) {
      return void res.status(400).json({ error: 'CSV is empty' });
    }
    
    if (rows.length > MAX_ROWS) {
      return void res.status(400).json({ error: `Maximum ${MAX_ROWS} rows per import` });
    }
    
    // Validate required columns
    const required = ['email', 'name'];
    const columns = Object.keys(rows[0]);
    const missing = required.filter(r => !columns.includes(r));
    
    if (missing.length > 0) {
      return void res.status(400).json({ 
        error: 'Missing required columns', 
        missing,
        received: columns 
      });
    }
    
    // Create import job
    const importJob = await prisma.bulkImportJob.create({
      data: {
        companyId: company.id,
        type: 'CANDIDATES',
        fileName,
        status: 'PROCESSING',
        totalRows: rows.length,
        startedAt: new Date()
      }
    });
    
    // Process in background
    processCandidatesImport(importJob.id, rows).catch(err => {
      console.error('Candidates import failed:', err);
    });
    
    res.status(202).json({
      importId: importJob.id,
      message: 'Import started',
      totalRows: rows.length
    });
  } catch (err) {
    console.error('Failed to start candidates import:', err);
    res.status(500).json({ error: 'Failed to start import' });
  }
});

/**
 * Process candidates import
 */
async function processCandidatesImport(importId, rows) {
  const errors = [];
  let processed = 0;
  let failed = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: row.email }
      });
      
      if (existing) {
        errors.push({
          row: i + 2,
          error: 'Email already exists',
          data: { email: row.email }
        });
        failed++;
        continue;
      }
      
      // Create user with member profile
      const nameParts = row.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      
      await prisma.user.create({
        data: {
          email: row.email,
          password: '', // Bulk imported users need to reset password
          userType: 'member',
          memberProfile: {
            create: {
              phone: row.phone || null,
              mobNation: row.mobNation || row.nation || null,
              skillLevel: row.skillLevel || 'entry',
              careerInterest: row.careerInterest || null,
              bio: row.bio || null
            }
          }
        }
      });
      processed++;
    } catch (rowErr) {
      failed++;
      errors.push({
        row: i + 2,
        error: rowErr.message,
        data: { email: row.email }
      });
    }
    
    // Update progress
    if ((i + 1) % 10 === 0) {
      await prisma.bulkImportJob.update({
        where: { id: importId },
        data: { processedRows: processed + failed }
      });
    }
  }
  
  // Final update
  await prisma.bulkImportJob.update({
    where: { id: importId },
    data: {
      status: failed === rows.length ? 'FAILED' : 'COMPLETED',
      processedRows: processed,
      failedRows: failed,
      errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
      completedAt: new Date()
    }
  });
}

/**
 * POST /bulk-import/courses
 * Import courses from CSV (for institutions)
 */
router.post('/courses', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { csvData, fileName = 'courses-import.csv' } = req.body;
    
    if (!csvData) {
      return void res.status(400).json({ error: 'CSV data required' });
    }
    
    // Get institution profile
    const institution = await prisma.institutionProfile.findFirst({
      where: { userId }
    });
    
    // Also allow company profile
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!institution && !company) {
      return void res.status(403).json({ error: 'Institution or company profile required' });
    }
    
    const companyId = company?.id;
    
    // Parse CSV
    let rows;
    try {
      rows = parseCSV(csvData);
    } catch (parseErr) {
      return void res.status(400).json({ error: 'Invalid CSV format', details: parseErr.message });
    }
    
    if (rows.length === 0) {
      return void res.status(400).json({ error: 'CSV is empty' });
    }
    
    if (rows.length > MAX_ROWS) {
      return void res.status(400).json({ error: `Maximum ${MAX_ROWS} rows per import` });
    }
    
    // Validate required columns
    const required = ['title', 'description'];
    const columns = Object.keys(rows[0]);
    const missing = required.filter(r => !columns.includes(r));
    
    if (missing.length > 0) {
      return void res.status(400).json({ 
        error: 'Missing required columns', 
        missing,
        received: columns 
      });
    }
    
    // Create import job
    const importJob = await prisma.bulkImportJob.create({
      data: {
        companyId: companyId,
        type: 'COURSES',
        fileName,
        status: 'PROCESSING',
        totalRows: rows.length,
        startedAt: new Date()
      }
    });
    
    // Process in background
    processCoursesImport(importJob.id, rows, userId).catch(err => {
      console.error('Courses import failed:', err);
    });
    
    res.status(202).json({
      importId: importJob.id,
      message: 'Import started',
      totalRows: rows.length
    });
  } catch (err) {
    console.error('Failed to start courses import:', err);
    res.status(500).json({ error: 'Failed to start import' });
  }
});

/**
 * Process courses import
 */
async function processCoursesImport(importId, rows, userId) {
  const errors = [];
  let processed = 0;
  let failed = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      await prisma.course.create({
        data: {
          institutionId: userId,
          title: row.title,
          description: row.description,
          category: row.category || 'General',
          duration: row.duration || null,
          level: (row.level || 'Beginner') as any,
          format: row.format || 'online',
          price: row.price ? parseFloat(row.price) : null,
          isFree: row.price === '0' || row.free?.toLowerCase() === 'yes',
          isIndigenousOnly: row.indigenousOnly?.toLowerCase() === 'yes',
          status: 'active'
        }
      });
      processed++;
    } catch (rowErr) {
      failed++;
      errors.push({
        row: i + 2,
        error: rowErr.message,
        data: { title: row.title }
      });
    }
    
    // Update progress
    if ((i + 1) % 10 === 0) {
      await prisma.bulkImportJob.update({
        where: { id: importId },
        data: { processedRows: processed + failed }
      });
    }
  }
  
  // Final update
  await prisma.bulkImportJob.update({
    where: { id: importId },
    data: {
      status: failed === rows.length ? 'FAILED' : 'COMPLETED',
      processedRows: processed,
      failedRows: failed,
      errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
      completedAt: new Date()
    }
  });
}

/**
 * GET /bulk-import/templates/:type
 * Download CSV template for import type
 */
router.get('/templates/:type', (req, res) => {
  const { type } = req.params;
  
  const templates = {
    jobs: 'title,description,location,type,salary,category,requirements,responsibilities,benefits,remote,indigenousOnly,deadline\n"Software Developer","Build cool apps","Sydney, NSW","full-time","80000-100000","Technology","3+ years experience","Write code, review code","Health insurance","no","no","2024-12-31"',
    candidates: 'email,name,phone,mobNation,skillLevel,careerInterest,bio\n"john@example.com","John Smith","0400000000","Wiradjuri","mid","Technology","Passionate developer"',
    courses: 'title,description,category,duration,level,format,price,free,indigenousOnly\n"Introduction to Coding","Learn the basics","Technology","8 weeks","Beginner","online","0","yes","no"'
  };
  
  if (!templates[type]) {
    return void res.status(404).json({ 
      error: 'Unknown template type', 
      available: Object.keys(templates) 
    });
  }
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${type}-template.csv`);
  res.send(templates[type]);
});

export default router;


export {};


