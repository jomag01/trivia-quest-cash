import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, Loader2, Globe, Smartphone, AppWindow, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Mode = 'website' | 'device' | 'app';
interface Finding { title: string; severity: string; category: string; detail: string; fix: string }
interface Report { riskScore: number; riskLevel: string; summary: string; findings: Finding[]; recommendations: string[]; limitations: string }

const sevVariant = (s: string) => (s === 'critical' || s === 'high' ? 'destructive' : s === 'medium' ? 'default' : 'secondary') as const;

const copy: Record<Mode, { label: string; placeholder: string; details?: string }> = {
  website: { label: 'Website address', placeholder: 'example.com' },
  device: { label: 'Phone or gadget', placeholder: 'e.g. Samsung A54, Android 14 / smart TV / laptop', details: 'Describe symptoms (pop-up ads, battery drain, overheating, unknown apps, data use) and list installed apps you are unsure about.' },
  app: { label: 'App name', placeholder: 'e.g. Free VPN Pro', details: 'Where you got it (Play Store, link, APK), permissions it asks for, and anything strange it does.' },
};

export default function CyberSecurityAnalyzer() {
  const [mode, setMode] = useState<Mode>('website');
  const [target, setTarget] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  const run = async () => {
    if (!target.trim()) return toast.error('Please enter what to check');
    setLoading(true); setReport(null);
    const { data, error } = await supabase.functions.invoke('security-analyzer', { body: { mode, target, details } });
    setLoading(false);
    if (error || data?.error) return toast.error(data?.error || 'Please sign in and try again');
    setReport(data.report);
  };

  const c = copy[mode];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> AI Cyber Security Analyzer</CardTitle>
          <CardDescription>Check websites, phones, gadgets and apps for malware signs, unwanted programs, risky settings and AI-related threats.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={v => { setMode(v as Mode); setReport(null); }}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="website"><Globe className="h-4 w-4 mr-1" />Website</TabsTrigger>
              <TabsTrigger value="device"><Smartphone className="h-4 w-4 mr-1" />Device</TabsTrigger>
              <TabsTrigger value="app"><AppWindow className="h-4 w-4 mr-1" />App</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-2">
            <label className="text-sm font-medium">{c.label}</label>
            <Input value={target} onChange={e => setTarget(e.target.value)} placeholder={c.placeholder} maxLength={500} />
          </div>
          {c.details && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Details</label>
              <Textarea value={details} onChange={e => setDetails(e.target.value)} placeholder={c.details} rows={4} maxLength={4000} />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {mode === 'website' ? 'We visit the site and check its real security settings, then AI explains the results.' : 'A web app cannot open your device files. AI reviews what you describe — for a full scan also use your phone\'s built-in protection (e.g. Google Play Protect).'}
          </p>
          <Button onClick={run} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing…</> : <><ShieldCheck className="h-4 w-4 mr-2" />Analyze security</>}
          </Button>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Risk: {report.riskLevel?.toUpperCase()}</CardTitle>
              <Badge variant={sevVariant(report.riskLevel)}>{report.riskScore}/100</Badge>
            </div>
            <Progress value={report.riskScore} />
            <CardDescription className="pt-2">{report.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.findings?.map((f, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium flex items-center gap-1"><AlertTriangle className="h-4 w-4 shrink-0" />{f.title}</p>
                  <Badge variant={sevVariant(f.severity)}>{f.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{f.category}</p>
                <p className="text-sm">{f.detail}</p>
                <p className="text-sm"><span className="font-medium">Fix: </span>{f.fix}</p>
              </div>
            ))}
            {report.recommendations?.length > 0 && (
              <div>
                <p className="font-medium mb-1">Recommendations</p>
                <ul className="list-disc pl-5 text-sm space-y-1">{report.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{report.limitations}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
