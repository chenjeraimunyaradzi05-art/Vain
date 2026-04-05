import {
  validateFile,
  generateUniqueFilename,
  generateUploadPath,
  sanitizeFilename,
  isImage,
  isDocument,
  ALLOWED_FILE_TYPES,
} from '../../src/lib/upload';

describe('Upload Utilities', () => {
  describe('validateFile', () => {
    describe('Resume validation', () => {
      it('should accept valid PDF resume', () => {
        const result = validateFile(
          {
            originalname: 'resume.pdf',
            mimetype: 'application/pdf',
            size: 1024 * 1024, // 1MB
          },
          'resume'
        );

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept valid DOCX resume', () => {
        const result = validateFile(
          {
            originalname: 'resume.docx',
            mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 2 * 1024 * 1024, // 2MB
          },
          'resume'
        );

        expect(result.valid).toBe(true);
      });

      it('should reject invalid extension', () => {
        const result = validateFile(
          {
            originalname: 'resume.exe',
            mimetype: 'application/pdf',
            size: 1024 * 1024,
          },
          'resume'
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file extension');
      });

      it('should reject invalid MIME type', () => {
        const result = validateFile(
          {
            originalname: 'resume.pdf',
            mimetype: 'text/html',
            size: 1024 * 1024,
          },
          'resume'
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
      });

      it('should reject file too large', () => {
        const result = validateFile(
          {
            originalname: 'resume.pdf',
            mimetype: 'application/pdf',
            size: 10 * 1024 * 1024, // 10MB (over 5MB limit)
          },
          'resume'
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('File too large');
      });
    });

    describe('Avatar validation', () => {
      it('should accept valid JPEG avatar', () => {
        const result = validateFile(
          {
            originalname: 'photo.jpg',
            mimetype: 'image/jpeg',
            size: 500 * 1024, // 500KB
          },
          'avatar'
        );

        expect(result.valid).toBe(true);
      });

      it('should accept valid PNG avatar', () => {
        const result = validateFile(
          {
            originalname: 'photo.png',
            mimetype: 'image/png',
            size: 1024 * 1024, // 1MB
          },
          'avatar'
        );

        expect(result.valid).toBe(true);
      });

      it('should accept valid WebP avatar', () => {
        const result = validateFile(
          {
            originalname: 'photo.webp',
            mimetype: 'image/webp',
            size: 500 * 1024,
          },
          'avatar'
        );

        expect(result.valid).toBe(true);
      });

      it('should reject avatar too large', () => {
        const result = validateFile(
          {
            originalname: 'photo.jpg',
            mimetype: 'image/jpeg',
            size: 3 * 1024 * 1024, // 3MB (over 2MB limit)
          },
          'avatar'
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('File too large');
        expect(result.error).toContain('2MB');
      });

      it('should reject GIF for avatar', () => {
        const result = validateFile(
          {
            originalname: 'animated.gif',
            mimetype: 'image/gif',
            size: 500 * 1024,
          },
          'avatar'
        );

        expect(result.valid).toBe(false);
      });
    });

    describe('Image validation', () => {
      it('should accept GIF for general images', () => {
        const result = validateFile(
          {
            originalname: 'image.gif',
            mimetype: 'image/gif',
            size: 1024 * 1024,
          },
          'image'
        );

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate unique filename with extension', () => {
      const filename = generateUniqueFilename('document.pdf');

      expect(filename).toMatch(/^\d+-[a-z0-9]+\.pdf$/);
    });

    it('should handle multiple extensions', () => {
      const filename = generateUniqueFilename('file.backup.txt');

      expect(filename).toMatch(/^\d+-[a-z0-9]+\.txt$/);
    });

    it('should generate different names for same original', () => {
      const filename1 = generateUniqueFilename('test.pdf');
      const filename2 = generateUniqueFilename('test.pdf');

      expect(filename1).not.toBe(filename2);
    });
  });

  describe('generateUploadPath', () => {
    it('should generate path with date and user', () => {
      const path = generateUploadPath('resume', 'user123');

      expect(path).toMatch(/^uploads\/resume\/\d{4}\/\d{2}\/\d{2}\/user123$/);
    });

    it('should use anonymous for missing user', () => {
      const path = generateUploadPath('avatar');

      expect(path).toMatch(/^uploads\/avatar\/\d{4}\/\d{2}\/\d{2}\/anonymous$/);
    });

    it('should handle different file types', () => {
      const resumePath = generateUploadPath('resume', 'user1');
      const avatarPath = generateUploadPath('avatar', 'user1');

      expect(resumePath).toContain('/resume/');
      expect(avatarPath).toContain('/avatar/');
    });
  });

  describe('sanitizeFilename', () => {
    it('should lowercase filename', () => {
      expect(sanitizeFilename('MyFile.PDF')).toBe('myfile.pdf');
    });

    it('should replace spaces with hyphens', () => {
      expect(sanitizeFilename('my file name.pdf')).toBe('my-file-name.pdf');
    });

    it('should remove special characters', () => {
      expect(sanitizeFilename('file@#$%^.pdf')).toBe('file.pdf');
    });

    it('should collapse multiple hyphens', () => {
      expect(sanitizeFilename('file---name.pdf')).toBe('file-name.pdf');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(sanitizeFilename('-file-name-.pdf')).toBe('file-name.pdf');
    });

    it('should handle unicode characters', () => {
      expect(sanitizeFilename('文件name.pdf')).toBe('name.pdf');
    });
  });

  describe('isImage', () => {
    it('should return true for image MIME types', () => {
      expect(isImage('image/jpeg')).toBe(true);
      expect(isImage('image/png')).toBe(true);
      expect(isImage('image/gif')).toBe(true);
      expect(isImage('image/webp')).toBe(true);
      expect(isImage('image/svg+xml')).toBe(true);
    });

    it('should return false for non-image MIME types', () => {
      expect(isImage('application/pdf')).toBe(false);
      expect(isImage('text/plain')).toBe(false);
      expect(isImage('video/mp4')).toBe(false);
    });
  });

  describe('isDocument', () => {
    it('should return true for document MIME types', () => {
      expect(isDocument('application/pdf')).toBe(true);
      expect(isDocument('application/msword')).toBe(true);
      expect(isDocument('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
      expect(isDocument('text/plain')).toBe(true);
    });

    it('should return false for non-document MIME types', () => {
      expect(isDocument('image/jpeg')).toBe(false);
      expect(isDocument('video/mp4')).toBe(false);
      expect(isDocument('audio/mpeg')).toBe(false);
    });
  });

  describe('ALLOWED_FILE_TYPES', () => {
    it('should have correct resume configuration', () => {
      const config = ALLOWED_FILE_TYPES.resume;

      expect(config.extensions).toContain('.pdf');
      expect(config.extensions).toContain('.doc');
      expect(config.extensions).toContain('.docx');
      expect(config.maxSize).toBe(5 * 1024 * 1024);
    });

    it('should have correct avatar configuration', () => {
      const config = ALLOWED_FILE_TYPES.avatar;

      expect(config.extensions).toContain('.jpg');
      expect(config.extensions).toContain('.png');
      expect(config.maxSize).toBe(2 * 1024 * 1024);
    });
  });
});
