/**
 * API Version Router
 * 
 * Provides versioned API endpoints (/v1/, /v2/, etc.)
 * Maintains backward compatibility while allowing API evolution.
 */

import express from 'express';

/**
 * Create a versioned API router
 * @param {object} options - Configuration options
 * @param {string} options.version - Version string (e.g., 'v1')
 * @param {boolean} options.deprecated - Whether this version is deprecated
 * @param {string} options.sunset - ISO date when this version will be removed
 */
export function createVersionRouter(options: any = {}) {
  const router = express.Router();
  const { version = 'v1', deprecated = false, sunset = null } = options;

  // Add version headers to all responses
  router.use((req, res, next) => {
    res.setHeader('X-API-Version', version);
    
    if (deprecated) {
      res.setHeader('Deprecation', 'true');
      if (sunset) {
        res.setHeader('Sunset', sunset);
      }
      // Add warning header
      res.setHeader(
        'Warning',
        `299 - "This API version is deprecated. Please migrate to a newer version."`
      );
    }

    // Store version info on request for route handlers
    req.apiVersion = version;
    req.apiDeprecated = deprecated;
    
    next();
  });

  return router;
}

/**
 * Version negotiation middleware
 * Supports version via path, header, or query parameter
 */
export function versionNegotiation(defaultVersion = 'v1') {
  return (req, res, next) => {
    // Check for version in various places
    const headerVersion = req.get('X-API-Version') || req.get('API-Version');
    const queryVersion = req.query.api_version;
    const acceptVersion = parseAcceptVersionHeader(req.get('Accept'));

    // Priority: path > header > query > accept > default
    // Path version is handled by route mounting
    req.requestedVersion = headerVersion || queryVersion || acceptVersion || defaultVersion;
    
    next();
  };
}

/**
 * Parse version from Accept header
 * e.g., application/vnd.ngurra+json; version=1
 */
function parseAcceptVersionHeader(accept) {
  if (!accept) return null;
  
  const versionMatch = accept.match(/version=(\d+)/i);
  if (versionMatch) {
    return `v${versionMatch[1]}`;
  }
  
  return null;
}

/**
 * Create deprecation warning response
 */
export function deprecationResponse(oldEndpoint, newEndpoint, sunsetDate) {
  return {
    warning: 'This endpoint is deprecated',
    deprecated_endpoint: oldEndpoint,
    replacement_endpoint: newEndpoint,
    sunset_date: sunsetDate,
    documentation: 'https://api.ngurrapathways.com.au/docs',
  };
}

/**
 * Middleware to track API version usage for analytics
 */
export function trackVersionUsage(analyticsClient) {
  return (req, res, next) => {
    const version = req.apiVersion || 'unknown';
    const endpoint = req.path;
    const method = req.method;
    
    // Non-blocking analytics
    setImmediate(() => {
      try {
        if (analyticsClient) {
          analyticsClient.track({
            event: 'api_version_usage',
            properties: {
              version,
              endpoint,
              method,
              userId: req.user?.id || 'anonymous',
              timestamp: new Date().toISOString(),
            },
          });
        }
      } catch (err) {
        console.error('Failed to track version usage:', err.message);
      }
    });

    next();
  };
}

/**
 * Standard API response envelope
 * Ensures consistent response format across all versions
 */
export function apiResponse(data, options: any = {}) {
  const { 
    meta = {}, 
    links = {}, 
    included = [],
    warnings = [],
  } = options;

  const response: any = {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  if (Object.keys(links).length > 0) {
    response.links = links;
  }

  if (included.length > 0) {
    response.included = included;
  }

  if (warnings.length > 0) {
    response.warnings = warnings;
  }

  return response;
}

/**
 * Standard API error response
 */
export function apiError(code, message, details = {}) {
  return {
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      ...details,
    },
  };
}

/**
 * Pagination helper
 */
export function paginationMeta(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Pagination links helper
 */
export function paginationLinks(baseUrl, page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  const links: any = {
    self: `${baseUrl}?page=${page}&limit=${limit}`,
    first: `${baseUrl}?page=1&limit=${limit}`,
    last: `${baseUrl}?page=${totalPages}&limit=${limit}`,
  };

  if (page < totalPages) {
    links.next = `${baseUrl}?page=${page + 1}&limit=${limit}`;
  }

  if (page > 1) {
    links.prev = `${baseUrl}?page=${page - 1}&limit=${limit}`;
  }

  return links;
}

// Default pagination values
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Parse and validate pagination parameters
 */
export function parsePagination(query) {
  let page = parseInt(query.page, 10) || DEFAULT_PAGE;
  let limit = parseInt(query.limit, 10) || DEFAULT_LIMIT;

  // Enforce bounds
  page = Math.max(1, page);
  limit = Math.min(Math.max(1, limit), MAX_LIMIT);

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}



export {};

