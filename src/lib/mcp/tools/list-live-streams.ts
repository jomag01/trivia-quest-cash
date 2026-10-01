import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_live_streams",
  title: "List live selling streams",
  description: "List sellers who are live selling on Triviabees right now.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("live_streams")
      .select("id, title, viewer_count, started_at")
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const streams = (data ?? []).map((s: any) => ({
      id: String(s.id), title: String(s.title ?? ""), viewers: Number(s.viewer_count ?? 0),
      url: `https://triviabees.com/live?id=${s.id}`,
    }));
    return { content: [{ type: "text", text: JSON.stringify(streams) }], structuredContent: { streams } };
  },
});
