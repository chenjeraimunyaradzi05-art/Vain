/**
 * Standard API Response Types
 * 
 * Provides consistent response formatting across all API endpoints.
 */

/**
 * Standard success response wrapper
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

/**
 * Standard error response wrapper
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: unknown;
  timestamp: string;
  requestId?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  pagination?: PaginationMeta;
  timestamp?: string;
  requestId?: string;
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ResponseMeta & { pagination: PaginationMeta };
}

/**
 * Create a success response
 */
export function success<T>(data: T, meta?: ResponseMeta): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}

/**
 * Create a paginated success response
 */
export function paginated<T>(
  data: T[],
  pagination: Omit<PaginationMeta, 'hasNext' | 'hasPrev'>
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    meta: {
      pagination: {
        ...pagination,
        hasNext: pagination.page < pagination.totalPages,
        hasPrev: pagination.page > 1,
      },
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create an error response
 */
export function error(
  message: string,
  code: string = 'INTERNAL_ERROR',
  details?: unknown
): ApiErrorResponse {
  return {
    success: false,
    error: message,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
}

// Export as namespace for convenience
export const ApiResponses = {
  success,
  paginated,
  error,
};

export {};
