/*
 * Code generated by Speakeasy (https://speakeasy.com). DO NOT EDIT.
 */

import * as z from "zod";
import { remap as remap$ } from "../../lib/primitives.js";
import { safeParse } from "../../lib/schemas.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";

export type ConnectionStats = {
  documentCount: number;
  pageCount: number;
};

/** @internal */
export const ConnectionStats$inboundSchema: z.ZodType<
  ConnectionStats,
  z.ZodTypeDef,
  unknown
> = z.object({
  document_count: z.number().int(),
  page_count: z.number(),
}).transform((v) => {
  return remap$(v, {
    "document_count": "documentCount",
    "page_count": "pageCount",
  });
});

/** @internal */
export type ConnectionStats$Outbound = {
  document_count: number;
  page_count: number;
};

/** @internal */
export const ConnectionStats$outboundSchema: z.ZodType<
  ConnectionStats$Outbound,
  z.ZodTypeDef,
  ConnectionStats
> = z.object({
  documentCount: z.number().int(),
  pageCount: z.number(),
}).transform((v) => {
  return remap$(v, {
    documentCount: "document_count",
    pageCount: "page_count",
  });
});

/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export namespace ConnectionStats$ {
  /** @deprecated use `ConnectionStats$inboundSchema` instead. */
  export const inboundSchema = ConnectionStats$inboundSchema;
  /** @deprecated use `ConnectionStats$outboundSchema` instead. */
  export const outboundSchema = ConnectionStats$outboundSchema;
  /** @deprecated use `ConnectionStats$Outbound` instead. */
  export type Outbound = ConnectionStats$Outbound;
}

export function connectionStatsToJSON(
  connectionStats: ConnectionStats,
): string {
  return JSON.stringify(ConnectionStats$outboundSchema.parse(connectionStats));
}

export function connectionStatsFromJSON(
  jsonString: string,
): SafeParseResult<ConnectionStats, SDKValidationError> {
  return safeParse(
    jsonString,
    (x) => ConnectionStats$inboundSchema.parse(JSON.parse(x)),
    `Failed to parse 'ConnectionStats' from JSON`,
  );
}
