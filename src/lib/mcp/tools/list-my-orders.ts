import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_orders",
  title: "List my orders",
  description: "List the signed-in user's most recent shop orders with status and total.",
  inputSchema: { limit: z.number().int().min(1).max(50).default(10).describe("How many orders to return.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("orders")
      .select("id, status, total_amount, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const orders = (data ?? []).map((o: any) => ({
      id: String(o.id), status: String(o.status ?? ""), total: Number(o.total_amount ?? 0), created_at: String(o.created_at),
    }));
    return { content: [{ type: "text", text: JSON.stringify(orders) }], structuredContent: { orders } };
  },
});
