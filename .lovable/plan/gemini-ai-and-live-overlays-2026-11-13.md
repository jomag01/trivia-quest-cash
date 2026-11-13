# Gemini AI and Live Overlays

## User experience
- Use Gemini for the app's current OpenAI-powered chat, research, security analysis, and ad-copy generation, preserving their screens and response formats.
- Use Gemini image generation for AI Hub image creation and enhancements; use Gemini video generation for text-to-video and image-to-video. Keep music on its existing dedicated generator.
- From AI Hub, let sellers save generated artwork as live frames. In the live camera controls, add editable text, banner, and frame overlays, positioned on the preview and included in the broadcast.
- Use the uploaded live-shopping screenshot as the visual reference for bold top banners and a decorative frame, without embedding the screenshot itself.

## Technical approach
- Use `@lovable.dev/ai-gateway` only in edge functions; use discovered Gemini models and their generated SDK request/response types.
- Persist saved frame URLs per user in local browser storage; allow generated images to be uploaded through the existing media uploader. Render live overlays into the existing broadcast canvas compositor so viewers see them, not only the seller preview.
- Keep existing payment, live access, camera, and checkout behavior unchanged. Preserve the dedicated music provider because this request targets text/image/video generation.

## Validation
- Run project checks and existing tests, inspect current build logs, and verify Gemini defaults and the live overlay workflow in the preview where possible.
