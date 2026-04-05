// @ts-nocheck
'use strict';

/**
 * Elasticsearch Integration
 * Step 31: Full-text search implementation
 * 
 * Provides:
 * - Connection management with retry logic
 * - Index management for jobs, courses, mentors, forums
 * - Bulk indexing with batching
 * - Faceted search with filters
 * - Search analytics tracking
 * - Fallback to database search if ES unavailable
 */

const { Client } = require('@elastic/elasticsearch');
const { prisma } = require('../db');
const logger = require('./logger');

// Configuration
const ES_CONFIG = {
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_API_KEY ? {
    apiKey: process.env.ELASTICSEARCH_API_KEY
  } : process.env.ELASTICSEARCH_USERNAME ? {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD
  } : undefined,
  maxRetries: 3,
  requestTimeout: 30000,
  sniffOnStart: false,
  ssl: process.env.ELASTICSEARCH_SSL === 'true' ? {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  } : undefined
};

// Index configurations
const INDICES = {
  jobs: {
    name: 'ngurra_jobs',
    settings: {
      number_of_shards: 1,
      number_of_replicas: 1,
      analysis: {
        analyzer: {
          job_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'english_stemmer', 'english_stop']
          }
        },
        filter: {
          english_stemmer: { type: 'stemmer', language: 'english' },
          english_stop: { type: 'stop', stopwords: '_english_' }
        }
      }
    },
    mappings: {
      properties: {
        title: { type: 'text', analyzer: 'job_analyzer', fields: { keyword: { type: 'keyword' } } },
        description: { type: 'text', analyzer: 'job_analyzer' },
        company: { type: 'keyword' },
        companyId: { type: 'keyword' },
        location: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        coordinates: { type: 'geo_point' },
        employment: { type: 'keyword' },
        salaryLow: { type: 'integer' },
        salaryHigh: { type: 'integer' },
        skills: { type: 'keyword' },
        industry: { type: 'keyword' },
        experienceLevel: { type: 'keyword' },
        isRemote: { type: 'boolean' },
        isIndigenousFocused: { type: 'boolean' },
        isFeatured: { type: 'boolean' },
        isActive: { type: 'boolean' },
        postedAt: { type: 'date' },
        expiresAt: { type: 'date' },
        viewCount: { type: 'integer' },
        applicationCount: { type: 'integer' }
      }
    }
  },
  
  courses: {
    name: 'ngurra_courses',
    settings: {
      number_of_shards: 1,
      number_of_replicas: 1
    },
    mappings: {
      properties: {
        title: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
        description: { type: 'text' },
        category: { type: 'keyword' },
        provider: { type: 'keyword' },
        providerId: { type: 'keyword' },
        duration: { type: 'keyword' },
        qualification: { type: 'keyword' },
        skills: { type: 'keyword' },
        priceInCents: { type: 'integer' },
        isFree: { type: 'boolean' },
        isOnline: { type: 'boolean' },
        isAccredited: { type: 'boolean' },
        isActive: { type: 'boolean' },
        rating: { type: 'float' },
        enrollmentCount: { type: 'integer' }
      }
    }
  },

  mentors: {
    name: 'ngurra_mentors',
    settings: {
      number_of_shards: 1,
      number_of_replicas: 1
    },
    mappings: {
      properties: {
        name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        title: { type: 'text' },
        bio: { type: 'text' },
        skills: { type: 'keyword' },
        industry: { type: 'keyword' },
        location: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        yearsExperience: { type: 'integer' },
        isActive: { type: 'boolean' },
        isAvailable: { type: 'boolean' },
        isFeatured: { type: 'boolean' },
        rating: { type: 'float' },
        sessionCount: { type: 'integer' },
        specializations: { type: 'keyword' }
      }
    }
  },

  forums: {
    name: 'ngurra_forums',
    settings: {
      number_of_shards: 1,
      number_of_replicas: 1
    },
    mappings: {
      properties: {
        title: { type: 'text', analyzer: 'standard' },
        content: { type: 'text' },
        category: { type: 'keyword' },
        authorId: { type: 'keyword' },
        authorName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        tags: { type: 'keyword' },
        isPinned: { type: 'boolean' },
        isLocked: { type: 'boolean' },
        viewCount: { type: 'integer' },
        replyCount: { type: 'integer' },
        likeCount: { type: 'integer' },
        createdAt: { type: 'date' },
        lastActivityAt: { type: 'date' }
      }
    }
  }
};

