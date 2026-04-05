// @ts-nocheck
'use strict';

/**
 * Semantic Search Engine
 * Step 33: Embedding-based search using OpenAI
 * 
 * Provides:
 * - Document embedding generation using OpenAI
 * - Vector similarity search
 * - "Jobs like this" recommendations
 * - Query understanding and expansion
 * - Search suggestions based on semantics
 * - Hybrid search (keyword + semantic)
 */

const OpenAI = require('openai');
const { prisma } = require('../db');
const logger = require('./logger');
const redisCache = require('./redisCache');

// Configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const SIMILARITY_THRESHOLD = 0.7;
const MAX_BATCH_SIZE = 100;

// OpenAI client
let openai = null;

/**
 * Initialize OpenAI client
 */
function initClient() {
  if (openai) return openai;
  
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('OpenAI API key not configured - semantic search disabled');
    return null;
  }

  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  return openai;
}

/**
 * Check if semantic search is available
 */
function isAvailable() {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Generate embedding for text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
async function generateEmbedding(text) {
  const client = initClient();
  if (!client || !text) return null;

  // Check cache first
  const cacheKey = `embedding:${Buffer.from(text).toString('base64').slice(0, 100)}`;
  const cached = await redisCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // Token limit
      dimensions: EMBEDDING_DIMENSIONS
    });

    const embedding = response.data[0].embedding;
    
    // Cache for 24 hours
    await redisCache.set(cacheKey, embedding, 86400);
    
    return embedding;
  } catch (error) {
    logger.error('Embedding generation failed', { error: error.message });
    return null;
  }
}

/**
 * Generate embeddings for multiple texts
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
async function generateBatchEmbeddings(texts) {
  const client = initClient();
  if (!client || !texts.length) return [];

  try {
    const batches = [];
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE);
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch.map(t => t.slice(0, 8000)),
        dimensions: EMBEDDING_DIMENSIONS
      });
      batches.push(...response.data.map(d => d.embedding));
    }
    return batches;
  } catch (error) {
    logger.error('Batch embedding generation failed', { error: error.message });
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Similarity score (0-1)
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Find documents similar to a query
 * @param {string} query - Search query
 * @param {string} indexType - Type of content (jobs, courses, mentors, forums)
 * @param {object} options - Search options
 * @returns {Promise<object[]>} Similar documents with scores
 */
async function semanticSearch(query, indexType, options = {}) {
  const {
    limit = 10,
    minSimilarity = SIMILARITY_THRESHOLD,
    filters = {},
    userId = null
  } = options;

  if (!isAvailable()) {
    logger.info('Semantic search not available, using fallback');
    return { results: [], fallback: true };
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    return { results: [], error: 'Failed to generate query embedding' };
  }

  // Get documents with embeddings from database
  const documents = await getDocumentsWithEmbeddings(indexType, filters);

  // Calculate similarity scores
  const scored = documents
    .filter(doc => doc.embedding)
    .map(doc => ({
      ...doc,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding)
    }))
    .filter(doc => doc.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  // Track search for analytics
  if (userId) {
    trackSemanticSearch(query, indexType, scored.length, userId);
  }

  return {
    results: scored.map(doc => ({
      id: doc.id,
      score: Math.round(doc.similarity * 100),
      ...sanitizeDocument(doc)
    })),
    query,
    total: scored.length
  };
}

/**
 * Get documents with embeddings from database
 * @param {string} indexType - Content type
 * @param {object} filters - Query filters
 */
async function getDocumentsWithEmbeddings(indexType, filters = {}) {
  const modelMap = {
    jobs: 'job',
    courses: 'course',
    mentors: 'mentorProfile',
    forums: 'forumThread'
  };

  const model = modelMap[indexType];
  if (!model) return [];

  try {
    const where = { isActive: true, ...filters };
    const documents = await prisma[model].findMany({
      where,
      take: 500, // Limit for performance
      orderBy: { createdAt: 'desc' }
    });

    // If documents don't have embeddings, generate them on the fly
    const docsWithEmbeddings = await Promise.all(
      documents.map(async doc => {
        const text = getSearchableText(doc, indexType);
        let embedding = doc.embedding;

        if (!embedding) {
          embedding = await generateEmbedding(text);
          // Optionally store embedding back to database
          if (embedding) {
            await storeEmbedding(model, doc.id, embedding);
          }
        }

        return { ...doc, embedding };
      })
    );

    return docsWithEmbeddings;
  } catch (error) {
    logger.error('Failed to get documents with embeddings', { indexType, error: error.message });
    return [];
  }
}

