/*
 * Code generated by Speakeasy (https://speakeasy.com). DO NOT EDIT.
 */

import { connectionsSetEnabled } from "../../funcs/connectionsSetEnabled.js";
import * as operations from "../../models/operations/index.js";
import { formatResult, ToolDefinition } from "../tools.js";

const args = {
  request:
    operations
      .SetConnectionEnabledConnectionsConnectionIdEnabledPutRequest$inboundSchema,
};

export const tool$connectionsSetEnabled: ToolDefinition<typeof args> = {
  name: "connections-set-enabled",
  description: `Set Connection Enabled

Enable or disable the connection. A disabled connection won't sync.`,
  args,
  tool: async (client, args, ctx) => {
    const [result, apiCall] = await connectionsSetEnabled(
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
