/**
 * Express Request Extensions
 * 
 * Extends Express Request type with custom properties.
 */

import { Request } from 'express';

/**
 * Authenticated user information attached to request
 */
export interface AuthUser {
  id: string;
  email: string;
  userType?: string;
}

/**
 * API Key information attached to request
 */
export interface ApiKeyInfo {
  id: string;
  name: string;
  scopes: string[];
  company: {
    id: string;
    userId: string;
    companyName: string;
  };
}

/**
 * Extended Express Request with auth information
 */
export interface AuthenticatedRequest extends Request {
  user: NonNullable<Request['user']>;
  requestId?: string;
}

/**
 * Extended Express Request with optional auth
 */
export interface OptionalAuthRequest extends Request {
  user?: Request['user'];
  requestId?: string;
}

/**
 * Extended Express Request with API key auth
 */
export interface ApiKeyRequest extends Request {
  user: NonNullable<Request['user']>;
  apiKey: ApiKeyInfo;
  company: ApiKeyInfo['company'];
  isApiKeyAuth: true;
  requestId?: string;
}

/**
 * Type guard to check if request is authenticated
 */
export function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return !!(req as any).user?.id;
}

/**
 * Type guard to check if request is API key authenticated
 */
export function isApiKeyAuth(req: Request): req is ApiKeyRequest {
  return !!(req as any).isApiKeyAuth;
}

export {};
