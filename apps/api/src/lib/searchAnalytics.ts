// @ts-nocheck
'use strict';

/**
 * Search Analytics
 * Step 38: Track and analyze search behavior
 * 
 * Provides:
 * - Search query tracking
 * - Zero-result analysis
 * - Search-to-application conversion monitoring
 * - Popular searches reporting
 * - Search trends visualization data
 */

const { prisma } = require('../db');
const logger = require('./logger');
const redisCache = require('./redisCache');

/**
 * Track a search query
 * @param {object} data - Search tracking data
 */
async function trackSearch(data) {
  const {
    query,
    indexType,
    searchType = 'keyword',
    resultCount = 0,
    userId = null,
    sessionId = null,
    userAgent = null,
    duration = null
  } = data;

  try {
    await prisma.searchLog.create({
      data: {
        query: query?.slice(0, 500), // Limit query length
        indexType,
        searchType,
        resultCount,
        userId,
        sessionId,
        userAgent: userAgent?.slice(0, 500),
        duration
      }
    });

    // Update popular searches cache
    await incrementPopularSearch(query, indexType);

    // Track zero-result searches
    if (resultCount === 0) {
      await trackZeroResult(query, indexType);
    }
  } catch (error) {
    // Don't fail the request if analytics fails
    logger.warn('Search tracking failed', { query, error: error.message });
  }
}

/**
 * Track when a user clicks on a search result
 * @param {string} searchLogId - Original search log ID
 * @param {string} clickedId - ID of clicked document
 * @param {number} position - Position in results (1-based)
 */
async function trackClick(searchLogId, clickedId, position) {
  try {
    await prisma.searchLog.update({
      where: { id: searchLogId },
      data: {
        clickedId,
        clickPosition: position
      }
    });
  } catch (error) {
    logger.warn('Click tracking failed', { searchLogId, error: error.message });
  }
}

/**
 * Increment popular search counter
 */
async function incrementPopularSearch(query, indexType) {
  if (!query || query.length < 2) return;

  const normalized = query.toLowerCase().trim();
  const cacheKey = `popular_search:${indexType}:${normalized}`;
  
  try {
    const current = await redisCache.get(cacheKey) || 0;
    await redisCache.set(cacheKey, current + 1, 86400 * 7); // 7 days
  } catch (error) {
    // Silent fail
  }
}

/**
 * Track zero-result search for analysis
 */
async function trackZeroResult(query, indexType) {
  const cacheKey = `zero_result:${indexType}:${query.toLowerCase().slice(0, 100)}`;
  
  try {
    const current = await redisCache.get(cacheKey) || 0;
    await redisCache.set(cacheKey, current + 1, 86400 * 30); // 30 days
  } catch (error) {
    // Silent fail
  }
}

/**
 * Get search analytics dashboard data
 * @param {object} options - Query options
 */