// Singleton client
let client: any = null;
let isConnected = false;

/**
 * Initialize Elasticsearch client
 */
async function initClient() {
  if (client && isConnected) return client;

  try {
    client = new Client(ES_CONFIG);
    
    // Test connection
    const health = await client.cluster.health() as any;
    isConnected = health.status !== 'red';
    
    logger.info('Elasticsearch connected', { 
      status: health.status,
      cluster: health.cluster_name,
      nodes: health.number_of_nodes
    });
    
    return client;
  } catch (error) {
    logger.warn('Elasticsearch connection failed, using fallback', { error: error.message });
    isConnected = false;
    return null;
  }
}

/**
 * Get client with lazy initialization
 */
async function getClient() {
  if (!client) {
    await initClient();
  }
  return isConnected ? client : null;
}

/**
 * Check if Elasticsearch is available
 */
function isAvailable() {
  return isConnected;
}

/**
 * Create indices if they don't exist
 */
async function ensureIndices() {
  const es = await getClient();
  if (!es) return false;

  try {
    for (const [key, config] of Object.entries(INDICES)) {
      const exists = await es.indices.exists({ index: config.name });
      
      if (!exists) {
        await es.indices.create({
          index: config.name,
          body: {
            settings: config.settings,
            mappings: config.mappings
          }
        });
        logger.info(`Created Elasticsearch index: ${config.name}`);
      }
    }
    return true;
  } catch (error) {
    logger.error('Failed to create indices', { error: error.message });
    return false;
  }
}

/**
 * Index a single document
 */
async function indexDocument(indexKey, id, document) {
  const es = await getClient();
  if (!es) return false;

  const config = INDICES[indexKey];
  if (!config) {
    logger.error(`Unknown index key: ${indexKey}`);
    return false;
  }

  try {
    await es.index({
      index: config.name,
      id: String(id),
      body: document,
      refresh: 'wait_for'
    });
    return true;
  } catch (error) {
    logger.error('Failed to index document', { indexKey, id, error: error.message });
    return false;
  }
}

/**
 * Bulk index documents
 */
async function bulkIndex(indexKey, documents) {
  const es = await getClient();
  if (!es || documents.length === 0) return { success: 0, failed: 0 };

  const config = INDICES[indexKey];
  if (!config) return { success: 0, failed: documents.length };

  const BATCH_SIZE = 500;
  let success = 0;
  let failed = 0;

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const body = batch.flatMap(doc => [
      { index: { _index: config.name, _id: String(doc.id) } },
      doc
    ]);

    try {
      const result = await es.bulk({ body, refresh: false });
      
      if (result.errors) {
        result.items.forEach((item, idx) => {
          if (item.index?.error) {
            failed++;
            logger.warn('Bulk index item failed', { id: batch[idx].id, error: item.index.error });
          } else {
            success++;
          }
        });
      } else {
        success += batch.length;
      }
    } catch (error) {
      failed += batch.length;
      logger.error('Bulk index batch failed', { error: error.message });
    }
  }

  // Refresh after all batches
  try {
    await es.indices.refresh({ index: config.name });
  } catch (e) {
    // Non-critical
  }

  return { success, failed };
}

/**
 * Delete a document
 */
async function deleteDocument(indexKey, id) {
  const es = await getClient();
  if (!es) return false;

  const config = INDICES[indexKey];
  if (!config) return false;

  try {
    await es.delete({
      index: config.name,
      id: String(id),
      refresh: 'wait_for'
    });
    return true;
  } catch (error) {
    if (error.meta?.statusCode !== 404) {
      logger.error('Failed to delete document', { indexKey, id, error: error.message });
    }
    return false;
  }
}

/**
 * Search with faceted filtering
 * 
 * @param {string} indexKey - Index to search (jobs, courses, mentors, forums)
 * @param {object} params - Search parameters
 * @param {string} params.query - Search query text
 * @param {object} params.filters - Filter criteria
 * @param {number} params.from - Pagination offset
 * @param {number} params.size - Results per page
 * @param {string} params.sort - Sort field and direction
 * @param {boolean} params.includeFacets - Include aggregations
 */
