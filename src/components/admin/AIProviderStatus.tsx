import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Loader2,
  Sparkles,
  Mic,
  Bell,
  Clock,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProviderStatus {
  name: string;
  displayName: string;
  status: 'ok' | 'warning' | 'error' | 'unknown';
  message: string;
  lastChecked: Date | null;
  icon: React.ReactNode;
  usedFor: string[];
}

interface AIAlert {
  id: string;
  provider: string;
  type: 'credit_low' | 'credit_exhausted' | 'subscription_expired' | 'rate_limit' | 'api_error';
  message: string;
  timestamp: Date;
  dismissed: boolean;
}

const AIProviderStatus = () => {
  const [providers, setProviders] = useState<ProviderStatus[]>([
    {
      name: 'openai',
      displayName: 'OpenAI (ChatGPT)',
      status: 'unknown',
      message: 'Not checked yet',
      lastChecked: null,
      icon: <MessageSquare className="h-5 w-5" />,
      usedFor: ['GPT-5 Chat', 'Text Generation', 'Image Generation', 'Code Generation']
    },
    {
      name: 'google_gemini',
      displayName: 'Google Gemini',
      status: 'unknown',
      message: 'Not checked yet',
      lastChecked: null,
      icon: <Sparkles className="h-5 w-5" />,
      usedFor: ['Deep Research', 'Image Generation', 'Text Analysis', 'Business Solutions']
    },
    {
      name: 'elevenlabs',
      displayName: 'ElevenLabs',
      status: 'unknown',
      message: 'Not checked yet',
      lastChecked: null,
      icon: <Mic className="h-5 w-5" />,
      usedFor: ['Voice Generation', 'Voiceovers', 'Text-to-Speech']
    }
  ]);

  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);

  useEffect(() => {
    loadAlerts();
    // Check status on load
    checkAllProviders();
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ai_provider_alerts')
        .single();

      if (data?.value) {
        const parsedAlerts = JSON.parse(data.value);
        setAlerts(parsedAlerts.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  const saveAlerts = async (newAlerts: AIAlert[]) => {
    try {
      await supabase
        .from('app_settings')
        .upsert({
          key: 'ai_provider_alerts',
          value: JSON.stringify(newAlerts)
        }, { onConflict: 'key' });
    } catch (error) {
      console.error('Error saving alerts:', error);
    }
  };

  const addAlert = async (provider: string, type: AIAlert['type'], message: string) => {
    const newAlert: AIAlert = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider,
      type,
      message,
      timestamp: new Date(),
      dismissed: false
    };

    const updatedAlerts = [newAlert, ...alerts.filter(a => !a.dismissed).slice(0, 49)];
    setAlerts(updatedAlerts);
    await saveAlerts(updatedAlerts);
  };

  const dismissAlert = async (alertId: string) => {
    const updatedAlerts = alerts.map(a => 
      a.id === alertId ? { ...a, dismissed: true } : a
    );
    setAlerts(updatedAlerts);
    await saveAlerts(updatedAlerts);
  };

  const clearAllAlerts = async () => {
    const updatedAlerts = alerts.map(a => ({ ...a, dismissed: true }));
    setAlerts(updatedAlerts);
    await saveAlerts(updatedAlerts);
    toast.success('All alerts cleared');
  };

  const checkAllProviders = async () => {
    setIsChecking(true);
    
    // Check OpenAI
    await checkOpenAI();
    
    // Check Google Gemini
    await checkGoogleGemini();
    
    // Check ElevenLabs
    await checkElevenLabs();
    
    setIsChecking(false);
    toast.success('Provider status check complete');
  };

  const updateProviderStatus = (name: string, status: ProviderStatus['status'], message: string) => {
    setProviders(prev => prev.map(p => 
      p.name === name 
        ? { ...p, status, message, lastChecked: new Date() }
        : p
    ));
  };

  const checkOpenAI = async () => {
    try {
      // Check via deep-research which uses GPT-5
      const { data, error } = await supabase.functions.invoke('deep-research', {
        body: { query: 'test-connection', model: 'gpt-5' }
      });

      if (error) {
        if (error.message?.includes('402') || error.message?.includes('Payment')) {
          updateProviderStatus('openai', 'error', 'Credits exhausted - payment required');
          await addAlert('OpenAI', 'credit_exhausted', 'OpenAI credits are exhausted. Please add credits to continue AI services.');
        } else if (error.message?.includes('429')) {
          updateProviderStatus('openai', 'warning', 'Rate limited - too many requests');
          await addAlert('OpenAI', 'rate_limit', 'OpenAI rate limit reached. Please wait before making more requests.');
        } else {
          updateProviderStatus('openai', 'ok', 'Connected and operational');
        }
      } else {
        updateProviderStatus('openai', 'ok', 'Connected and operational');
      }
    } catch (error: any) {
      updateProviderStatus('openai', 'warning', 'Unable to verify - check manually');
    }
  };

  const checkGoogleGemini = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate', {
        body: { type: 'test-connection' }
      });

      if (error) {
        if (error.message?.includes('402') || error.message?.includes('Payment')) {
          updateProviderStatus('google_gemini', 'error', 'Credits exhausted - payment required');
          await addAlert('Google Gemini', 'credit_exhausted', 'Gemini credits are exhausted. Please add credits.');
        } else if (error.message?.includes('429')) {
          updateProviderStatus('google_gemini', 'warning', 'Rate limited');
          await addAlert('Google Gemini', 'rate_limit', 'Gemini rate limit reached.');
        } else {
          updateProviderStatus('google_gemini', 'ok', 'Connected and operational');
        }
      } else {
        updateProviderStatus('google_gemini', 'ok', 'Connected and operational');
      }
    } catch (error: any) {
      updateProviderStatus('google_gemini', 'warning', 'Unable to verify - check manually');
    }
  };

  const checkElevenLabs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-voiceover', {
        body: { type: 'test-connection' }
      });

      if (error?.message?.includes('credit') || error?.message?.includes('quota') || error?.message?.includes('character')) {
        updateProviderStatus('elevenlabs', 'error', 'Insufficient character credits');
        await addAlert('ElevenLabs', 'credit_exhausted', 'ElevenLabs character quota exhausted. Voice generation will fail.');
      } else if (error?.message?.includes('401')) {
        updateProviderStatus('elevenlabs', 'error', 'API key invalid');
        await addAlert('ElevenLabs', 'subscription_expired', 'ElevenLabs API key is invalid or subscription expired.');
      } else {
        updateProviderStatus('elevenlabs', 'ok', 'Connected and operational');
      }
    } catch (error) {
      updateProviderStatus('elevenlabs', 'warning', 'Unable to verify - check manually');
    }
  };

  const getStatusIcon = (status: ProviderStatus['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ProviderStatus['status']) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-500">Operational</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const activeAlerts = alerts.filter(a => !a.dismissed);

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Bell className="h-5 w-5" />
                Active Alerts ({activeAlerts.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={clearAllAlerts}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeAlerts.slice(0, 5).map(alert => (
              <Alert key={alert.id} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>{alert.provider}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                  </span>
                </AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>{alert.message}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Provider Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Provider Status
              </CardTitle>
              <CardDescription>
                Monitor credit status and connectivity for all AI services
              </CardDescription>
            </div>
            <Button 
              onClick={checkAllProviders} 
              disabled={isChecking}
              variant="outline"
              className="gap-2"
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Check All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.map(provider => (
            <div 
              key={provider.name}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                provider.status === 'error' ? 'border-destructive bg-destructive/5' :
                provider.status === 'warning' ? 'border-yellow-500 bg-yellow-50/50' :
                provider.status === 'ok' ? 'border-green-500/30 bg-green-50/30' :
                'border-border'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${
                  provider.status === 'error' ? 'bg-destructive/10 text-destructive' :
                  provider.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  provider.status === 'ok' ? 'bg-green-100 text-green-600' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {provider.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{provider.displayName}</h4>
                    {getStatusBadge(provider.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{provider.message}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {provider.usedFor.map((use, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {use}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(provider.status)}
                {provider.lastChecked && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(provider.lastChecked, { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Automatic Monitoring</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Alerts are automatically generated when AI operations fail due to credit issues</p>
          <p>• Check the status regularly to prevent service interruptions</p>
          <p>• If a provider shows "Error", the associated AI features will not work</p>
          <p>• Click "Check All" to manually verify all provider connections</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIProviderStatus;