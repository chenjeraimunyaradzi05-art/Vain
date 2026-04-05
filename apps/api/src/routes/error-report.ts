"use strict";
/**
 * Error Reporting Route
 * 
 * Receives client-side error reports for monitoring.
 * In production, forward these to Sentry/DataDog/etc.
 */

const express = require('express');
const router = express.Router();
const { logger } = require('../lib/logger');
const { createRateLimiter } = require('../middleware/rateLimit');

// Rate limit error reports to prevent abuse (20 per minute per IP)
const errorReportLimiter = createRateLimiter('sensitive', {
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many error reports' }
});

/**
 * POST /error-report
 * Receive client error reports
 */
router.post('/', errorReportLimiter, (req, res) => {
  try {
    const { message, stack, url, userAgent, timestamp } = req.body;
    
    // Log the client error
    logger.error({
      type: 'client_error',
      clientMessage: message,
      clientStack: stack?.substring(0, 2000), // Limit stack trace size
      clientUrl: url,
      userAgent: userAgent?.substring(0, 500),
      reportedAt: timestamp,
      ip: req.ip || req.connection?.remoteAddress,
      userId: req.user?.id
    }, `Client error: ${message?.substring(0, 100)}`);
    
    // In production, forward to Sentry/DataDog
    if (process.env.SENTRY_DSN) {
      // Sentry.captureMessage(message, { extra: { stack, url } });
    }
    
    res.status(200).json({ received: true });
  } catch (err) {
    // Don't fail on error reporting
    logger.warn({ err: err.message }, 'Error processing error report');
    res.status(200).json({ received: true });
  }
});

export default router;


export {};
