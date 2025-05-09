/*
 * Code generated by Speakeasy (https://speakeasy.com). DO NOT EDIT.
 */

import * as z from "zod";
import { safeParse } from "../../lib/schemas.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import {
  Link,
  Link$inboundSchema,
  Link$Outbound,
  Link$outboundSchema,
} from "./link.js";

export type DocumentChunk = {
  id: string;
  index?: number | undefined;
  text: string;
  metadata?: { [k: string]: any } | undefined;
  links: { [k: string]: Link };
};

/** @internal */
export const DocumentChunk$inboundSchema: z.ZodType<
  DocumentChunk,
  z.ZodTypeDef,
  unknown
> = z.object({
  id: z.string(),
  index: z.number().int().default(-1),
  text: z.string(),
  metadata: z.record(z.any()).optional(),
  links: z.record(Link$inboundSchema),
});

/** @internal */
export type DocumentChunk$Outbound = {
  id: string;
  index: number;
  text: string;
  metadata?: { [k: string]: any } | undefined;
  links: { [k: string]: Link$Outbound };
};

/** @internal */
export const DocumentChunk$outboundSchema: z.ZodType<
  DocumentChunk$Outbound,
  z.ZodTypeDef,
  DocumentChunk
> = z.object({
  id: z.string(),
  index: z.number().int().default(-1),
  text: z.string(),
  metadata: z.record(z.any()).optional(),
  links: z.record(Link$outboundSchema),
});

/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export namespace DocumentChunk$ {
  /** @deprecated use `DocumentChunk$inboundSchema` instead. */
  export const inboundSchema = DocumentChunk$inboundSchema;
  /** @deprecated use `DocumentChunk$outboundSchema` instead. */
  export const outboundSchema = DocumentChunk$outboundSchema;
  /** @deprecated use `DocumentChunk$Outbound` instead. */
  export type Outbound = DocumentChunk$Outbound;
}

export function documentChunkToJSON(documentChunk: DocumentChunk): string {
  return JSON.stringify(DocumentChunk$outboundSchema.parse(documentChunk));
}

export function documentChunkFromJSON(
  jsonString: string,
): SafeParseResult<DocumentChunk, SDKValidationError> {
  return safeParse(
    jsonString,
    (x) => DocumentChunk$inboundSchema.parse(JSON.parse(x)),
    `Failed to parse 'DocumentChunk' from JSON`,
  );
}