/**
 * Get searchable text from document
 */
function getSearchableText(doc, indexType) {
  switch (indexType) {
    case 'jobs':
      return [
        doc.title,
        doc.description,
        doc.location,
        doc.company,
        doc.skills?.join(' ')
      ].filter(Boolean).join(' ');

    case 'courses':
      return [
        doc.title,
        doc.description,
        doc.category,
        doc.provider,
        doc.qualification
      ].filter(Boolean).join(' ');

    case 'mentors':
      return [
        doc.name,
        doc.title,
        doc.bio,
        doc.skills,
        doc.industry
      ].filter(Boolean).join(' ');

    case 'forums':
      return [
        doc.title,
        doc.content,
        doc.category,
        doc.tags
      ].filter(Boolean).join(' ');

    default:
      return doc.title || doc.name || '';
  }
}

/**
 * Store embedding in database
 */
async function storeEmbedding(model, id, embedding) {
  try {
    await prisma[model].update({
      where: { id },
      data: { 
        embedding: JSON.stringify(embedding),
        embeddingUpdatedAt: new Date()
      }
    });
  } catch (error) {
    // Embedding column might not exist, silently fail
  }
}

/**
 * Sanitize document for output
 */
function sanitizeDocument(doc) {
  const { embedding, ...rest } = doc;
  return rest;
}

/**
 * Find similar jobs (Step 33: "Jobs like this")
 * @param {string} jobId - Reference job ID
 * @param {object} options - Search options
 */
async function findSimilarJobs(jobId, options = {}) {
  const { limit = 5, excludeSameCompany = true } = options;

  try {
    // Get the reference job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { skills: true }
    });

    if (!job) {
      return { results: [], error: 'Job not found' };
    }

    // Build search text from job
    const searchText = getSearchableText(job, 'jobs');

    // Find similar
    const result = await semanticSearch(searchText, 'jobs', {
      limit: limit + 1, // Get extra to filter out self
      minSimilarity: 0.6
    });

    // Filter out the reference job and optionally same company
    const filtered = result.results
      .filter(r => r.id !== jobId)
      .filter(r => !excludeSameCompany || r.userId !== job.userId)
      .slice(0, limit);

    return {
      referenceJob: {
        id: job.id,
        title: job.title,
        company: job.company
      },
      similarJobs: filtered
    };
  } catch (error) {
    logger.error('Find similar jobs failed', { jobId, error: error.message });
    return { results: [], error: error.message };
  }
}

/**
 * Query understanding - expand query with related terms
 * @param {string} query - Original query
 */
async function expandQuery(query) {
  const client = initClient();
  if (!client) return { original: query, expanded: query, terms: [] };

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a job search assistant. Given a search query, expand it with related job titles, skills, and industry terms. Return JSON with: original, expandedQuery, relatedTerms (array). Keep responses concise and relevant to Australian Indigenous employment context.`
        },
        {
          role: 'user',
          content: query
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      original: query,
      expanded: result.expandedQuery || query,
      terms: result.relatedTerms || []
    };
  } catch (error) {
    logger.error('Query expansion failed', { error: error.message });
    return { original: query, expanded: query, terms: [] };
  }
}

/**
 * Generate search suggestions
 * @param {string} prefix - User's partial query
 * @param {string} indexType - Content type
 */
async function generateSuggestions(prefix, indexType, limit = 5) {
  if (prefix.length < 2) return [];

  // First try database suggestions
  const dbSuggestions = await getDatabaseSuggestions(prefix, indexType, limit);
  if (dbSuggestions.length >= limit) {
    return dbSuggestions;
  }

  // Supplement with AI suggestions if needed
  const client = initClient();
  if (!client) return dbSuggestions;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Generate ${limit - dbSuggestions.length} search suggestions for ${indexType} related to the prefix. Return JSON array of strings. Context: Australian Indigenous employment platform.`
        },
        {
          role: 'user',
          content: prefix
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 100
    });

    const aiSuggestions = JSON.parse(response.choices[0].message.content).suggestions || [];
    return [...new Set([...dbSuggestions, ...aiSuggestions])].slice(0, limit);
  } catch (error) {
    return dbSuggestions;
  }
}

