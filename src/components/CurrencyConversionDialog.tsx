import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight, 
  Loader2, 
  Diamond, 
  Coins, 
  Sparkles, 
  Wallet,
  ArrowLeftRight,
  AlertCircle
} from 'lucide-react';
import { useCurrencyConversion } from '@/hooks/useCurrencyConversion';

interface CurrencyConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CurrencyConversionDialog({ open, onOpenChange }: CurrencyConversionDialogProps) {
  const {
    settings,
    balances,
    loading,
    converting,
    convertCreditsToDiamonds,
    convertDiamondsToCredits,
    convertAiCreditsToCash,
    convertAiCreditsToDiamonds,
    convertAiCreditsToGameCredits,
    convertCashToDiamonds,
    convertCashToCredits,
    convertDiamondsToCash,
    convertCreditsToCash,
    previewCreditsToDiamonds,
    previewDiamondsToCredits,
    previewAiCreditsToCash,
    previewAiCreditsToDiamonds,
    previewAiCreditsToGameCredits,
    previewCashToDiamonds,
    previewCashToCredits,
    previewDiamondsToCash,
    previewCreditsToCash,
  } = useCurrencyConversion();

  const [activeTab, setActiveTab] = useState('credit-diamond');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!open) setAmount('');
  }, [open]);

  const getPreviewResult = () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return null;

    switch (activeTab) {
      case 'credit-diamond':
        return { value: previewCreditsToDiamonds(numAmount), unit: '💎', label: 'diamonds' };
      case 'diamond-credit':
        return { value: previewDiamondsToCredits(numAmount), unit: '🪙', label: 'credits' };
      case 'cash-diamond':
        return { value: previewCashToDiamonds(numAmount), unit: '💎', label: 'diamonds' };
      case 'cash-credit':
        return { value: previewCashToCredits(numAmount), unit: '🪙', label: 'credits' };
      case 'diamond-cash':
        return { value: previewDiamondsToCash(numAmount).toFixed(2), unit: '₱', label: 'cash', prefix: true };
      case 'credit-cash':
        return { value: previewCreditsToCash(numAmount).toFixed(2), unit: '₱', label: 'cash', prefix: true };
      case 'ai-cash':
        return { value: previewAiCreditsToCash(numAmount).toFixed(2), unit: '₱', label: 'cash', prefix: true };
      case 'ai-diamond':
        return { value: previewAiCreditsToDiamonds(numAmount), unit: '💎', label: 'diamonds' };
      case 'ai-game':
        return { value: previewAiCreditsToGameCredits(numAmount), unit: '🪙', label: 'game credits' };
      default:
        return null;
    }
  };

  const handleConvert = async () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return;

    let success = false;
    switch (activeTab) {
      case 'credit-diamond':
        success = await convertCreditsToDiamonds(numAmount);
        break;
      case 'diamond-credit':
        success = await convertDiamondsToCredits(numAmount);
        break;
      case 'cash-diamond':
        success = await convertCashToDiamonds(numAmount);
        break;
      case 'cash-credit':
        success = await convertCashToCredits(numAmount);
        break;
      case 'diamond-cash':
        success = await convertDiamondsToCash(numAmount);
        break;
      case 'credit-cash':
        success = await convertCreditsToCash(numAmount);
        break;
      case 'ai-cash':
        success = await convertAiCreditsToCash(numAmount);
        break;
      case 'ai-diamond':
        success = await convertAiCreditsToDiamonds(numAmount);
        break;
      case 'ai-game':
        success = await convertAiCreditsToGameCredits(numAmount);
        break;
    }

    if (success) {
      setAmount('');
    }
  };

  const getMaxAmount = () => {
    switch (activeTab) {
      case 'credit-diamond':
      case 'credit-cash':
        return balances.credits;
      case 'diamond-credit':
      case 'diamond-cash':
        return balances.diamonds;
      case 'cash-diamond':
      case 'cash-credit':
        return balances.cashBalance;
      case 'ai-cash':
      case 'ai-diamond':
      case 'ai-game':
        return balances.aiCredits;
      default:
        return 0;
    }
  };

  const isConversionEnabled = () => {
    switch (activeTab) {
      case 'credit-diamond':
        return settings.enableCreditToDiamond;
      case 'diamond-credit':
        return settings.enableDiamondToCredit;
      case 'cash-diamond':
        return settings.enableCashToDiamond;
      case 'cash-credit':
        return settings.enableCashToCredit;
      case 'diamond-cash':
        return settings.enableDiamondToCash;
      case 'credit-cash':
        return settings.enableCreditToCash;
      case 'ai-cash':
        return settings.enableAiCreditToCash;
      case 'ai-diamond':
        return settings.enableAiCreditToDiamond;
      case 'ai-game':
        return settings.enableAiCreditToGameCredit;
      default:
        return false;
    }
  };

  const preview = getPreviewResult();

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6" />
            Currency Conversion
          </DialogTitle>
          <DialogDescription>
            Convert between credits, diamonds, and AI credits
          </DialogDescription>
        </DialogHeader>

        {/* Balance Overview */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <Card className="p-2">
            <div className="text-center">
              <Coins className="w-4 h-4 mx-auto mb-1 text-amber-500" />
              <p className="text-sm font-bold">{balances.credits.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Credits</p>
            </div>
          </Card>
          <Card className="p-2">
            <div className="text-center">
              <Diamond className="w-4 h-4 mx-auto mb-1 text-cyan-500" />
              <p className="text-sm font-bold">{balances.diamonds.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Diamonds</p>
            </div>
          </Card>
          <Card className="p-2">
            <div className="text-center">
              <Sparkles className="w-4 h-4 mx-auto mb-1 text-purple-500" />
              <p className="text-sm font-bold">{balances.aiCredits.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">AI Credits</p>
            </div>
          </Card>
          <Card className="p-2">
            <div className="text-center">
              <Wallet className="w-4 h-4 mx-auto mb-1 text-green-500" />
              <p className="text-sm font-bold">₱{balances.cashBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Cash</p>
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setAmount(''); }}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="credit-diamond" className="text-xs">
              <Coins className="w-3 h-3 mr-1" /> ↔ <Diamond className="w-3 h-3 ml-1" />
            </TabsTrigger>
            <TabsTrigger value="cash-convert" className="text-xs">
              <Wallet className="w-3 h-3 mr-1" /> Cash
            </TabsTrigger>
            <TabsTrigger value="ai-convert" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" /> AI
            </TabsTrigger>
          </TabsList>

          {/* Credit ↔ Diamond */}
          <TabsContent value="credit-diamond" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={activeTab === 'credit-diamond' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('credit-diamond')}
                className="flex-1"
              >
                Credit → Diamond
              </Button>
              <Button 
                variant={activeTab === 'diamond-credit' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('diamond-credit')}
                className="flex-1"
              >
                Diamond → Credit
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="diamond-credit" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={activeTab === 'credit-diamond' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('credit-diamond')}
                className="flex-1"
              >
                Credit → Diamond
              </Button>
              <Button 
                variant={activeTab === 'diamond-credit' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('diamond-credit')}
                className="flex-1"
              >
                Diamond → Credit
              </Button>
            </div>
          </TabsContent>

          {/* Cash Conversions */}
          <TabsContent value="cash-convert" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={activeTab === 'cash-diamond' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('cash-diamond')}
                disabled={!settings.enableCashToDiamond}
              >
                <Wallet className="w-3 h-3 mr-1" /> → <Diamond className="w-3 h-3 ml-1" />
              </Button>
              <Button 
                variant={activeTab === 'cash-credit' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('cash-credit')}
                disabled={!settings.enableCashToCredit}
              >
                <Wallet className="w-3 h-3 mr-1" /> → <Coins className="w-3 h-3 ml-1" />
              </Button>
              <Button 
                variant={activeTab === 'diamond-cash' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('diamond-cash')}
                disabled={!settings.enableDiamondToCash}
              >
                <Diamond className="w-3 h-3 mr-1" /> → <Wallet className="w-3 h-3 ml-1" />
              </Button>
              <Button 
                variant={activeTab === 'credit-cash' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('credit-cash')}
                disabled={!settings.enableCreditToCash}
              >
                <Coins className="w-3 h-3 mr-1" /> → <Wallet className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </TabsContent>

          {/* Sub-tabs for cash */}
          {['cash-diamond', 'cash-credit', 'diamond-cash', 'credit-cash'].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={activeTab === 'cash-diamond' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setActiveTab('cash-diamond')}
                  disabled={!settings.enableCashToDiamond}
                >
                  Cash → Diamond
                </Button>
                <Button 
                  variant={activeTab === 'cash-credit' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setActiveTab('cash-credit')}
                  disabled={!settings.enableCashToCredit}
                >
                  Cash → Credit
                </Button>
                <Button 
                  variant={activeTab === 'diamond-cash' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setActiveTab('diamond-cash')}
                  disabled={!settings.enableDiamondToCash}
                >
                  Diamond → Cash
                </Button>
                <Button 
                  variant={activeTab === 'credit-cash' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setActiveTab('credit-cash')}
                  disabled={!settings.enableCreditToCash}
                >
                  Credit → Cash
                </Button>
              </div>
            </TabsContent>
          ))}

          {/* AI Credit Conversions */}
          <TabsContent value="ai-convert" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={activeTab === 'ai-cash' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('ai-cash')}
                disabled={!settings.enableAiCreditToCash}
              >
                <Wallet className="w-3 h-3 mr-1" /> Cash
              </Button>
              <Button 
                variant={activeTab === 'ai-diamond' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('ai-diamond')}
                disabled={!settings.enableAiCreditToDiamond}
              >
                <Diamond className="w-3 h-3 mr-1" /> Diamond
              </Button>
              <Button 
                variant={activeTab === 'ai-game' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('ai-game')}
                disabled={!settings.enableAiCreditToGameCredit}
              >
                <Coins className="w-3 h-3 mr-1" /> Game Credit
              </Button>
            </div>
          </TabsContent>

          {['ai-cash', 'ai-diamond', 'ai-game'].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={activeTab === 'ai-cash' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setActiveTab('ai-cash')}
                  disabled={!settings.enableAiCreditToCash}
                >
                  AI → Cash
                </Button>
                <Button 
                  variant={activeTab === 'ai-diamond' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setActiveTab('ai-diamond')}
                  disabled={!settings.enableAiCreditToDiamond}
                >
                  AI → Diamond
                </Button>
                <Button 
                  variant={activeTab === 'ai-game' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setActiveTab('ai-game')}
                  disabled={!settings.enableAiCreditToGameCredit}
                >
                  AI → Game Credit
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <Separator />

        {!isConversionEnabled() ? (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">This conversion type is currently disabled by admin.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount to Convert</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={getMaxAmount()}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAmount(getMaxAmount().toString())}
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Available: {getMaxAmount().toLocaleString()}
              </p>
            </div>

            {/* Preview */}
            {preview && parseFloat(amount) > 0 && (
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">You will receive:</p>
                    <p className="text-2xl font-bold">
                      {preview.prefix && preview.unit}
                      {preview.value}
                      {!preview.prefix && ` ${preview.unit}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {preview.label} (after {settings.conversionFeePercent}% fee)
                    </p>
                  </div>
                  <ArrowRight className="w-8 h-8 text-primary" />
                </div>
              </Card>
            )}

            {/* Rate Info */}
            <div className="text-xs text-muted-foreground space-y-1">
              {activeTab === 'credit-diamond' && (
                <p>Rate: {settings.creditToDiamondRate} credits = 1 diamond</p>
              )}
              {activeTab === 'diamond-credit' && (
                <p>Rate: 1 diamond = {settings.diamondToCreditRate} credits</p>
              )}
              {activeTab === 'cash-diamond' && (
                <p>Rate: ₱{settings.diamondBasePrice} = 1 diamond</p>
              )}
              {activeTab === 'cash-credit' && (
                <p>Rate: ₱{settings.diamondBasePrice} = {settings.diamondToCreditRate} credits</p>
              )}
              {activeTab === 'diamond-cash' && (
                <p>Rate: 1 diamond = ₱{settings.diamondBasePrice}</p>
              )}
              {activeTab === 'credit-cash' && (
                <p>Rate: {settings.diamondToCreditRate} credits = ₱{settings.diamondBasePrice}</p>
              )}
              {activeTab === 'ai-cash' && (
                <p>Rate: 1 AI credit = ₱{settings.aiCreditToCashRate.toFixed(2)}</p>
              )}
              {activeTab === 'ai-diamond' && (
                <p>Rate: {settings.aiCreditToDiamondRate} AI credits = 1 diamond</p>
              )}
              {activeTab === 'ai-game' && (
                <p>Rate: 1 AI credit = {settings.aiCreditToGameCreditRate} game credits</p>
              )}
              <p>Conversion Fee: {settings.conversionFeePercent}%</p>
            </div>

            <Button 
              className="w-full" 
              onClick={handleConvert}
              disabled={converting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > getMaxAmount()}
            >
              {converting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Convert Now
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
