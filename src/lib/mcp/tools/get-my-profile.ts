import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Get the signed-in user's Triviabees profile, referral code and Cash Wallet balance.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const [{ data: profile, error }, { data: wallet }] = await Promise.all([
      sb.from("profiles").select("full_name, referral_code").eq("id", uid).maybeSingle(),
      sb.from("cash_wallets").select("balance").eq("user_id", uid).maybeSingle(),
    ]);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const result = {
      full_name: (profile?.full_name as string | null) ?? null,
      referral_code: (profile?.referral_code as string | null) ?? null,
      cash_wallet_balance: Number(wallet?.balance ?? 0),
    };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: { profile: result } };
  },
});
