// @ts-nocheck
/**
 * CDN and Static Asset Configuration
 * 
 * Configures CDN for static assets, images, and uploads.
 * Supports Cloudflare, AWS CloudFront, and Bunny CDN.
 */

import logger from './logger';

// CDN Configuration
export const CDN_CONFIG = {
  // CDN provider ('cloudflare', 'cloudfront', 'bunny', 'none')
  provider: process.env.CDN_PROVIDER || 'none',
  
  // CDN base URLs
  baseUrl: process.env.CDN_BASE_URL || '',
  
  // Image CDN URL (for optimized images)
  imageUrl: process.env.CDN_IMAGE_URL || '',
  
  // Upload CDN URL
  uploadUrl: process.env.CDN_UPLOAD_URL || '',
  
  // Cache control settings
  cacheControl: {
    static: 'public, max-age=31536000, immutable', // 1 year for hashed assets
    images: 'public, max-age=2592000, s-maxage=31536000', // 30 days browser, 1 year CDN
    uploads: 'private, max-age=86400', // 1 day for user uploads
    api: 'private, no-cache, no-store, must-revalidate',
  },
};

/**
 * Get CDN URL for a static asset
 */
export function getStaticUrl(path) {
  if (!CDN_CONFIG.baseUrl) {
    return path;
  }
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${CDN_CONFIG.baseUrl}/${cleanPath}`;
}

/**
 * Get CDN URL for an image with optional transformations
 */
export function getImageUrl(path, options: any = {}) {
  const {
    width,
    height,
    quality = 80,
    format = 'auto',
  } = options;

  if (!CDN_CONFIG.imageUrl) {
    return path;
  }

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Build transformation string based on provider
  switch (CDN_CONFIG.provider) {
    case 'cloudflare':
      // Cloudflare Image Resizing format
      const cfParams = [];
      if (width) cfParams.push(`w=${width}`);
      if (height) cfParams.push(`h=${height}`);
      cfParams.push(`q=${quality}`);
      cfParams.push(`f=${format}`);
      return `${CDN_CONFIG.imageUrl}/cdn-cgi/image/${cfParams.join(',')}/${cleanPath}`;
      
    case 'cloudfront':
      // CloudFront with Lambda@Edge or CloudFront Functions
      const cfnParams = new URLSearchParams();
      if (width) cfnParams.set('w', width);
      if (height) cfnParams.set('h', height);
      cfnParams.set('q', quality);
      return `${CDN_CONFIG.imageUrl}/${cleanPath}?${cfnParams.toString()}`;
      
    case 'bunny':
      // Bunny CDN Image Processing
      const bunnyParams = [];
      if (width) bunnyParams.push(`width=${width}`);
      if (height) bunnyParams.push(`height=${height}`);
      bunnyParams.push(`quality=${quality}`);
      return `${CDN_CONFIG.imageUrl}/${cleanPath}?${bunnyParams.join('&')}`;
      
    default:
      return `${CDN_CONFIG.imageUrl}/${cleanPath}`;
  }
}

/**
 * Get CDN URL for user uploads
 */
export function getUploadUrl(path) {
  if (!CDN_CONFIG.uploadUrl) {
    return path;
  }
  
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${CDN_CONFIG.uploadUrl}/${cleanPath}`;
}

/**
 * Get appropriate Cache-Control header
 */
export function getCacheControl(type) {
  return CDN_CONFIG.cacheControl[type] || CDN_CONFIG.cacheControl.api;
}

/**
 * Express middleware to add CDN headers
 */
export function cdnHeadersMiddleware() {
  return (req, res, next) => {
    // Determine asset type based on path
    let cacheType = 'api';
    
    if (req.path.startsWith('/static/') || req.path.match(/\.(js|css|woff2?)$/)) {
      cacheType = 'static';
    } else if (req.path.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/)) {
      cacheType = 'images';
    } else if (req.path.startsWith('/uploads/')) {
      cacheType = 'uploads';
    }
    
    res.setHeader('Cache-Control', getCacheControl(cacheType));
    
    // Add CDN-specific headers
    if (CDN_CONFIG.provider === 'cloudflare') {
      res.setHeader('CDN-Cache-Control', getCacheControl(cacheType));
    }
    
    // Add Vary header for content negotiation
    if (cacheType === 'images') {
      res.setHeader('Vary', 'Accept');
    }
    
    next();
  };
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(path, widths = [320, 640, 960, 1280, 1920]) {
  return widths
    .map(w => `${getImageUrl(path, { width: w })} ${w}w`)
    .join(', ');
}

/**
 * Purge CDN cache for a path
 */
export async function purgeCache(paths) {
  if (!CDN_CONFIG.provider || CDN_CONFIG.provider === 'none') {
    logger.info('[CDN] No CDN configured, skipping cache purge');
    return { success: true, message: 'No CDN configured' };
  }

  try {
    switch (CDN_CONFIG.provider) {
      case 'cloudflare':
        return await purgeCloudflare(paths);
      case 'cloudfront':
        return await purgeCloudFront(paths);
      case 'bunny':
        return await purgeBunny(paths);
      default:
        logger.warn(`[CDN] Unknown provider: ${CDN_CONFIG.provider}`);
        return { success: false, message: 'Unknown CDN provider' };
    }
  } catch (error) {
    logger.error('[CDN] Cache purge failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Purge Cloudflare cache
 */
async function purgeCloudflare(paths) {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  
  if (!zoneId || !apiToken) {
    return { success: false, message: 'Cloudflare credentials not configured' };
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: paths.map(p => `${CDN_CONFIG.baseUrl}${p}`),
      }),
    }
  );

  const result: any = await response.json();
  return { success: result.success, result };
}

/**
 * Purge CloudFront cache
 */
async function purgeCloudFront(paths) {
  // Requires AWS SDK
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  
  if (!distributionId) {
    return { success: false, message: 'CloudFront distribution ID not configured' };
  }

  try {
    // @ts-ignore - Optional dependency
    const { CloudFrontClient, CreateInvalidationCommand } = await import('@aws-sdk/client-cloudfront');
    
    const client = new CloudFrontClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    
    const command = new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `purge-${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    });
    
    const result = await client.send(command);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Purge Bunny CDN cache
 */
async function purgeBunny(paths) {
  const apiKey = process.env.BUNNY_API_KEY;
  const pullZone = process.env.BUNNY_PULL_ZONE;
  
  if (!apiKey || !pullZone) {
    return { success: false, message: 'Bunny CDN credentials not configured' };
  }

  const results = await Promise.all(
    paths.map(async (path) => {
      const response = await fetch(
        `https://api.bunny.net/purge?url=${encodeURIComponent(`${CDN_CONFIG.baseUrl}${path}`)}`,
        {
          method: 'POST',
          headers: {
            'AccessKey': apiKey,
          },
        }
      );
      return response.ok;
    })
  );

  return { success: results.every(r => r), purged: results.filter(r => r).length };
}

/**
 * Get CDN health/status
 */
export function getCDNStatus() {
  return {
    provider: CDN_CONFIG.provider,
    configured: CDN_CONFIG.provider !== 'none',
    baseUrl: CDN_CONFIG.baseUrl || null,
    imageUrl: CDN_CONFIG.imageUrl || null,
    uploadUrl: CDN_CONFIG.uploadUrl || null,
  };
}



export {};
