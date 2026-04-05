// @ts-nocheck
/**
 * Image Optimization Utilities
 * 
 * Handles image resizing, format conversion, and optimization
 * for user uploads and dynamic image serving.
 */

let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.warn('Sharp module not installed. Image optimization will be disabled.');
  sharp = null;
}
const path = require('path');

// Supported image formats
const SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif'];
const OUTPUT_FORMATS = ['webp', 'avif', 'jpeg', 'png'];

// Preset image sizes
const IMAGE_PRESETS = {
  thumbnail: { width: 150, height: 150, fit: 'cover' },
  avatar: { width: 200, height: 200, fit: 'cover' },
  card: { width: 400, height: 300, fit: 'cover' },
  banner: { width: 1200, height: 400, fit: 'cover' },
  full: { width: 1920, height: 1080, fit: 'inside' },
  original: null, // No resizing
};

// Quality settings per format
const QUALITY_SETTINGS = {
  webp: { quality: 80, effort: 4 },
  avif: { quality: 65, effort: 4 },
  jpeg: { quality: 80, progressive: true },
  png: { compressionLevel: 8 },
};

/**
 * Optimize and resize an image
 * @param {Buffer} input - Image buffer
 * @param {object} options - Optimization options
 * @returns {Promise<{buffer: Buffer, info: object}>}
 */
async function optimizeImage(input, options = {}) {
  if (!sharp) {
    throw new Error('Image optimization is not available. Sharp module is not installed.');
  }
  
  const {
    preset = 'full',
    format = 'webp',
    width,
    height,
    fit = 'inside',
    quality,
    blur,
    grayscale = false,
    rotate,
  } = options;

  // Get preset dimensions or use custom
  const presetConfig = IMAGE_PRESETS[preset];
  const targetWidth = width || presetConfig?.width;
  const targetHeight = height || presetConfig?.height;
  const targetFit = fit || presetConfig?.fit || 'inside';

  // Validate format
  const outputFormat = OUTPUT_FORMATS.includes(format) ? format : 'webp';
  const qualitySettings = {
    ...QUALITY_SETTINGS[outputFormat],
    ...(quality && { quality }),
  };

  let pipeline = sharp(input);

  // Get original metadata
  const metadata = await pipeline.metadata();

  // Apply rotation if specified (or from EXIF)
  if (rotate !== undefined) {
    pipeline = pipeline.rotate(rotate);
  } else {
    // Auto-rotate based on EXIF
    pipeline = pipeline.rotate();
  }

  // Resize if dimensions specified
  if (targetWidth || targetHeight) {
    pipeline = pipeline.resize(targetWidth, targetHeight, {
      fit: targetFit,
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }

  // Apply blur if specified
  if (blur) {
    const blurAmount = typeof blur === 'number' ? blur : 10;
    pipeline = pipeline.blur(blurAmount);
  }

  // Apply grayscale if specified
  if (grayscale) {
    pipeline = pipeline.grayscale();
  }

  // Convert to output format
  switch (outputFormat) {
    case 'webp':
      pipeline = pipeline.webp(qualitySettings);
      break;
    case 'avif':
      pipeline = pipeline.avif(qualitySettings);
      break;
    case 'jpeg':
    case 'jpg':
      pipeline = pipeline.jpeg(qualitySettings);
      break;
    case 'png':
      pipeline = pipeline.png(qualitySettings);
      break;
  }

  const { data: buffer, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer,
    info: {
      width: info.width,
      height: info.height,
      format: info.format,
      size: buffer.length,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      originalFormat: metadata.format,
      originalSize: input.length,
      compressionRatio: (1 - buffer.length / input.length) * 100,
    },
  };
}

/**
 * Generate multiple image variants
 * @param {Buffer} input - Original image buffer
 * @param {string[]} presets - Array of preset names
 * @param {string} format - Output format
 * @returns {Promise<object>}
 */
async function generateVariants(input, presets = ['thumbnail', 'card', 'full'], format = 'webp') {
  const variants = {};

  await Promise.all(
    presets.map(async (preset) => {
      const result = await optimizeImage(input, { preset, format });
      variants[preset] = result;
    })
  );

  return variants;
}

/**
 * Generate a blurhash placeholder
 * @param {Buffer} input - Image buffer
 * @returns {Promise<string>}
 */
async function generatePlaceholder(input) {
  // Generate a tiny blurred version for inline preview
  const { buffer } = await optimizeImage(input, {
    width: 32,
    height: 32,
    fit: 'inside',
    format: 'jpeg',
    quality: 20,
    blur: 5,
  });

  // Return as base64 data URI
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

/**
 * Validate image dimensions and format
 * @param {Buffer} input - Image buffer
 * @param {object} constraints - Validation constraints
 * @returns {Promise<{valid: boolean, errors: string[]}>}
 */
async function validateImage(input, constraints = {}) {
  const {
    maxWidth = 10000,
    maxHeight = 10000,
    maxSize = 20 * 1024 * 1024, // 20MB
    minWidth = 10,
    minHeight = 10,
    allowedFormats = SUPPORTED_FORMATS,
    aspectRatio,
    aspectRatioTolerance = 0.1,
  } = constraints;

  const errors = [];

  try {
    const metadata = await sharp(input).metadata();

    // Check format
    if (!allowedFormats.includes(metadata.format)) {
      errors.push(`Invalid format: ${metadata.format}. Allowed: ${allowedFormats.join(', ')}`);
    }

    // Check dimensions
    if (metadata.width > maxWidth) {
      errors.push(`Image too wide: ${metadata.width}px (max: ${maxWidth}px)`);
    }
    if (metadata.height > maxHeight) {
      errors.push(`Image too tall: ${metadata.height}px (max: ${maxHeight}px)`);
    }
    if (metadata.width < minWidth) {
      errors.push(`Image too narrow: ${metadata.width}px (min: ${minWidth}px)`);
    }
    if (metadata.height < minHeight) {
      errors.push(`Image too short: ${metadata.height}px (min: ${minHeight}px)`);
    }

    // Check file size
    if (input.length > maxSize) {
      errors.push(`File too large: ${(input.length / 1024 / 1024).toFixed(2)}MB (max: ${(maxSize / 1024 / 1024).toFixed(2)}MB)`);
    }

    // Check aspect ratio
    if (aspectRatio) {
      const imageRatio = metadata.width / metadata.height;
      const targetRatio = aspectRatio;
      const diff = Math.abs(imageRatio - targetRatio);
      if (diff > aspectRatioTolerance) {
        errors.push(`Invalid aspect ratio: ${imageRatio.toFixed(2)} (expected: ${targetRatio})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: input.length,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
      },
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid image: ${error.message}`],
    };
  }
}

/**
 * Strip EXIF data for privacy
 * @param {Buffer} input - Image buffer
 * @returns {Promise<Buffer>}
 */
async function stripExif(input) {
  const { buffer } = await sharp(input)
    .rotate() // Auto-rotate first based on EXIF
    .withMetadata({ exif: {} }) // Remove EXIF
    .toBuffer({ resolveWithObject: true });
    
  return buffer;
}

/**
 * Create responsive image srcset
 * @param {string} baseUrl - Base image URL
 * @param {number[]} widths - Array of widths to generate
 * @returns {string}
 */
function generateSrcset(baseUrl, widths = [320, 640, 960, 1280, 1920]) {
  return widths
    .map((w) => `${baseUrl}?width=${w} ${w}w`)
    .join(', ');
}

/**
 * Get content type for format
 */
function getContentType(format) {
  const contentTypes = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
  };
  return contentTypes[format] || 'application/octet-stream';
}
