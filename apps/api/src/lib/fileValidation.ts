/**
 * File Validation Utilities (Steps 36-38)
 * 
 * Secure file upload validation:
 * - Magic number (file signature) validation
 * - EXIF metadata stripping
 * - File size limits
 */

import crypto from 'crypto';

/**
 * Step 36: File signatures (magic numbers) for validation
 * Using hex signatures to verify actual file type, not just extension
 */
const FILE_SIGNATURES: Record<string, { signature: string; offset: number }[]> = {
  // Images
  'image/jpeg': [
    { signature: 'ffd8ffe0', offset: 0 },
    { signature: 'ffd8ffe1', offset: 0 },
    { signature: 'ffd8ffe2', offset: 0 },
    { signature: 'ffd8ffe8', offset: 0 },
  ],
  'image/png': [
    { signature: '89504e47', offset: 0 },
  ],
  'image/gif': [
    { signature: '47494638', offset: 0 },
  ],
  'image/webp': [
    { signature: '52494646', offset: 0 }, // RIFF header, check WEBP at offset 8
  ],
  'image/svg+xml': [
    { signature: '3c3f786d6c', offset: 0 }, // <?xml
    { signature: '3c737667', offset: 0 }, // <svg
  ],
  
  // Documents
  'application/pdf': [
    { signature: '25504446', offset: 0 }, // %PDF
  ],
  
  // Archives (for resume uploads, etc.)
  'application/zip': [
    { signature: '504b0304', offset: 0 },
  ],
  
  // Microsoft Office (OOXML - docx, xlsx, pptx)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    { signature: '504b0304', offset: 0 }, // ZIP-based format
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    { signature: '504b0304', offset: 0 },
  ],
};

/**
 * Allowed file types and their size limits (in bytes)
 */
export const FILE_LIMITS: Record<string, { maxSize: number; extensions: string[] }> = {
  'image/jpeg': { maxSize: 10 * 1024 * 1024, extensions: ['.jpg', '.jpeg'] },
  'image/png': { maxSize: 10 * 1024 * 1024, extensions: ['.png'] },
  'image/gif': { maxSize: 5 * 1024 * 1024, extensions: ['.gif'] },
  'image/webp': { maxSize: 10 * 1024 * 1024, extensions: ['.webp'] },
  'application/pdf': { maxSize: 25 * 1024 * 1024, extensions: ['.pdf'] },
  'application/msword': { maxSize: 25 * 1024 * 1024, extensions: ['.doc'] },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    maxSize: 25 * 1024 * 1024,
    extensions: ['.docx'],
  },
  'video/mp4': { maxSize: 100 * 1024 * 1024, extensions: ['.mp4'] },
  'video/quicktime': { maxSize: 100 * 1024 * 1024, extensions: ['.mov'] },
  'video/webm': { maxSize: 100 * 1024 * 1024, extensions: ['.webm'] },
};

/**
 * Step 36: Validate file by magic number
 */
export function validateFileMagicNumber(
  buffer: Buffer,
  expectedMimeType: string
): { valid: boolean; detectedType?: string; error?: string } {
  const signatures = FILE_SIGNATURES[expectedMimeType];
  
  if (!signatures) {
    return { valid: false, error: `Unknown file type: ${expectedMimeType}` };
  }
  
  const bufferHex = buffer.toString('hex').toLowerCase();
  
  for (const { signature, offset } of signatures) {
    const signatureAtOffset = bufferHex.slice(offset * 2, offset * 2 + signature.length);
    if (signatureAtOffset === signature.toLowerCase()) {
      return { valid: true, detectedType: expectedMimeType };
    }
  }
  
  // Try to detect actual type
  for (const [mimeType, sigs] of Object.entries(FILE_SIGNATURES)) {
    for (const { signature, offset } of sigs) {
      const signatureAtOffset = bufferHex.slice(offset * 2, offset * 2 + signature.length);
      if (signatureAtOffset === signature.toLowerCase()) {
        return {
          valid: false,
          detectedType: mimeType,
          error: `File signature mismatch. Expected ${expectedMimeType}, detected ${mimeType}`,
        };
      }
    }
  }
  
  return { valid: false, error: 'Unknown or potentially malicious file type' };
}

/**
 * Step 36: Comprehensive file validation
 */
