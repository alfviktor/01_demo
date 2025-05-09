/*
 * Code generated by Speakeasy (https://speakeasy.com). DO NOT EDIT.
 */

import { documentsGetChunkContent } from "../../funcs/documentsGetChunkContent.js";
import * as operations from "../../models/operations/index.js";
import { formatResult, ToolDefinition } from "../tools.js";

const args = {
  request: operations.GetDocumentChunkContentRequest$inboundSchema,
};

export const tool$documentsGetChunkContent: ToolDefinition<typeof args> = {
  name: "documents-get-chunk-content",
  description: `Get Document Chunk Content

Returns the content of a document chunk in the requested format. Can be used to stream media of the content for audio/video documents.`,
  args,
  tool: async (client, args, ctx) => {
    const [result, apiCall] = await documentsGetChunkContent(
      client,
      args.request,
      { fetchOptions: { signal: ctx.signal } },
    ).$inspect();

    if (!result.ok) {
      return {
        content: [{ type: "text", text: result.error.message }],
        isError: true,
      };
    }

    const value = result.value;

    return formatResult(value, apiCall);
  },
};
