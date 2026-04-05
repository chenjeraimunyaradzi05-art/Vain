// @ts-nocheck
"use strict";
/**
 * SSO/SAML Integration Routes
 * 
 * Enterprise single sign-on configuration and authentication endpoints.
 */

import express from 'express';
import crypto from 'crypto';
import { prisma } from '../db';
import requireAuth from '../middleware/auth';
import jwt from 'jsonwebtoken';

const router = express.Router();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY ERROR: JWT_SECRET must be set in production');
    }
    console.warn('WARNING: Using development JWT secret - NOT SAFE FOR PRODUCTION');
    return 'dev-secret-for-local-development-only-32chars';
  }
  if (secret.length < 32) {
    throw new Error('SECURITY ERROR: JWT_SECRET must be at least 32 characters');
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();

/**
 * GET /sso/config
 * Get SSO configuration for company
 */
router.get('/config', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const ssoConfig = await prisma.ssoConfig.findUnique({
      where: { companyId: company.id },
      select: {
        id: true,
        provider: true,
        issuer: true,
        ssoUrl: true,
        metadata: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
        // Note: certificate and secrets not returned for security
      }
    });
    
    res.json({ 
      configured: !!ssoConfig,
      config: ssoConfig
        ? {
            ...ssoConfig,
            metadata: ssoConfig.metadata ? safeJsonParse(ssoConfig.metadata) : null,
          }
        : null,
      callbackUrl: `${process.env.API_URL || 'http://localhost:3001'}/sso/callback`
    });
  } catch (err) {
    console.error('Failed to get SSO config:', err);
    res.status(500).json({ error: 'Failed to get SSO configuration' });
  }
});

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * POST /sso/config
 * Create or update SSO configuration
 */
router.post('/config', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { 
      provider, // SAML or OIDC
      issuer,
      ssoUrl,
      certificate,
      clientId,
      clientSecret,
      metadata 
    } = req.body;
    
    // Validate provider
    if (!provider || !['SAML', 'OIDC'].includes(provider)) {
      return void res.status(400).json({ error: 'Provider must be SAML or OIDC' });
    }
    
    // Validate required fields based on provider
    if (provider === 'SAML') {
      if (!issuer || !ssoUrl || !certificate) {
        return void res.status(400).json({ 
          error: 'SAML requires issuer, ssoUrl, and certificate' 
        });
      }
    } else if (provider === 'OIDC') {
      if (!issuer || !clientId || !clientSecret) {
        return void res.status(400).json({ 
          error: 'OIDC requires issuer, clientId, and clientSecret' 
        });
      }
    }
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    // Check for existing config
    const existing = await prisma.ssoConfig.findUnique({
      where: { companyId: company.id }
    });
    
    const data = {
      provider,
      issuer,
      ssoUrl: ssoUrl || null,
      certificate: certificate || null,
      clientId: clientId || null,
      clientSecret: clientSecret || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      isActive: false // Requires explicit activation
    };
    
    let ssoConfig;
    if (existing) {
      ssoConfig = await prisma.ssoConfig.update({
        where: { id: existing.id },
        data
      });
    } else {
      ssoConfig = await prisma.ssoConfig.create({
        data: {
          companyId: company.id,
          ...data
        }
      });
    }
    
    res.json({
      success: true,
      config: {
        id: ssoConfig.id,
        provider: ssoConfig.provider,
        issuer: ssoConfig.issuer,
        ssoUrl: ssoConfig.ssoUrl,
        isActive: ssoConfig.isActive
      },
      message: 'SSO configuration saved. Test the connection before activating.'
    });
  } catch (err) {
    console.error('Failed to save SSO config:', err);
    res.status(500).json({ error: 'Failed to save SSO configuration' });
  }
});

/**
 * POST /sso/config/activate
 * Activate or deactivate SSO
 */
router.post('/config/activate', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { active } = req.body;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const ssoConfig = await prisma.ssoConfig.findUnique({
      where: { companyId: company.id }
    });
    
    if (!ssoConfig) {
      return void res.status(404).json({ error: 'SSO not configured' });
    }
    
    await prisma.ssoConfig.update({
      where: { id: ssoConfig.id },
      data: { isActive: Boolean(active) }
    });
    
    res.json({
      success: true,
      isActive: Boolean(active),
      message: active ? 'SSO enabled' : 'SSO disabled'
    });
  } catch (err) {
    console.error('Failed to toggle SSO:', err);
    res.status(500).json({ error: 'Failed to update SSO status' });
  }
});