async function search(indexKey, params) {
  const es = await getClient();
  const config = INDICES[indexKey];
  
  if (!es || !config) {
    // Fallback to database search
    return await fallbackSearch(indexKey, params);
  }

  const {
    query = '',
    filters = {},
    from = 0,
    size = 10,
    sort = null,
    includeFacets = true,
    userId = null
  } = params;

  try {
    // Build query
    const must = [];
    const filter = [];

    // Full-text search
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: getSearchFields(indexKey),
          type: 'best_fields',
          fuzziness: 'AUTO',
          prefix_length: 2
        }
      });
    } else {
      must.push({ match_all: {} });
    }

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;
      
      if (key === 'location' && filters.coordinates && filters.distance) {
        // Geo distance filter
        filter.push({
          geo_distance: {
            distance: filters.distance,
            coordinates: filters.coordinates
          }
        });
      } else if (key === 'salaryMin') {
        filter.push({ range: { salaryLow: { gte: value } } });
      } else if (key === 'salaryMax') {
        filter.push({ range: { salaryHigh: { lte: value } } });
      } else if (key === 'priceMax') {
        filter.push({ range: { priceInCents: { lte: value } } });
      } else if (Array.isArray(value)) {
        filter.push({ terms: { [key]: value } });
      } else if (typeof value === 'boolean') {
        filter.push({ term: { [key]: value } });
      } else {
        filter.push({ term: { [key]: value } });
      }
    }

    // Default active filter
    if (!filters.hasOwnProperty('isActive')) {
      filter.push({ term: { isActive: true } });
    }

    // Build aggregations for facets
    const aggs = includeFacets ? getAggregations(indexKey) : undefined;

    // Build sort
    const sortConfig = buildSort(indexKey, sort, query);

    // Execute search
    const result = await es.search({
      index: config.name,
      body: {
        from,
        size,
        query: {
          bool: {
            must,
            filter
          }
        },
        sort: sortConfig,
        aggs,
        highlight: {
          fields: {
            title: {},
            description: { fragment_size: 150 },
            content: { fragment_size: 150 }
          }
        }
      }
    });

    // Track search analytics
    trackSearchQuery(indexKey, query, result.hits.total.value, userId);

    // Parse response
    return {
      total: result.hits.total.value,
      results: result.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
        highlights: hit.highlight || {}
      })),
      facets: parseFacets(result.aggregations),
      took: result.took
    };
  } catch (error) {
    logger.error('Elasticsearch search failed', { indexKey, query, error: error.message });
    return await fallbackSearch(indexKey, params);
  }
}

/**
 * Get search fields for each index type
 */
function getSearchFields(indexKey) {
  const fields = {
    jobs: ['title^3', 'description', 'company^2', 'location', 'skills^2'],
    courses: ['title^3', 'description', 'category^2', 'provider', 'qualification'],
    mentors: ['name^3', 'title^2', 'bio', 'skills^2', 'industry'],
    forums: ['title^3', 'content', 'authorName', 'tags^2']
  };
  return fields[indexKey] || ['title', 'description'];
}

/**
 * Build aggregations for faceted search
 */
function getAggregations(indexKey) {
  const aggs = {
    jobs: {
      employment: { terms: { field: 'employment', size: 10 } },
      industry: { terms: { field: 'industry', size: 20 } },
      location: { terms: { field: 'location.keyword', size: 20 } },
      experienceLevel: { terms: { field: 'experienceLevel', size: 5 } },
      isRemote: { terms: { field: 'isRemote', size: 2 } },
      salaryRanges: {
        range: {
          field: 'salaryLow',
          ranges: [
            { to: 50000 },
            { from: 50000, to: 75000 },
            { from: 75000, to: 100000 },
            { from: 100000, to: 150000 },
            { from: 150000 }
          ]
        }
      }
    },
    courses: {
      category: { terms: { field: 'category', size: 20 } },
      provider: { terms: { field: 'provider', size: 20 } },
      isOnline: { terms: { field: 'isOnline', size: 2 } },
      isFree: { terms: { field: 'isFree', size: 2 } },
      isAccredited: { terms: { field: 'isAccredited', size: 2 } }
    },
    mentors: {
      industry: { terms: { field: 'industry', size: 20 } },
      skills: { terms: { field: 'skills', size: 30 } },
      isAvailable: { terms: { field: 'isAvailable', size: 2 } }
    },
    forums: {
      category: { terms: { field: 'category', size: 20 } },
      tags: { terms: { field: 'tags', size: 30 } }
    }
  };
  return aggs[indexKey] || {};
}