/**
 * Get suggestions from database
 */
async function getDatabaseSuggestions(prefix, indexType, limit) {
  const modelMap = {
    jobs: 'job',
    courses: 'course',
    mentors: 'mentorProfile',
    forums: 'forumThread'
  };

  const model = modelMap[indexType];
  if (!model) return [];

  try {
    const results = await prisma[model].findMany({
      where: {
        isActive: true,
        title: { startsWith: prefix, mode: 'insensitive' }
      },
      select: { title: true },
      take: limit,
      distinct: ['title']
    });

    return results.map(r => r.title);
  } catch (error) {
    return [];
  }
}

/**
 * Hybrid search - combine keyword and semantic
 * @param {string} query - Search query
 * @param {string} indexType - Content type
 * @param {object} options - Search options
 */
async function hybridSearch(query, indexType, options = {}) {
  const { keywordWeight = 0.5, semanticWeight = 0.5, limit = 10 } = options;

  // Import elasticsearch for keyword search
  const es = require('./elasticsearch');

  // Run both searches in parallel
  const [keywordResults, semanticResults] = await Promise.all([
    es.search(indexType, { query, size: limit * 2, ...options }),
    semanticSearch(query, indexType, { limit: limit * 2, ...options })
  ]);

  // Combine and re-rank results
  const combinedScores = new Map();

  // Add keyword results
  keywordResults.results?.forEach((result, index) => {
    const normalizedScore = 1 - (index / keywordResults.results.length);
    combinedScores.set(result.id, {
      ...result,
      keywordScore: normalizedScore,
      semanticScore: 0,
      combinedScore: normalizedScore * keywordWeight
    });
  });

  // Add semantic results
  semanticResults.results?.forEach((result, index) => {
    const normalizedScore = result.score / 100;
    const existing = combinedScores.get(result.id);
    
    if (existing) {
      existing.semanticScore = normalizedScore;
      existing.combinedScore = 
        (existing.keywordScore * keywordWeight) + 
        (normalizedScore * semanticWeight);
    } else {
      combinedScores.set(result.id, {
        ...result,
        keywordScore: 0,
        semanticScore: normalizedScore,
        combinedScore: normalizedScore * semanticWeight
      });
    }
  });

  // Sort by combined score and return top results
  const ranked = Array.from(combinedScores.values())
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit)
    .map(({ keywordScore, semanticScore, combinedScore, ...doc }) => ({
      ...doc,
      score: Math.round(combinedScore * 100),
      keywordRelevance: Math.round(keywordScore * 100),
      semanticRelevance: Math.round(semanticScore * 100)
    }));

  return {
    results: ranked,
    total: ranked.length,
    mode: 'hybrid'
  };
}

/**
 * Track semantic search for analytics
 */
async function trackSemanticSearch(query, indexType, resultCount, userId) {
  try {
    await prisma.searchLog.create({
      data: {
        query,
        indexType,
        resultCount,
        userId,
        searchType: 'semantic',
        createdAt: new Date()
      }
    });
  } catch (error) {
    // Silent fail if table doesn't exist
  }
}

/**
 * Batch update embeddings for all documents
 * @param {string} indexType - Content type to update
 */
async function updateAllEmbeddings(indexType) {
  const modelMap = {
    jobs: 'job',
    courses: 'course',
    mentors: 'mentorProfile',
    forums: 'forumThread'
  };

  const model = modelMap[indexType];
  if (!model) return { success: 0, failed: 0 };

  try {
    const documents = await prisma[model].findMany({
      where: { isActive: true }
    });

    let success = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < documents.length; i += MAX_BATCH_SIZE) {
      const batch = documents.slice(i, i + MAX_BATCH_SIZE);
      const texts = batch.map(doc => getSearchableText(doc, indexType));
      const embeddings = await generateBatchEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        if (embeddings[j]) {
          await storeEmbedding(model, batch[j].id, embeddings[j]);
          success++;
        } else {
          failed++;
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { success, failed };
  } catch (error) {
    logger.error('Batch embedding update failed', { indexType, error: error.message });
    return { success: 0, failed: 0 };
  }
}
