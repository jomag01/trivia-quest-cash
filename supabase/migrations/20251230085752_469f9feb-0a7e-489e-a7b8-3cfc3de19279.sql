-- Remove Runway from ai_provider_pricing (no longer used)
DELETE FROM public.ai_provider_pricing WHERE provider_name = 'Runway';

-- Add Google Veo3 for video generation if not exists
INSERT INTO public.ai_provider_pricing (provider_name, model_name, input_cost_per_1k, output_cost_per_1k, image_cost, video_cost_per_second, audio_cost_per_minute, notes)
VALUES ('Google', 'veo3', 0, 0, 0, 0.02, 0, 'Google Veo3 video generation via Lovable AI')
ON CONFLICT DO NOTHING;

-- Update existing Google Gemini entry to include image generation cost
UPDATE public.ai_provider_pricing 
SET image_cost = 0.01, notes = 'Google Gemini for text, images, and research'
WHERE provider_name = 'Google' AND model_name LIKE '%gemini%';