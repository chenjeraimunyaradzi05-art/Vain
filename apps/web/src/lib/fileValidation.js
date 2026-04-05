/**
 * Client-side File Validation Utility
 * 
 * Provides comprehensive file validation before upload:
 * - MIME type checking
 * - File extension validation
 * - File size limits
 * - Category-based restrictions
 */

// File size limits (in bytes)
export const FILE_LIMITS = {
  RESUME: {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxSizeMB: '10MB',
    extensions: ['.pdf', '.doc', '.docx'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  PHOTO: {
    maxSize: 5 * 1024 * 1024, // 5MB
    maxSizeMB: '5MB',
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  VIDEO: {
    maxSize: 100 * 1024 * 1024, // 100MB
    maxSizeMB: '100MB',
    extensions: ['.mp4', '.mov', '.webm'],
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
  },
  OTHER: {
    maxSize: 25 * 1024 * 1024, // 25MB
    maxSizeMB: '25MB',
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.xls'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
  },
};

/**
 * Validate a file for upload
 * @param {File} file - The file to validate
 * @param {string} category - The upload category (RESUME, PHOTO, VIDEO, OTHER)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateFile(file, category = 'OTHER') {
  const errors = [];
  const limits = FILE_LIMITS[category] || FILE_LIMITS.OTHER;

  if (!file) {
    return { valid: false, errors: ['No file provided'] };
  }

  // Check file size
  if (file.size > limits.maxSize) {
    const actualMB = (file.size / (1024 * 1024)).toFixed(1);
    errors.push(
      `File size (${actualMB}MB) exceeds maximum allowed (${limits.maxSizeMB})`
    );
  }

  // Check MIME type
  if (!limits.mimeTypes.includes(file.type)) {
    errors.push(
      `File type '${file.type || 'unknown'}' is not allowed for ${category.toLowerCase()} uploads`
    );
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const ext = fileName.substring(fileName.lastIndexOf('.'));
  if (!limits.extensions.includes(ext)) {
    errors.push(
      `File extension '${ext}' is not allowed. Allowed: ${limits.extensions.join(', ')}`
    );
  }

  // Check for suspicious patterns in filename
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.php$/i,
    /\.js$/i,
    /\.sh$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.ps1$/i,
    /\.vbs$/i,
    /\.scr$/i,
    /\.\./,  // Path traversal
    /[<>"|?*:]/,  // Invalid characters
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      errors.push('Filename contains suspicious or disallowed characters');
      break;
    }
  }

  // Check for double extensions (e.g., document.pdf.exe)
  const dotCount = (file.name.match(/\./g) || []).length;
  if (dotCount > 1) {
    const parts = file.name.split('.');
    const lastExt = `.${parts[parts.length - 1]}`.toLowerCase();
    const secondLastExt = `.${parts[parts.length - 2]}`.toLowerCase();
    
    // Only warn if the actual extension doesn't match expected
    if (!limits.extensions.includes(lastExt) || !limits.extensions.includes(secondLastExt)) {
      // Check if it might be a disguised executable
      const executableExts = ['.exe', '.php', '.js', '.sh', '.bat', '.cmd', '.ps1'];
      if (executableExts.some(e => file.name.toLowerCase().includes(e))) {
        errors.push('File appears to have a disguised extension');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * Get allowed file types as accept string for input element
 * @param {string} category - The upload category
 * @returns {string} - Accept attribute value
 */
export function getAcceptString(category = 'OTHER') {
  const limits = FILE_LIMITS[category] || FILE_LIMITS.OTHER;
  return [...limits.mimeTypes, ...limits.extensions].join(',');
}

/**
 * Get human-readable allowed types for UI display
 * @param {string} category - The upload category
 * @returns {string} - Human readable types
 */
export function getAllowedTypesDisplay(category = 'OTHER') {
  const limits = FILE_LIMITS[category] || FILE_LIMITS.OTHER;
  return limits.extensions.map(ext => ext.replace('.', '').toUpperCase()).join(', ');
}
