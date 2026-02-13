/**
 * @module shared/schema
 *
 * Barrel file — re-exports all Drizzle table definitions, Zod schemas,
 * and TypeScript types from the domain-specific modules under ./schema/.
 *
 * All existing imports (`import * as schema from "@shared/schema"`,
 * `import { tenants } from "@shared/schema"`, etc.) continue to work
 * without any changes.
 *
 * The legacy Replit Auth model is re-exported from ./models/auth.
 */

// Domain modules (tables, schemas, types)
export * from "./schema/index";

// Legacy auth model (sessions, users)
export * from "./models/auth";
