/**
 * Central schema barrel — re-exports every domain module.
 *
 * Consumers keep importing from "@shared/schema" as before;
 * individual domain modules live under shared/schema/<domain>.ts.
 */

export * from "./enums";
export * from "./organizations";
export * from "./properties";
export * from "./tenants";
export * from "./billing";
export * from "./finance";
export * from "./maintenance";
export * from "./facility";
export * from "./documents";
export * from "./audit";
export * from "./messaging";
export * from "./commercial";
