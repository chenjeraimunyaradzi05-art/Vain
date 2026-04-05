/**
 * Content Moderation Service
 * 
 * Handles:
 * - Text content analysis for harmful content
 * - Image moderation using AI
 * - Spam detection
 * - Profanity filtering
 * - Cultural sensitivity for Indigenous content
 * - User reporting and appeal handling
 */

import { prisma } from '../db';
import { logger } from '../lib/logger';

// Moderation action types
export type ModerationAction = 
  | 'approve'
  | 'flag'
  | 'remove'
  | 'warn'
  | 'suspend'
  | 'ban';

export type ContentType = 
  | 'post'
  | 'comment'
  | 'message'
  | 'profile'
  | 'group'
  | 'image'
  | 'video';

export type ViolationType =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'adult_content'
  | 'misinformation'
  | 'cultural_insensitivity'
  | 'personal_info'
  | 'scam'
  | 'other';

// Moderation result
export interface ModerationResult {
  isAllowed: boolean;
  confidence: number;
  action: ModerationAction;
  violations: ViolationDetail[];
  sanitizedContent?: string;
  requiresHumanReview: boolean;
  metadata?: Record<string, any>;
}

export interface ViolationDetail {
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  matchedPatterns?: string[];
}

export interface ContentReport {
  id: string;
  reporterId: string;
  contentId: string;
  contentType: ContentType;
  reason: ViolationType;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
}

export interface ModerationLog {
  id: string;
  contentId: string;
  contentType: ContentType;
  action: ModerationAction;
  reason: string;
  moderatorId?: string;
  isAutomated: boolean;
  createdAt: Date;
}

// Profanity and harmful word patterns
const PROFANITY_PATTERNS = [
  // Common profanity (redacted patterns for production)
  /\b(f+u+c+k+|s+h+i+t+|a+s+s+|b+i+t+c+h+|d+a+m+n+)\b/gi,
  // Evasion patterns (numbers for letters, etc.)
  /\b(f+[\W_]*u+[\W_]*c+[\W_]*k+|sh[\W_]*1+t|@+s+s+)\b/gi,
];

