/*
 * Code generated by Speakeasy (https://speakeasy.com). DO NOT EDIT.
 */

import { partitionsList } from "../../funcs/partitionsList.js";
import * as operations from "../../models/operations/index.js";
import { formatResult, ToolDefinition } from "../tools.js";

const args = {
  request: operations.ListPartitionsPartitionsGetRequest$inboundSchema
    .optional(),
};

export const tool$partitionsList: ToolDefinition<typeof args> = {
  name: "partitions-list",
  description: `List Partitions

List all partitions sorted by name in ascending order. Results are paginated with a max limit of 100. When more partitions are available, a \`cursor\` will be provided. Use the \`cursor\` parameter to retrieve the subsequent page.`,
  args,
  tool: async (client, args, ctx) => {
    const [result, apiCall] = await partitionsList(
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

    const value = result.value.result;

    return formatResult(value, apiCall);
  },
};
