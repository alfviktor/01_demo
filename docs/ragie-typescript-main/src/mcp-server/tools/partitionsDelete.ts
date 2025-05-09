/*
 * Code generated by Speakeasy (https://speakeasy.com). DO NOT EDIT.
 */

import { partitionsDelete } from "../../funcs/partitionsDelete.js";
import * as operations from "../../models/operations/index.js";
import { formatResult, ToolDefinition } from "../tools.js";

const args = {
  request:
    operations.DeletePartitionPartitionsPartitionIdDeleteRequest$inboundSchema,
};

export const tool$partitionsDelete: ToolDefinition<typeof args> = {
  name: "partitions-delete",
  description: `Delete Partition

Deletes a partition and all of its associated data. This includes connections, documents, and partition specific instructions. This operation is irreversible.`,
  args,
  tool: async (client, args, ctx) => {
    const [result, apiCall] = await partitionsDelete(
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
