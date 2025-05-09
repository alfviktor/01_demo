/*
 * Code generated by Speakeasy (https://speakeasy.com). DO NOT EDIT.
 */

import * as z from "zod";
import { remap as remap$ } from "../../lib/primitives.js";
import { safeParse } from "../../lib/schemas.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";

export type GetDocumentChunksRequest = {
  /**
   * The id of the document.
   */
  documentId: string;
  /**
   * The inclusive starting index of the chunk range to list. If omitted and `end_index` is present effectively limits results to at most one chunk matching `end_index`. If both `start_index` and `end_index` are omitted, results are not limited by index.
   */
  startIndex?: number | null | undefined;
  /**
   * The inclusive ending index of the chunk range to list. If omitted and `start_index` is present effectively limits results to at most one chunk matching `start_index`. If both `start_index` and `end_index` are omitted, results are not limited by index.
   */
  endIndex?: number | null | undefined;
  /**
   * An opaque cursor for pagination
   */
  cursor?: string | null | undefined;
  /**
   * The number of items per page (must be greater than 0 and less than or equal to 100)
   */
  pageSize?: number | undefined;
  /**
   * An optional partition to scope the request to. If omitted, accounts created after 1/9/2025 will have the request scoped to the default partition, while older accounts will have the request scoped to all partitions. Older accounts may opt in to strict partition scoping by contacting support@ragie.ai. Older accounts using the partitions feature are strongly recommended to scope the request to a partition.
   */
  partition?: string | null | undefined;
};

/** @internal */
export const GetDocumentChunksRequest$inboundSchema: z.ZodType<
  GetDocumentChunksRequest,
  z.ZodTypeDef,
  unknown
> = z.object({
  document_id: z.string(),
  start_index: z.nullable(z.number().int()).optional(),
  end_index: z.nullable(z.number().int()).optional(),
  cursor: z.nullable(z.string()).optional(),
  page_size: z.number().int().default(10),
  partition: z.nullable(z.string()).optional(),
}).transform((v) => {
  return remap$(v, {
    "document_id": "documentId",
    "start_index": "startIndex",
    "end_index": "endIndex",
    "page_size": "pageSize",
  });
});

/** @internal */
export type GetDocumentChunksRequest$Outbound = {
  document_id: string;
  start_index?: number | null | undefined;
  end_index?: number | null | undefined;
  cursor?: string | null | undefined;
  page_size: number;
  partition?: string | null | undefined;
};

/** @internal */
export const GetDocumentChunksRequest$outboundSchema: z.ZodType<
  GetDocumentChunksRequest$Outbound,
  z.ZodTypeDef,
  GetDocumentChunksRequest
> = z.object({
  documentId: z.string(),
  startIndex: z.nullable(z.number().int()).optional(),
  endIndex: z.nullable(z.number().int()).optional(),
  cursor: z.nullable(z.string()).optional(),
  pageSize: z.number().int().default(10),
  partition: z.nullable(z.string()).optional(),
}).transform((v) => {
  return remap$(v, {
    documentId: "document_id",
    startIndex: "start_index",
    endIndex: "end_index",
    pageSize: "page_size",
  });
});

/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export namespace GetDocumentChunksRequest$ {
  /** @deprecated use `GetDocumentChunksRequest$inboundSchema` instead. */
  export const inboundSchema = GetDocumentChunksRequest$inboundSchema;
  /** @deprecated use `GetDocumentChunksRequest$outboundSchema` instead. */
  export const outboundSchema = GetDocumentChunksRequest$outboundSchema;
  /** @deprecated use `GetDocumentChunksRequest$Outbound` instead. */
  export type Outbound = GetDocumentChunksRequest$Outbound;
}

export function getDocumentChunksRequestToJSON(
  getDocumentChunksRequest: GetDocumentChunksRequest,
): string {
  return JSON.stringify(
    GetDocumentChunksRequest$outboundSchema.parse(getDocumentChunksRequest),
  );
}

export function getDocumentChunksRequestFromJSON(
  jsonString: string,
): SafeParseResult<GetDocumentChunksRequest, SDKValidationError> {
  return safeParse(
    jsonString,
    (x) => GetDocumentChunksRequest$inboundSchema.parse(JSON.parse(x)),
    `Failed to parse 'GetDocumentChunksRequest' from JSON`,
  );
}