/**
 * DELETE /sso/config
 * Remove SSO configuration
 */
router.delete('/config', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const ssoConfig = await prisma.ssoConfig.findUnique({
      where: { companyId: company.id }
    });
    
    if (!ssoConfig) {
      return void res.status(404).json({ error: 'SSO not configured' });
    }
    
    await prisma.ssoConfig.delete({ where: { id: ssoConfig.id } });
    
    res.json({ success: true, message: 'SSO configuration removed' });
  } catch (err) {
    console.error('Failed to delete SSO config:', err);
    res.status(500).json({ error: 'Failed to remove SSO configuration' });
  }
});

/**
 * GET /sso/initiate/:companyId
 * Initiate SSO login for a company
 */
router.get('/initiate/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { returnTo } = req.query;
    
    const ssoConfig = await prisma.ssoConfig.findFirst({
      where: { companyId, isActive: true },
      include: { company: true }
    });
    
    if (!ssoConfig) {
      return void res.status(404).json({ error: 'SSO not configured for this company' });
    }
    
    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in session/cache (simplified - use Redis in production)
    // For now, encode it in a signed JWT
    const stateToken = jwt.sign(
      { companyId, returnTo: returnTo || '/', state },
      JWT_SECRET,
      { expiresIn: '10m' }
    );
    
    if (ssoConfig.provider === 'SAML') {
      // For SAML, redirect to IdP
      // In production, use a SAML library like passport-saml
      const callbackUrl = `${process.env.API_URL || ''}/sso/callback/saml`;
      const samlRequest = encodeSAMLRequest(ssoConfig.issuer, callbackUrl);
      
      const redirectUrl = `${ssoConfig.ssoUrl}?SAMLRequest=${samlRequest}&RelayState=${stateToken}`;
      res.json({ redirectUrl, provider: 'SAML' });
    } else if (ssoConfig.provider === 'OIDC') {
      // For OIDC, build authorization URL
      const callbackUrl = `${process.env.API_URL || ''}/sso/callback/oidc`;
      const authUrl = new URL(`${ssoConfig.issuer}/authorize`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', ssoConfig.clientId);
      authUrl.searchParams.set('redirect_uri', callbackUrl);
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('state', stateToken);
      
      res.json({ redirectUrl: authUrl.toString(), provider: 'OIDC' });
    }
  } catch (err) {
    console.error('Failed to initiate SSO:', err);
    res.status(500).json({ error: 'Failed to initiate SSO' });
  }
});

/**
 * POST /sso/callback/saml
 * Handle SAML assertion callback
 */
router.post('/callback/saml', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { SAMLResponse, RelayState } = req.body;
    
    if (!SAMLResponse || !RelayState) {
      return void res.status(400).json({ error: 'Missing SAML response or state' });
    }
    
    // Verify state token
    let stateData;
    try {
      stateData = jwt.verify(RelayState, JWT_SECRET);
    } catch (e) {
      return void res.status(400).json({ error: 'Invalid or expired state token' });
    }
    
    // Decode and validate SAML response
    // In production, use passport-saml or saml2-js library
    const assertion = decodeSAMLResponse(SAMLResponse);
    
    if (!assertion) {
      return void res.status(400).json({ error: 'Invalid SAML response' });
    }
    
    // Look up or create user
    const user = await findOrCreateSSOUser({
      email: assertion.email,
      name: assertion.name,
      companyId: stateData.companyId,
      provider: 'SAML',
      providerId: assertion.nameId
    });
    
    // Generate app JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, sso: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Redirect back to app
    const redirectUrl = `${process.env.WEB_URL || ''}/auth/sso-callback?token=${token}&returnTo=${encodeURIComponent(stateData.returnTo)}`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('SAML callback failed:', err);
    res.status(500).json({ error: 'SSO authentication failed' });
  }
});