async function getDashboardData(options = {}) {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate = new Date(),
    indexType = null
  } = options;

  try {
    const whereClause = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (indexType) {
      whereClause.indexType = indexType;
    }

    // Total searches
    const totalSearches = await prisma.searchLog.count({ where: whereClause });

    // Searches with clicks
    const searchesWithClicks = await prisma.searchLog.count({
      where: { ...whereClause, clickedId: { not: null } }
    });

    // Zero result searches
    const zeroResultSearches = await prisma.searchLog.count({
      where: { ...whereClause, resultCount: 0 }
    });

    // Average results per search
    const avgResults = await prisma.searchLog.aggregate({
      where: whereClause,
      _avg: { resultCount: true, duration: true },
      _max: { resultCount: true, duration: true }
    });

    // Searches by index type
    const byIndexType = await prisma.searchLog.groupBy({
      by: ['indexType'],
      where: whereClause,
      _count: true
    });

    // Searches by search type
    const bySearchType = await prisma.searchLog.groupBy({
      by: ['searchType'],
      where: whereClause,
      _count: true
    });

    // Daily search volume
    const dailyVolume = await getDailySearchVolume(startDate, endDate, indexType);

    // Click-through rate by position
    const ctrByPosition = await getCTRByPosition(whereClause);

    return {
      summary: {
        totalSearches,
        searchesWithClicks,
        clickThroughRate: totalSearches > 0 
          ? Math.round((searchesWithClicks / totalSearches) * 100) 
          : 0,
        zeroResultRate: totalSearches > 0 
          ? Math.round((zeroResultSearches / totalSearches) * 100) 
          : 0,
        averageResults: Math.round(avgResults._avg.resultCount || 0),
        averageDuration: Math.round(avgResults._avg.duration || 0)
      },
      byIndexType: byIndexType.map(r => ({
        type: r.indexType,
        count: typeof r._count === 'number' ? r._count : r._count._all
      })),
      bySearchType: bySearchType.map(r => ({
        type: r.searchType,
        count: typeof r._count === 'number' ? r._count : r._count._all
      })),
      dailyVolume,
      ctrByPosition,
      dateRange: { startDate, endDate }
    };
  } catch (error) {
    logger.error('Dashboard data error', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Get daily search volume for charts
 */
async function getDailySearchVolume(startDate, endDate, indexType = null) {
  try {
    const searches = await prisma.searchLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        ...(indexType ? { indexType } : {})
      },
      select: { createdAt: true, resultCount: true }
    });

    // Group by date
    const byDate = {};
    searches.forEach(s => {
      const date = s.createdAt.toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { total: 0, withResults: 0 };
      }
      byDate[date].total++;
      if (s.resultCount > 0) byDate[date].withResults++;
    });

    // Convert to array for charting
    return Object.entries(byDate)
      .map(([date, data]) => ({
        date,
        searches: data.total,
        successRate: Math.round((data.withResults / data.total) * 100)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    return [];
  }
}

/**
 * Get click-through rate by result position
 */
async function getCTRByPosition(whereClause) {
  try {
    const clicks = await prisma.searchLog.groupBy({
      by: ['clickPosition'],
      where: { ...whereClause, clickPosition: { not: null } },
      _count: true
    });

    const totalClicks = clicks.reduce((sum, c) => {
      const count = typeof c._count === 'number' ? c._count : c._count._all;
      return sum + count;
    }, 0);

    return clicks
      .filter(c => c.clickPosition && c.clickPosition <= 10)
      .map(c => ({
        position: c.clickPosition,
        clicks: typeof c._count === 'number' ? c._count : c._count._all,
        percentage: totalClicks > 0 
          ? Math.round(((typeof c._count === 'number' ? c._count : c._count._all) / totalClicks) * 100) 
          : 0
      }))
      .sort((a, b) => a.position - b.position);
  } catch (error) {
    return [];
  }
}

/**
 * Get popular searches
 * @param {string} indexType - Content type
 * @param {number} limit - Max results
 */
async function getPopularSearches(indexType = 'jobs', limit = 20) {
  try {
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const searches = await prisma.searchLog.groupBy({
      by: ['query'],
      where: {
        indexType,
        createdAt: { gte: lastWeek },
        query: { not: null },
        resultCount: { gt: 0 }
      },
      _count: true,
      orderBy: { _count: { query: 'desc' } },
      take: limit
    });

    return searches.map(s => ({
      query: s.query,
      count: typeof s._count === 'number' ? s._count : s._count.query
    }));
  } catch (error) {
    logger.error('Popular searches error', { error: error.message });
    return [];
  }
}

/**
 * Get zero-result searches for content improvement
 * @param {string} indexType - Content type
 * @param {number} limit - Max results
 */
async function getZeroResultSearches(indexType = 'jobs', limit = 50) {
  try {
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const searches = await prisma.searchLog.groupBy({
      by: ['query'],
      where: {
        indexType,
        createdAt: { gte: lastMonth },
        resultCount: 0,
        query: { not: null }
      },
      _count: true,
      orderBy: { _count: { query: 'desc' } },
      take: limit
    });

    return searches.map(s => ({
      query: s.query,
      occurrences: typeof s._count === 'number' ? s._count : s._count.query
    }));
  } catch (error) {
    logger.error('Zero result searches error', { error: error.message });
    return [];
  }
}

/**
 * Get search-to-application conversion data
 */
async function getSearchConversion(startDate, endDate) {
  try {
    // Get all job searches with clicks
    const searches = await prisma.searchLog.findMany({
      where: {
        indexType: 'jobs',
        createdAt: { gte: startDate, lte: endDate },
        clickedId: { not: null }
      },
      select: {
        userId: true,
        clickedId: true,
        createdAt: true
      }
    });

    if (searches.length === 0) {
      return {
        totalClicks: 0,
        conversions: 0,
        conversionRate: 0
      };
    }

    // Get applications for these job clicks
    const clickedJobIds = [...new Set(searches.map(s => s.clickedId))];
    const userIds = [...new Set(searches.filter(s => s.userId).map(s => s.userId))];

    const applications = await prisma.jobApplication.findMany({
      where: {
        jobId: { in: clickedJobIds },
        userId: { in: userIds },
        createdAt: { gte: startDate, lte: endDate }
      },
      select: { jobId: true, userId: true }
    });

    // Match searches to applications
    const applicationSet = new Set(
      applications.map(a => `${a.userId}:${a.jobId}`)
    );

    const conversions = searches.filter(s => 
      s.userId && applicationSet.has(`${s.userId}:${s.clickedId}`)
    ).length;

    return {
      totalClicks: searches.length,
      conversions,
      conversionRate: Math.round((conversions / searches.length) * 100)
    };
  } catch (error) {
    logger.error('Search conversion error', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Get search trends over time
 * @param {string} query - Search term to track
 * @param {number} days - Number of days to look back
 */
async function getSearchTrend(query, days = 30) {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const searches = await prisma.searchLog.findMany({
      where: {
        query: { contains: query, mode: 'insensitive' },
        createdAt: { gte: startDate }
      },
      select: { createdAt: true }
    });

    // Group by date
    const byDate = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      byDate[date] = 0;
    }

    searches.forEach(s => {
      const date = s.createdAt.toISOString().split('T')[0];
      if (byDate.hasOwnProperty(date)) {
        byDate[date]++;
      }
    });

    return Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    return [];
  }
}

/**
 * Get user search history
 * @param {string} userId - User ID
 * @param {number} limit - Max results
 */
async function getUserSearchHistory(userId, limit = 20) {
  try {
    const searches = await prisma.searchLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        query: true,
        indexType: true,
        resultCount: true,
        clickedId: true,
        createdAt: true
      }
    });

    return searches.map(s => ({
      query: s.query,
      type: s.indexType,
      results: s.resultCount,
      clicked: !!s.clickedId,
      date: s.createdAt
    }));
  } catch (error) {
    return [];
  }
}