// Harassment patterns
const HARASSMENT_PATTERNS = [
  /\b(kill yourself|kys|go die|neck yourself)\b/gi,
  /\b(you('re| are) (stupid|dumb|worthless|ugly|fat))\b/gi,
  /\b(nobody (loves|likes|cares about) you)\b/gi,
];

// Hate speech patterns (targeted at groups)
const HATE_SPEECH_PATTERNS = [
  // Racial slurs and hate terms (patterns redacted for production)
  /\b(racist|sexist|homophobic)[\W_]*(slur|term)\b/gi,
];

// Cultural sensitivity patterns for Indigenous context
const CULTURAL_SENSITIVITY_PATTERNS = [
  // Terms that require cultural context
  /\b(abo|abos|coon|boong|gin)\b/gi,
  // Stereotyping patterns
  /\b(all (aboriginals?|indigenous)( people)? are)\b/gi,
  // Disrespectful references to sacred/cultural elements
  /\b(stupid|dumb|fake)[\W_]+(dreaming|dreamtime|ceremony)\b/gi,
];

// Spam patterns
const SPAM_PATTERNS = [
  // Repeated characters
  /(.)\1{10,}/g,
  // URL spam
  /(https?:\/\/[^\s]+){5,}/g,
  // Cryptocurrency spam
  /\b(bitcoin|crypto|nft|airdrop|giveaway).*\b(free|win|earn|profit)\b/gi,
  // Phone numbers (potential scam)
  /\b(\+?61|0)[2-478](\s?\d){8}\b/g,
];

// Personal info patterns
const PERSONAL_INFO_PATTERNS = [
  // Credit card numbers
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Australian phone numbers
  /\b(\+?61|0)[2-478](\s?\d){8}\b/g,
  // Medicare numbers
  /\b\d{10,11}\b/g,
];

class ContentModerationService {
  private static instance: ContentModerationService;
  private userViolationCounts: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): ContentModerationService {
    if (!ContentModerationService.instance) {
      ContentModerationService.instance = new ContentModerationService();
    }
    return ContentModerationService.instance;
  }

  /**
   * Main content moderation function
   */
  async moderateContent(
    content: string,
    contentType: ContentType,
    authorId: string,
    context?: {
      isReply?: boolean;
      targetUserId?: string;
      communityId?: string;
    }
  ): Promise<ModerationResult> {
    const violations: ViolationDetail[] = [];
    let confidence = 1.0;
    let sanitizedContent = content;

    // Run all checks
    const profanityViolations = this.checkProfanity(content);
    const harassmentViolations = this.checkHarassment(content);
    const hateSpeechViolations = this.checkHateSpeech(content);
    const culturalViolations = this.checkCulturalSensitivity(content);
    const spamViolations = this.checkSpam(content);
    const personalInfoViolations = this.checkPersonalInfo(content);

    // Aggregate violations
    violations.push(
      ...profanityViolations,
      ...harassmentViolations,
      ...hateSpeechViolations,
      ...culturalViolations,
      ...spamViolations,
      ...personalInfoViolations
    );

    // Calculate overall severity
    const maxSeverity = this.getMaxSeverity(violations);
    const action = this.determineAction(violations, authorId);
    const requiresHumanReview = this.requiresHumanReview(violations);

    // Sanitize content if needed
    if (profanityViolations.length > 0) {
      sanitizedContent = this.sanitizeContent(content);
    }

    // Mask personal info
    if (personalInfoViolations.length > 0) {
      sanitizedContent = this.maskPersonalInfo(sanitizedContent);
    }

    // Log moderation decision
    if (violations.length > 0) {
      await this.logModeration({
        contentType,
        action,
        violations,
        authorId,
        isAutomated: true
      });
    }

    return {
      isAllowed: action === 'approve' || action === 'flag',
      confidence,
      action,
      violations,
      sanitizedContent: sanitizedContent !== content ? sanitizedContent : undefined,
      requiresHumanReview,
      metadata: {
        maxSeverity,
        checksPerformed: [
          'profanity',
          'harassment',
          'hate_speech',
          'cultural_sensitivity',
          'spam',
          'personal_info'
        ]
      }
    };
  }

  /**
   * Check for profanity
   */
  private checkProfanity(content: string): ViolationDetail[] {
    const violations: ViolationDetail[] = [];
    const matchedPatterns: string[] = [];

    for (const pattern of PROFANITY_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        matchedPatterns.push(...matches);
      }
    }

    if (matchedPatterns.length > 0) {
      violations.push({
        type: 'other',
        severity: matchedPatterns.length > 3 ? 'medium' : 'low',
        description: 'Content contains profanity',
        matchedPatterns: [...new Set(matchedPatterns)]
      });
    }

    return violations;
  }

  /**
   * Check for harassment
   */
  private checkHarassment(content: string): ViolationDetail[] {
    const violations: ViolationDetail[] = [];
    const matchedPatterns: string[] = [];

    for (const pattern of HARASSMENT_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        matchedPatterns.push(...matches);
      }
    }

    if (matchedPatterns.length > 0) {
      violations.push({
        type: 'harassment',
        severity: 'high',
        description: 'Content contains harassment or targeted abuse',
        matchedPatterns: [...new Set(matchedPatterns)]
      });
    }

    return violations;
  }

  /**
   * Check for hate speech
   */
  private checkHateSpeech(content: string): ViolationDetail[] {
    const violations: ViolationDetail[] = [];
    const matchedPatterns: string[] = [];

    for (const pattern of HATE_SPEECH_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        matchedPatterns.push(...matches);
      }
    }

    if (matchedPatterns.length > 0) {
      violations.push({
        type: 'hate_speech',
        severity: 'critical',
        description: 'Content contains hate speech or discriminatory language',
        matchedPatterns: [...new Set(matchedPatterns)]
      });
    }

    return violations;
  }

  /**
   * Check for cultural insensitivity (Indigenous context)
   */
  private checkCulturalSensitivity(content: string): ViolationDetail[] {
    const violations: ViolationDetail[] = [];
    const matchedPatterns: string[] = [];

    for (const pattern of CULTURAL_SENSITIVITY_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        matchedPatterns.push(...matches);
      }
    }

    if (matchedPatterns.length > 0) {
      violations.push({
        type: 'cultural_insensitivity',
        severity: 'high',
        description: 'Content may be culturally insensitive or disrespectful to Indigenous communities',
        matchedPatterns: [...new Set(matchedPatterns)]
      });
    }

    return violations;
  }

  /**
   * Check for spam
   */
  private checkSpam(content: string): ViolationDetail[] {
    const violations: ViolationDetail[] = [];
    const indicators: string[] = [];

    // Check for spam patterns
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(content)) {
        indicators.push('pattern_match');
      }
    }

    // Check for excessive caps
    const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (upperCaseRatio > 0.7 && content.length > 20) {
      indicators.push('excessive_caps');
    }

    // Check for excessive repetition
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
    const maxRepetition = Math.max(...Array.from(wordCounts.values()));
    if (maxRepetition > 5) {
      indicators.push('word_repetition');
    }

    // Check content length vs unique words ratio
    if (words.length > 10) {
      const uniqueWords = new Set(words);
      const uniqueRatio = uniqueWords.size / words.length;
      if (uniqueRatio < 0.3) {
        indicators.push('low_uniqueness');
      }
    }

    if (indicators.length >= 2) {
      violations.push({
        type: 'spam',
        severity: 'medium',
        description: 'Content appears to be spam',
        matchedPatterns: indicators
      });
    }

    return violations;
  }

  /**
   * Check for personal information exposure
   */
  private checkPersonalInfo(content: string): ViolationDetail[] {
    const violations: ViolationDetail[] = [];
    const foundTypes: string[] = [];

    for (const pattern of PERSONAL_INFO_PATTERNS) {
      if (pattern.test(content)) {
        foundTypes.push(pattern.source.includes('card') ? 'credit_card' : 
                       pattern.source.includes('@') ? 'email' :
                       pattern.source.includes('61') ? 'phone' : 'other');
      }
    }

    if (foundTypes.length > 0) {
      violations.push({
        type: 'personal_info',
        severity: foundTypes.includes('credit_card') ? 'critical' : 'medium',
        description: 'Content may contain personal information',
        matchedPatterns: [...new Set(foundTypes)]
      });
    }

    return violations;
  }

  /**
   * Get maximum severity from violations
   */
  private getMaxSeverity(violations: ViolationDetail[]): string {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    let maxIndex = -1;

    for (const violation of violations) {
      const index = severityOrder.indexOf(violation.severity);
      if (index > maxIndex) {
        maxIndex = index;
      }
    }

    return maxIndex >= 0 ? severityOrder[maxIndex] : 'none';
  }

  /**
   * Determine moderation action based on violations
   */
  private determineAction(violations: ViolationDetail[], authorId: string): ModerationAction {
    if (violations.length === 0) {
      return 'approve';
    }

    const maxSeverity = this.getMaxSeverity(violations);

    // Check user's violation history
    const userViolations = this.userViolationCounts.get(authorId) || 0;

    switch (maxSeverity) {
      case 'critical':
        // Immediate removal and potential ban
        this.incrementUserViolations(authorId);
        if (userViolations >= 2) {
          return 'suspend';
        }
        return 'remove';

      case 'high':
        // Remove content
        this.incrementUserViolations(authorId);
        if (userViolations >= 3) {
          return 'suspend';
        }
        return 'remove';

      case 'medium':
        // Flag for review
        if (userViolations >= 2) {
          return 'remove';
        }
        return 'flag';

      case 'low':
        // Approve with warning
        if (userViolations >= 5) {
          return 'flag';
        }
        return 'warn';

      default:
        return 'approve';
    }
  }

  /**
   * Increment user violation count
   */
  private incrementUserViolations(userId: string): void {
    const current = this.userViolationCounts.get(userId) || 0;
    this.userViolationCounts.set(userId, current + 1);
  }

  /**
   * Check if content requires human review
   */
  private requiresHumanReview(violations: ViolationDetail[]): boolean {
    // Require human review for:
    // - Cultural sensitivity issues (context matters)
    // - Multiple medium-severity violations
    // - Any high or critical severity

    const hasCulturalIssue = violations.some(v => v.type === 'cultural_insensitivity');
    const hasHighSeverity = violations.some(v => 
      v.severity === 'high' || v.severity === 'critical'
    );
    const mediumCount = violations.filter(v => v.severity === 'medium').length;

    return hasCulturalIssue || hasHighSeverity || mediumCount >= 2;
  }

  /**
   * Sanitize content (replace profanity with asterisks)
   */
  private sanitizeContent(content: string): string {
    let sanitized = content;

    for (const pattern of PROFANITY_PATTERNS) {
      sanitized = sanitized.replace(pattern, (match) => {
        return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
      });
    }

    return sanitized;
  }

  /**
   * Mask personal information
   */
  private maskPersonalInfo(content: string): string {
    let masked = content;

    // Mask credit card numbers
    masked = masked.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, 
      '**** **** **** ****');

    // Mask emails (keep first 2 chars and domain)
    masked = masked.replace(
      /\b([A-Za-z0-9._%+-]{2})[A-Za-z0-9._%+-]+(@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g,
      '$1***$2'
    );

    // Mask phone numbers
    masked = masked.replace(
      /\b(\+?61|0)([2-478])(\s?\d){8}\b/g,
      '$1$2** *** ***'
    );

    return masked;
  }

  /**
   * Log moderation action
   */
  private async logModeration(data: {
    contentType: ContentType;
    action: ModerationAction;
    violations: ViolationDetail[];
    authorId: string;
    isAutomated: boolean;
    moderatorId?: string;
  }): Promise<void> {
    try {
      logger.info('Content moderation action', {
        contentType: data.contentType,
        action: data.action,
        violationTypes: data.violations.map(v => v.type),
        authorId: data.authorId,
        isAutomated: data.isAutomated
      });

      // In production, would save to database
      // await prisma.moderationLog.create({ data: {...} });
    } catch (error) {
      logger.error('Failed to log moderation action', { error });
    }
  }

  /**
   * Handle user report
   */
  async handleReport(
    reporterId: string,
    contentId: string,
    contentType: ContentType,
    reason: ViolationType,
    description?: string
  ): Promise<ContentReport> {
    const report: ContentReport = {
      id: `report_${Date.now()}`,
      reporterId,
      contentId,
      contentType,
      reason,
      description,
      status: 'pending',
      createdAt: new Date()
    };

    // Log the report
    logger.info('Content reported', {
      reportId: report.id,
      contentType,
      reason
    });

    // In production, would save to database
    // await prisma.contentReport.create({ data: report });

    // Auto-moderate if multiple reports
    // const reportCount = await prisma.contentReport.count({
    //   where: { contentId, status: 'pending' }
    // });
    // if (reportCount >= 3) {
    //   await this.autoModerateContent(contentId, contentType);
    // }

    return report;
  }

  /**
   * Handle appeal
   */
  async handleAppeal(
    userId: string,
    moderationLogId: string,
    appealReason: string
  ): Promise<{ success: boolean; message: string }> {
    logger.info('Moderation appeal submitted', {
      userId,
      moderationLogId,
      appealReason: appealReason.substring(0, 100)
    });

    // In production, would create appeal record and notify moderators
    // await prisma.moderationAppeal.create({
    //   data: {
    //     userId,
    //     moderationLogId,
    //     reason: appealReason,
    //     status: 'pending'
    //   }
    // });

    return {
      success: true,
      message: 'Your appeal has been submitted and will be reviewed by our team within 24-48 hours.'
    };
  }

  /**
   * Get moderation queue for human review
   */
  async getModerationQueue(
    limit: number = 20,
    cursor?: string
  ): Promise<{ items: any[]; nextCursor: string | null }> {
    // In production, would fetch from database
    // const items = await prisma.content.findMany({
    //   where: {
    //     moderationStatus: 'pending_review'
    //   },
    //   take: limit + 1,
    //   cursor: cursor ? { id: cursor } : undefined
    // });

    return {
      items: [],
      nextCursor: null
    };
  }

  /**
   * Perform moderation action as moderator
   */
  async performModeratorAction(
    moderatorId: string,
    contentId: string,
    contentType: ContentType,
    action: ModerationAction,
    reason: string
  ): Promise<{ success: boolean }> {
    logger.info('Moderator action performed', {
      moderatorId,
      contentId,
      contentType,
      action,
      reason
    });

    // In production, would update content status and create log
    // await prisma.content.update({
    //   where: { id: contentId },
    //   data: { moderationStatus: action }
    // });

    return { success: true };
  }

  /**
   * Get user's moderation history
   */
  async getUserModerationHistory(userId: string): Promise<ModerationLog[]> {
    // In production, would fetch from database
    // return prisma.moderationLog.findMany({
    //   where: { authorId: userId },
    //   orderBy: { createdAt: 'desc' }
    // });

    return [];
  }

  /**
   * Check if user is currently restricted
   */
  async isUserRestricted(userId: string): Promise<{
    isRestricted: boolean;
    restrictionType?: 'warned' | 'muted' | 'suspended' | 'banned';
    expiresAt?: Date;
    reason?: string;
  }> {
    // In production, would check database
    // const restriction = await prisma.userRestriction.findFirst({
    //   where: { userId, expiresAt: { gt: new Date() } }
    // });

    return { isRestricted: false };
  }
}

// Export singleton instance
export const contentModerationService = ContentModerationService.getInstance();