/**
 * Build sort configuration
 */
function buildSort(indexKey, sortParam, hasQuery) {
  if (sortParam) {
    const [field, direction = 'desc'] = sortParam.split(':');
    return [{ [field]: { order: direction } }];
  }

  // Default sorts
  if (hasQuery) {
    return [{ _score: { order: 'desc' } }];
  }

  const defaults = {
    jobs: [{ isFeatured: 'desc' }, { postedAt: 'desc' }],
    courses: [{ rating: 'desc' }, { enrollmentCount: 'desc' }],
    mentors: [{ isFeatured: 'desc' }, { rating: 'desc' }],
    forums: [{ isPinned: 'desc' }, { lastActivityAt: 'desc' }]
  };

  return defaults[indexKey] || [{ _score: 'desc' }];
}

/**
 * Parse aggregation results into facets
 */
function parseFacets(aggregations) {
  if (!aggregations) return {};

  const facets: any = {};
  for (const [key, agg] of Object.entries(aggregations)) {
    const aggData = agg as any;
    if (aggData.buckets) {
      facets[key] = aggData.buckets.map((bucket: any) => ({
        value: bucket.key,
        count: bucket.doc_count
      }));
    } else if (aggData.ranges) {
      facets[key] = aggData.ranges;
    }
  }
  return facets;
}

/**
 * Fallback to database search when ES is unavailable
 */
async function fallbackSearch(indexKey, params) {
  const { query = '', filters = {}, from = 0, size = 10 } = params;

  const modelMap = {
    jobs: 'job',
    courses: 'course',
    mentors: 'mentorProfile',
    forums: 'forumThread'
  };

  const model = modelMap[indexKey];
  if (!model) return { total: 0, results: [], facets: {}, took: 0 };

  const start = Date.now();

  try {
    // Build basic where clause
    const where: any = { isActive: true };
    
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ];
    }

    // Apply simple filters
    for (const [key, value] of Object.entries(filters)) {
      if (value && !['coordinates', 'distance'].includes(key)) {
        where[key] = value;
      }
    }

    const [results, total] = await Promise.all([
      prisma[model].findMany({
        where,
        skip: from,
        take: size,
        orderBy: { createdAt: 'desc' }
      }),
      prisma[model].count({ where })
    ]);

    return {
      total,
      results: results.map(r => ({ id: r.id, ...r })),
      facets: {},
      took: Date.now() - start,
      fallback: true
    };
  } catch (error) {
    logger.error('Fallback search failed', { indexKey, error: error.message });
    return { total: 0, results: [], facets: {}, took: 0, error: true };
  }
}

/**
 * Track search query for analytics
 */
async function trackSearchQuery(indexKey, query, resultCount, userId = null) {
  if (!query) return;

  try {
    await prisma.searchLog.create({
      data: {
        query,
        indexType: indexKey,
        resultCount,
        userId,
        createdAt: new Date()
      }
    });
  } catch (error) {
    // SearchLog might not exist yet, silently fail
  }
}

/**
 * Suggest search completions
 */
async function suggest(indexKey, prefix, size = 5) {
  const es = await getClient();
  if (!es || prefix.length < 2) return [];

  const config = INDICES[indexKey];
  if (!config) return [];

  try {
    const result = await es.search({
      index: config.name,
      body: {
        size: 0,
        suggest: {
          title_suggest: {
            prefix,
            completion: {
              field: 'title.suggest',
              size,
              skip_duplicates: true
            }
          }
        }
      }
    });

    return result.suggest.title_suggest[0]?.options.map(o => o.text) || [];
  } catch (error) {
    return [];
  }
}

/**
 * Get similar documents (More Like This)
 */
async function findSimilar(indexKey, documentId, size = 5) {
  const es = await getClient();
  if (!es) return [];

  const config = INDICES[indexKey];
  if (!config) return [];

  try {
    const result = await es.search({
      index: config.name,
      body: {
        size,
        query: {
          more_like_this: {
            fields: getSearchFields(indexKey).map(f => f.replace(/\^\d+$/, '')),
            like: [{ _index: config.name, _id: String(documentId) }],
            min_term_freq: 1,
            min_doc_freq: 1,
            max_query_terms: 12
          }
        }
      }
    });

    return result.hits.hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      ...hit._source
    }));
  } catch (error) {
    logger.error('Find similar failed', { indexKey, documentId, error: error.message });
    return [];
  }
}

