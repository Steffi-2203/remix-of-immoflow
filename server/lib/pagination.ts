import type { Request } from "express";

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

/**
 * Parse pagination params from Express request query.
 * Supports both `page` (1-indexed) and `offset` directly.
 */
export function parsePagination(req: Request): PaginationParams {
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit as string) || DEFAULT_LIMIT));
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build a standardized paginated response envelope.
 */
export function paginatedResponse<T>(data: T[], total: number, params: PaginationParams): PaginatedResponse<T> {
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPreviousPage: params.page > 1,
    },
  };
}

/**
 * Apply in-memory pagination to an already-fetched array.
 * Use this when the storage layer doesn't support offset/limit natively.
 */
export function paginateArray<T>(items: T[], params: PaginationParams): PaginatedResponse<T> {
  const total = items.length;
  const sliced = items.slice(params.offset, params.offset + params.limit);
  return paginatedResponse(sliced, total, params);
}
