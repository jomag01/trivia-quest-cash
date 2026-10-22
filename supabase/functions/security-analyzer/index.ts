import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SEC_HEADERS = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];

function isPrivateHost(h: string) {
  return /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1)/i.test(h) || h.endsWith('.internal') || h.endsWith('.local');
}

async function scanWebsite(raw: string) {
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { throw new Error('Invalid website address'); }
  if (isPrivateHost(u.hostname)) throw new Error('Private addresses cannot be scanned');
  const facts: Record<string, unknown> = { url: u.toString(), https: u.protocol === 'https:' };
  try {
    const res = await fetch(u.toString(), { redirect: 'follow', signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'BeesBuy-SecurityAnalyzer/1.0' } });
    facts.status = res.status;
    facts.finalUrl = res.url;
    facts.finalHttps = res.url.startsWith('https://');
    const present: string[] = [], missing: string[] = [];
    SEC_HEADERS.forEach(h => (res.headers.get(h) ? present : missing).push(h));
    facts.securityHeadersPresent = present;
    facts.securityHeadersMissing = missing;
    facts.server = res.headers.get('server');
    facts.poweredBy = res.headers.get('x-powered-by');
    facts.cookies = (res.headers.get('set-cookie') || '').slice(0, 500);
    const html = (await res.text()).slice(0, 200000);
    facts.mixedContent = (html.match(/(src|href)=["']http:\/\//gi) || []).length;
    facts.externalScripts = [...new Set([...html.matchAll(/<script[^>]+src=["'](https?:\/\/[^"'/]+)/gi)].map(m => m[1]))].slice(0, 25);
    facts.iframes = (html.match(/<iframe/gi) || []).length;
    facts.suspiciousPatterns = ['eval(', 'atob(', 'document.write(', 'coinhive', 'cryptonight', 'unescape('].filter(p => html.toLowerCase().includes(p));
    facts.passwordFormOverHttp = /type=["']password/i.test(html) && !res.url.startsWith('https://');
  } catch (e) {
    facts.fetchError = e instanceof Error ? e.message : 'Site could not be reached';
  }
  return facts;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Please sign in to use the analyzer' }, 401);
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: 'Please sign in to use the analyzer' }, 401);

    const { mode, target, details } = await req.json();
    if (!['website', 'device', 'app'].includes(mode) || typeof target !== 'string' || !target.trim() || target.length > 500 || (details && String(details).length > 4000)) {
      return json({ error: 'Please fill in what you want to check' }, 400);
    }

    let evidence = '';
    if (mode === 'website') evidence = `Automated scan results (real, measured):\n${JSON.stringify(await scanWebsite(target.trim()), null, 2)}`;
    else evidence = `User-reported information (not measured; the analyzer cannot access the device):\n${mode === 'device' ? 'Device' : 'App'}: ${target}\nDetails/symptoms/installed apps/permissions: ${details || 'none given'}`;

    const system = `You are a careful cybersecurity analyst for consumers and small businesses. Analyze ONLY the evidence given. Never claim you scanned a phone, gadget, or app file — for devices/apps you assess reported symptoms, apps, and permissions. Do not invent vulnerabilities. Return ONLY JSON: {"riskScore":0-100,"riskLevel":"low|medium|high|critical","summary":"string","findings":[{"title":"string","severity":"low|medium|high|critical","category":"malware|privacy|configuration|unwanted-program|ai-risk|network|other","detail":"string","fix":"string"}],"recommendations":["string"],"limitations":"string"}. Cover malware signs, unwanted/adware programs, risky permissions, AI-related risks (prompt injection, data leaks to AI tools, deepfake scams) where relevant.`;

    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) throw new Error('AI is not configured');
    const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      signal: req.signal,
      headers: { 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'fetch', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra',
        input: [{ role: 'system', content: system }, { role: 'user', content: evidence }],
        store: false,
        reasoning: { effort: 'low' },
      }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      const msg = res.status === 429 ? 'Too many requests, try again shortly.' : res.status === 402 ? 'AI credits are used up.' : (b.error?.message || 'Analyzer unavailable right now.');
      return json({ error: msg }, res.status);
    }
    const data = await res.json();
    const text: string = data.output_text ?? (data.output || []).flatMap((o: any) => o.content || []).map((c: any) => c.text || '').join('');
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Could not read analysis');
    return json({ report: JSON.parse(m[0]), evidence: mode === 'website' ? evidence : null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Analysis failed' }, 500);
  }
});