/**
 * GET /sso/callback/oidc
 * Handle OIDC authorization code callback
 */
router.get('/callback/oidc', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    if (error) {
      console.error('OIDC error:', error, error_description);
      return void res.redirect(`${process.env.WEB_URL || ''}/auth/error?message=${encodeURIComponent(error_description || error)}`);
    }
    
    if (!code || !state) {
      return void res.status(400).json({ error: 'Missing code or state' });
    }
    
    // Verify state token
    let stateData;
    try {
      stateData = jwt.verify(state, JWT_SECRET);
    } catch (e) {
      return void res.status(400).json({ error: 'Invalid or expired state token' });
    }
    
    // Get SSO config
    const ssoConfig = await prisma.ssoConfig.findFirst({
      where: { companyId: stateData.companyId, isActive: true }
    });
    
    if (!ssoConfig) {
      return void res.status(404).json({ error: 'SSO configuration not found' });
    }
    
    // Exchange code for tokens
    const callbackUrl = `${process.env.API_URL || ''}/sso/callback/oidc`;
    const tokenResponse = await fetch(`${ssoConfig.issuer}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: ssoConfig.clientId,
        client_secret: ssoConfig.clientSecret
      })
    });
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return void res.status(400).json({ error: 'Token exchange failed' });
    }
    
    const tokens: any = await tokenResponse.json();
    
    // Get user info
    const userInfoResponse = await fetch(`${ssoConfig.issuer}/userinfo`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    
    if (!userInfoResponse.ok) {
      return void res.status(400).json({ error: 'Failed to get user info' });
    }
    
    const userInfo: any = await userInfoResponse.json();
    
    // Look up or create user
    const user = await findOrCreateSSOUser({
      email: userInfo.email,
      name: userInfo.name || userInfo.preferred_username,
      companyId: stateData.companyId,
      provider: 'OIDC',
      providerId: userInfo.sub
    });
    
    // Generate app JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, sso: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Redirect back to app
    const redirectUrl = `${process.env.WEB_URL || ''}/auth/sso-callback?token=${token}&returnTo=${encodeURIComponent(stateData.returnTo)}`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('OIDC callback failed:', err);
    res.status(500).json({ error: 'SSO authentication failed' });
  }
});

/**
 * Find or create a user from SSO assertion
 */
async function findOrCreateSSOUser({ email, name, companyId, provider, providerId }) {
  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user) {
    // Create new user from SSO
    user = await prisma.user.create({
      data: {
        email,
        password: null, // SSO users don't have passwords
        userType: 'COMPANY',
        companyProfile: {
          create: {
            companyName: name || email.split('@')[0],
            industry: 'Unknown'
          }
        }
      }
    });
  }
  
  return user;
}

/**
 * Encode a SAML AuthnRequest (simplified - use saml2-js in production)
 */
function encodeSAMLRequest(issuer, callbackUrl) {
  // This is a placeholder - in production, use a proper SAML library
  const request = `
    <samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      ID="_${crypto.randomBytes(16).toString('hex')}"
      Version="2.0"
      IssueInstant="${new Date().toISOString()}"
      AssertionConsumerServiceURL="${callbackUrl}">
      <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${issuer}</saml:Issuer>
    </samlp:AuthnRequest>
  `;
  
  return Buffer.from(request).toString('base64');
}

/**
 * Decode SAML response (simplified - use saml2-js in production)
 */
function decodeSAMLResponse(response) {
  try {
    // This is a placeholder - in production, validate signature, etc.
    const decoded = Buffer.from(response, 'base64').toString('utf-8');
    
    // Extract email and name from assertion
    // In production, properly parse XML and validate signature
    const emailMatch = decoded.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
    const nameMatch = decoded.match(/<saml:Attribute Name="name"[^>]*>.*?<saml:AttributeValue>([^<]+)<\/saml:AttributeValue>/s);
    
    if (!emailMatch) {
      return null;
    }
    
    return {
      nameId: emailMatch[1],
      email: emailMatch[1],
      name: nameMatch ? nameMatch[1] : null
    };
  } catch (err) {
    console.error('Failed to decode SAML response:', err);
    return null;
  }
}

export default router;


export {};