export function validateFile(
  buffer: Buffer,
  filename: string,
  declaredMimeType: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 1. Check file extension
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  const limits = FILE_LIMITS[declaredMimeType];
  
  if (!limits) {
    errors.push(`File type not allowed: ${declaredMimeType}`);
    return { valid: false, errors };
  }
  
  if (!limits.extensions.includes(ext)) {
    errors.push(`File extension ${ext} does not match declared type ${declaredMimeType}`);
  }
  
  // 2. Check file size
  if (buffer.length > limits.maxSize) {
    const maxMB = (limits.maxSize / (1024 * 1024)).toFixed(1);
    const actualMB = (buffer.length / (1024 * 1024)).toFixed(1);
    errors.push(`File too large: ${actualMB}MB exceeds limit of ${maxMB}MB`);
  }
  
  // 3. Validate magic number
  const magicResult = validateFileMagicNumber(buffer, declaredMimeType);
  if (!magicResult.valid) {
    errors.push(magicResult.error || 'Invalid file signature');
  }
  
  // 4. Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /<%/,  // ASP/JSP tags
    /<\?php/i,
    /eval\s*\(/i,
  ];
  
  // Only check text-based files for scripts
  if (declaredMimeType === 'image/svg+xml') {
    const content = buffer.toString('utf-8');
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        errors.push('File contains potentially malicious content');
        break;
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Step 38: Strip EXIF metadata from images
 * This removes potentially sensitive location and camera data
 */
export async function stripExifMetadata(buffer: Buffer, mimeType: string): Promise<Buffer> {
  // Only process JPEG images (they contain EXIF)
  if (mimeType !== 'image/jpeg') {
    return buffer;
  }
  
  try {
    // Simple EXIF stripping by removing APP1 marker segments
    // For production, use a library like 'piexifjs' or 'exif-parser'
    
    // Find and remove EXIF data (APP1 marker: FFE1)
    const stripped = removeExifFromJpeg(buffer);
    return stripped;
  } catch (error) {
    console.error('Failed to strip EXIF:', error);
    return buffer; // Return original if stripping fails
  }
}

/**
 * Remove EXIF data from JPEG buffer
 * JPEG structure: SOI (FFD8) followed by segments
 */
function removeExifFromJpeg(buffer: Buffer): Buffer {
  // Check for valid JPEG
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    return buffer;
  }
  
  const segments: Buffer[] = [];
  segments.push(Buffer.from([0xFF, 0xD8])); // SOI
  
  let pos = 2;
  
  while (pos < buffer.length - 1) {
    if (buffer[pos] !== 0xFF) {
      pos++;
      continue;
    }
    
    const marker = buffer[pos + 1];
    
    // End of image
    if (marker === 0xD9) {
      segments.push(buffer.slice(pos));
      break;
    }
    
    // Start of scan (image data follows)
    if (marker === 0xDA) {
      segments.push(buffer.slice(pos));
      break;
    }
    
    // Get segment length
    if (pos + 3 >= buffer.length) break;
    const length = buffer.readUInt16BE(pos + 2);
    
    // Skip APP1 (EXIF) and APP2 (ICC Profile) segments
    if (marker === 0xE1 || marker === 0xE2) {
      pos += 2 + length;
      continue;
    }
    
    // Keep other segments
    segments.push(buffer.slice(pos, pos + 2 + length));
    pos += 2 + length;
  }
  
  return Buffer.concat(segments);
}

/**
 * Generate secure filename
 */
export function generateSecureFilename(originalFilename: string): string {
  const ext = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

/**
 * Check if file might be a web shell or malicious script
 */
export function checkForWebShell(buffer: Buffer): boolean {
  const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));
  
  const webShellPatterns = [
    /eval\s*\(\s*\$_(GET|POST|REQUEST)/i,
    /base64_decode\s*\(/i,
    /exec\s*\(/i,
    /system\s*\(/i,
    /passthru\s*\(/i,
    /shell_exec\s*\(/i,
    /popen\s*\(/i,
    /proc_open\s*\(/i,
    /<\?php.*\$_(GET|POST|REQUEST)/is,
  ];
  
  return webShellPatterns.some(pattern => pattern.test(content));
}

export default {
  validateFileMagicNumber,
  validateFile,
  stripExifMetadata,
  generateSecureFilename,
  checkForWebShell,
  FILE_LIMITS,
};

export {};
