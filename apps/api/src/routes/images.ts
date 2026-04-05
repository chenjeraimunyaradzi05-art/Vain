/**
 * Image Optimization Route
 * 
 * Provides on-the-fly image resizing, format conversion, and optimization.
 * Supports responsive images and modern formats like WebP and AVIF.
 */

const express = require('express');
const router = express.Router();
const {
  optimizeImage,
  validateImage,
  getContentType,
  IMAGE_PRESETS,
  OUTPUT_FORMATS,
} = require('../lib/imageOptimizer');
const { get: cacheGet, set: cacheSet } = require('../lib/redisCache');

/**
 * GET /_image/:imageId
 * 
 * Optimized image serving with query parameters for customization.
 * 
 * Query params:
 * - width: Target width (1-2000)
 * - height: Target height (1-2000)
 * - preset: Preset name (thumbnail, avatar, card, banner, full)
 * - format: Output format (webp, avif, jpeg, png)
 * - quality: Quality 1-100
 * - fit: Fit mode (cover, contain, fill, inside, outside)
 * - blur: Blur radius (1-250)
 * - grayscale: Apply grayscale (true/false)
 */
router.get('/:imageId', async (req, res) => {
  const { imageId } = req.params;
  const {
    width,
    height,
    preset = 'full',
    format,
    quality,
    fit,
    blur,
    grayscale,
  } = req.query;

  try {
    // Validate preset
    if (preset && !IMAGE_PRESETS[preset]) {
      return void res.status(400).json({
        error: 'Invalid preset',
        valid_presets: Object.keys(IMAGE_PRESETS),
      });
    }

    // Validate format
    const acceptHeader = req.get('Accept') || '';
    let outputFormat = format;
    
    // Auto-detect format from Accept header if not specified
    if (!outputFormat) {
      if (acceptHeader.includes('image/avif')) {
        outputFormat = 'avif';
      } else if (acceptHeader.includes('image/webp')) {
        outputFormat = 'webp';
      } else {
        outputFormat = 'jpeg';
      }
    }

    if (!OUTPUT_FORMATS.includes(outputFormat)) {
      return void res.status(400).json({
        error: 'Invalid format',
        valid_formats: OUTPUT_FORMATS,
      });
    }

    // Build cache key
    const cacheKey = `img:${imageId}:${preset}:${width || 'auto'}x${height || 'auto'}:${outputFormat}:${quality || 'default'}:${fit || 'default'}:${blur || '0'}:${grayscale || 'false'}`;

    // Check cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', getContentType(outputFormat));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return void res.send(Buffer.from(cached.buffer, 'base64'));
    }

    // Fetch image from database storage (with Redis cache layer above)
    // Future enhancement: Add S3/Cloudinary CDN integration for production scale
    const { prisma } = require('../db');
    
    const image = await prisma.upload.findUnique({
      where: { id: imageId },
      select: { data: true, mimeType: true, filename: true },
    });

    if (!image) {
      return void res.status(404).json({ error: 'Image not found' });
    }

    // Get the image buffer
    // If stored as base64 in database:
    const imageBuffer = Buffer.from(image.data, 'base64');
    
    // Or if stored as binary:
    // const imageBuffer = image.data;

    // Validate image
    const validation = await validateImage(imageBuffer);
    if (!validation.valid) {
      return void res.status(400).json({ error: 'Invalid image', details: validation.errors });
    }

    // Optimize image
    const result = await optimizeImage(imageBuffer, {
      preset,
      format: outputFormat,
      width: width ? parseInt(width, 10) : undefined,
      height: height ? parseInt(height, 10) : undefined,
      fit,
      quality: quality ? parseInt(quality, 10) : undefined,
      blur: blur ? parseInt(blur, 10) : undefined,
      grayscale: grayscale === 'true',
    });

    // Cache the result (store as base64 for JSON compatibility)
    await cacheSet(cacheKey, {
      buffer: result.buffer.toString('base64'),
      info: result.info,
    }, 86400); // Cache for 24 hours

    // Send response
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Content-Type', getContentType(outputFormat));
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Vary', 'Accept');
    
    // Add optimization info headers
    res.setHeader('X-Original-Size', result.info.originalSize);
    res.setHeader('X-Optimized-Size', result.info.size);
    res.setHeader('X-Compression-Ratio', `${result.info.compressionRatio.toFixed(1)}%`);

    res.send(result.buffer);
  } catch (error) {
    console.error('[ImageRoute] Error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

/**
 * GET /_image/:imageId/metadata
 * 
 * Get image metadata without downloading the image.
 */
router.get('/:imageId/metadata', async (req, res) => {
  const { imageId } = req.params;

  try {
    const { prisma } = require('../db');
    
    const image = await prisma.upload.findUnique({
      where: { id: imageId },
      select: { 
        id: true,
        filename: true, 
        mimeType: true, 
        size: true,
        createdAt: true,
      },
    });

    if (!image) {
      return void res.status(404).json({ error: 'Image not found' });
    }

    // Generate srcset URLs
    const baseUrl = `${req.protocol}://${req.get('host')}/_image/${imageId}`;
    const srcset = {
      thumbnail: `${baseUrl}?preset=thumbnail`,
      avatar: `${baseUrl}?preset=avatar`,
      card: `${baseUrl}?preset=card`,
      banner: `${baseUrl}?preset=banner`,
      full: `${baseUrl}?preset=full`,
      webp: `${baseUrl}?format=webp`,
      avif: `${baseUrl}?format=avif`,
    };

    res.json({
      id: image.id,
      filename: image.filename,
      mimeType: image.mimeType,
      size: image.size,
      createdAt: image.createdAt,
      urls: srcset,
      presets: Object.keys(IMAGE_PRESETS),
      formats: OUTPUT_FORMATS,
    });
  } catch (error) {
    console.error('[ImageRoute] Metadata error:', error);
    res.status(500).json({ error: 'Failed to get image metadata' });
  }
});

/**
 * POST /_image/optimize
 * 
 * Optimize an uploaded image and return variants.
 * Requires authentication.
 */
router.post('/optimize', async (req, res) => {
  try {
    // Expect multipart form data with 'image' field
    // This would use multer or similar middleware
    if (!req.file) {
      return void res.status(400).json({ error: 'No image file provided' });
    }

    const imageBuffer = req.file.buffer;

    // Validate
    const validation = await validateImage(imageBuffer, {
      maxSize: 10 * 1024 * 1024, // 10MB limit
      allowedFormats: ['jpeg', 'jpg', 'png', 'webp'],
    });

    if (!validation.valid) {
      return void res.status(400).json({
        error: 'Invalid image',
        details: validation.errors,
      });
    }

    // Generate variants
    const { generateVariants, generatePlaceholder } = require('../lib/imageOptimizer');
    
    const [variants, placeholder] = await Promise.all([
      generateVariants(imageBuffer, ['thumbnail', 'card', 'full'], 'webp'),
      generatePlaceholder(imageBuffer),
    ]);

    // Return variant info (not the actual buffers - those would go to storage)
    res.json({
      success: true,
      original: validation.metadata,
      placeholder,
      variants: Object.fromEntries(
        // @ts-ignore
        Object.entries(variants).map(([name, { info }]) => [name, info])
      ),
    });
  } catch (error) {
    console.error('[ImageRoute] Optimize error:', error);
    res.status(500).json({ error: 'Failed to optimize image' });
  }
});

export default router;


