import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyOrders from "./tools/list-my-orders";
import listLiveStreams from "./tools/list-live-streams";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "triviabees",
  title: "triviabees",
  version: "0.1.0",
  instructions:
    "Tools for Triviabees. Use get_my_profile for the user's profile and wallet, list_my_orders for their orders, and list_live_streams to see who is live selling now.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyOrders, listLiveStreams],
});