/**
 * Sync all data from database to Elasticsearch
 */
async function syncAll() {
  const results = {};

  // Sync jobs
  const jobs = await prisma.job.findMany({
    where: { isActive: true },
    include: {
      user: { select: { companyProfile: { select: { companyName: true } } } },
      skills: { include: { skill: true } }
    }
  });

  const jobDocs = jobs.map(job => ({
    id: job.id,
    title: job.title,
    description: job.description,
    company: job.user?.companyProfile?.companyName || 'Company',
    companyId: job.userId,
    location: job.location,
    employment: job.employment,
    salaryLow: job.salaryLow,
    salaryHigh: job.salaryHigh,
    skills: job.skills?.map(s => s.skill?.name).filter(Boolean) || [],
    industry: job.industry,
    experienceLevel: job.experienceLevel,
    isRemote: job.isRemote || false,
    isIndigenousFocused: job.isIndigenousFocused || false,
    isFeatured: job.isFeatured || false,
    isActive: job.isActive,
    postedAt: job.postedAt,
    expiresAt: job.expiresAt,
    viewCount: job.viewCount || 0,
    applicationCount: job._count?.applications || 0
  }));

  (results as any).jobs = await bulkIndex('jobs', jobDocs);

  // Sync courses
  const courses = await prisma.course.findMany({
    where: { isActive: true },
    include: { skills: { include: { skill: true } } }
  });

  const courseDocs = courses.map(course => ({
    id: course.id,
    title: course.title,
    description: course.description,
    category: course.category,
    provider: course.providerName,
    providerId: course.providerId,
    duration: course.duration,
    qualification: course.qualification,
    skills: course.skills?.map(s => s.skill?.name).filter(Boolean) || [],
    priceInCents: course.priceInCents || 0,
    isFree: !course.priceInCents || course.priceInCents === 0,
    isOnline: course.isOnline || false,
    isAccredited: course.isAccredited || false,
    isActive: course.isActive,
    rating: course.averageRating || 0,
    enrollmentCount: course._count?.enrollments || 0
  }));

  (results as any).courses = await bulkIndex('courses', courseDocs);

  // Sync mentors
  const mentors = await prisma.mentorProfile.findMany({
    where: { active: true }
  });

  const mentorDocs = mentors.map(mentor => ({
    id: mentor.id,
    name: mentor.name,
    title: mentor.title,
    bio: mentor.bio,
    skills: mentor.skills ? mentor.skills.split(',').map(s => s.trim()) : [],
    industry: mentor.industry,
    location: mentor.location,
    yearsExperience: mentor.yearsExperience || 0,
    isActive: mentor.active,
    isAvailable: mentor.isAvailable !== false,
    isFeatured: mentor.isFeatured || false,
    rating: mentor.averageRating || 0,
    sessionCount: mentor.sessionCount || 0,
    specializations: mentor.specializations ? 
      mentor.specializations.split(',').map(s => s.trim()) : []
  }));

  (results as any).mentors = await bulkIndex('mentors', mentorDocs);

  // Sync forum threads
  const threads = await prisma.forumThread.findMany({
    where: { isPublished: true },
    include: { author: { select: { name: true } } }
  });

  const threadDocs = threads.map(thread => ({
    id: thread.id,
    title: thread.title,
    content: thread.content,
    category: thread.category,
    authorId: thread.authorId,
    authorName: thread.author?.name || 'Anonymous',
    tags: thread.tags ? thread.tags.split(',').map(t => t.trim()) : [],
    isPinned: thread.isPinned || false,
    isLocked: thread.isLocked || false,
    viewCount: thread.viewCount || 0,
    replyCount: thread.replyCount || 0,
    likeCount: thread.likeCount || 0,
    createdAt: thread.createdAt,
    lastActivityAt: thread.lastActivityAt || thread.createdAt
  }));

  (results as any).forums = await bulkIndex('forums', threadDocs);

  return results;
}

/**
 * Health check
 */
async function health() {
  const es = await getClient();
  if (!es) {
    return { status: 'unavailable', message: 'Elasticsearch not connected' };
  }

  try {
    const health = await es.cluster.health();
    return {
      status: health.status,
      cluster: health.cluster_name,
      nodes: health.number_of_nodes,
      indices: health.active_shards
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}


