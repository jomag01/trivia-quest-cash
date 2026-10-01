# Project Architecture Rules

- Use `useCanGoLive` as the single client-side source for live-selling approval state so every entry point stays synchronized with admin changes.
- Save broadcaster camera snapshots in `live_streams.thumbnail_url` via the existing media uploader; the Live and Shop listings share this persisted preview so finished streams retain their image.
- MCP server lives in `src/lib/mcp/` (bundled to `supabase/functions/mcp` by mcpPlugin) with Supabase OAuth so AI assistants act as the signed-in user under RLS.
- Paid live sessions are started only via the live_start_session RPC (direct live_streams inserts are blocked) so pass payment is enforced server-side.
- Restream lives: Restream pushes RTMP to a per-stream IVS channel; stream keys live only in owner-only live_stream_ingest, never in live_streams (publicly readable).
