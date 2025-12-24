import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator,
  Users,
  GitBranch,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Percent,
  RefreshCw,
  Info
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CalculatorInputs {
  leftLegUsers: number;
  rightLegUsers: number;
  tierPrice: number;
  aiCostPercent: number;
  adminProfitPercent: number;
  directReferralPercent: number;
  cycleCommissionPercent: number;
  dailyCap: number;
}

export default function BinaryCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    leftLegUsers: 4,
    rightLegUsers: 4,
    tierPrice: 2990,
    aiCostPercent: 30,
    adminProfitPercent: 10,
    directReferralPercent: 5,
    cycleCommissionPercent: 10,
    dailyCap: 50000
  });

  const CYCLE_VOLUME = 11960; // Fixed: ₱11,960 per leg to cycle

  const calculateResults = () => {
    const leftLegVolume = inputs.leftLegUsers * inputs.tierPrice;
    const rightLegVolume = inputs.rightLegUsers * inputs.tierPrice;
    const weakerLeg = Math.min(leftLegVolume, rightLegVolume);
    
    // How many cycles can be completed
    const cyclesCompleted = Math.floor(weakerLeg / CYCLE_VOLUME);
    
    // Volume used for cycles
    const volumeUsedPerLeg = cyclesCompleted * CYCLE_VOLUME;
    const totalMatchedVolume = cyclesCompleted * CYCLE_VOLUME * 2; // Both legs
    
    // Remaining volume after cycles
    const leftLegRemaining = leftLegVolume - volumeUsedPerLeg;
    const rightLegRemaining = rightLegVolume - volumeUsedPerLeg;
    
    // Calculate deductions
    const aiCostDeduction = totalMatchedVolume * (inputs.aiCostPercent / 100);
    const adminProfitDeduction = totalMatchedVolume * (inputs.adminProfitPercent / 100);
    const directReferralDeduction = totalMatchedVolume * (inputs.directReferralPercent / 100);
    const totalDeductions = aiCostDeduction + adminProfitDeduction + directReferralDeduction;
    
    // Distributable amount
    const distributableAmount = totalMatchedVolume - totalDeductions;
    
    // Commission calculation
    const commissionEarned = distributableAmount * (inputs.cycleCommissionPercent / 100);
    
    // Check if capped
    const isCapped = commissionEarned > inputs.dailyCap;
    const actualCommission = Math.min(commissionEarned, inputs.dailyCap);
    const commissionLost = commissionEarned - actualCommission;
    
    // Total volume from all purchases
    const totalPurchaseVolume = leftLegVolume + rightLegVolume;
    
    // What admin earns
    const adminEarnings = adminProfitDeduction + commissionLost;
    
    return {
      leftLegVolume,
      rightLegVolume,
      weakerLeg,
      cyclesCompleted,
      volumeUsedPerLeg,
      totalMatchedVolume,
      leftLegRemaining,
      rightLegRemaining,
      aiCostDeduction,
      adminProfitDeduction,
      directReferralDeduction,
      totalDeductions,
      distributableAmount,
      commissionEarned,
      isCapped,
      actualCommission,
      commissionLost,
      totalPurchaseVolume,
      adminEarnings
    };
  };

  const results = calculateResults();

  const presetScenarios = [
    { name: '4×₱2,990 Both Legs', left: 4, right: 4, price: 2990 },
    { name: '2×₱5,990 Both Legs', left: 2, right: 2, price: 5990 },
    { name: '1×₱11,960 Both Legs', left: 1, right: 1, price: 11960 },
    { name: 'Mixed: 4×₱2,990 L + 2×₱5,990 R', left: 4, right: 2, price: 2990 },
    { name: 'Imbalanced: 8×₱2,990 L + 4×₱2,990 R', left: 8, right: 4, price: 2990 },
  ];

  const applyPreset = (left: number, right: number, price: number) => {
    setInputs(prev => ({
      ...prev,
      leftLegUsers: left,
      rightLegUsers: right,
      tierPrice: price
    }));
  };

  return (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="space-y-6 p-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Binary Cycle Calculator
            </CardTitle>
            <CardDescription>
              Calculate potential earnings based on team structure. Fixed cycle volume: ₱11,960 per leg.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preset Scenarios */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Scenarios</Label>
              <div className="flex flex-wrap gap-2">
                {presetScenarios.map((scenario, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(scenario.left, scenario.right, scenario.price)}
                  >
                    {scenario.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Input Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Leg */}
              <div className="space-y-4 p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Left Leg</span>
                </div>
                <div className="space-y-2">
                  <Label>Number of Users</Label>
                  <Input
                    type="number"
                    min={0}
                    value={inputs.leftLegUsers}
                    onChange={(e) => setInputs(prev => ({ ...prev, leftLegUsers: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Volume: ₱{results.leftLegVolume.toLocaleString()}
                </div>
              </div>

              {/* Right Leg */}
              <div className="space-y-4 p-4 rounded-lg border bg-green-500/5 border-green-500/20">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-green-500 rotate-180" />
                  <span className="font-medium">Right Leg</span>
                </div>
                <div className="space-y-2">
                  <Label>Number of Users</Label>
                  <Input
                    type="number"
                    min={0}
                    value={inputs.rightLegUsers}
                    onChange={(e) => setInputs(prev => ({ ...prev, rightLegUsers: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Volume: ₱{results.rightLegVolume.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Tier Price Selection */}
            <div className="space-y-2">
              <Label>Tier Price (per user)</Label>
              <Select 
                value={inputs.tierPrice.toString()} 
                onValueChange={(v) => setInputs(prev => ({ ...prev, tierPrice: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2990">₱2,990 (4 users = 1 cycle)</SelectItem>
                  <SelectItem value="5990">₱5,990 (2 users = 1 cycle)</SelectItem>
                  <SelectItem value="11960">₱11,960 (1 user = 1 cycle)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Commission Settings */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">AI Cost %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={inputs.aiCostPercent}
                  onChange={(e) => setInputs(prev => ({ ...prev, aiCostPercent: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Admin Profit %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={inputs.adminProfitPercent}
                  onChange={(e) => setInputs(prev => ({ ...prev, adminProfitPercent: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Direct Referral %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={inputs.directReferralPercent}
                  onChange={(e) => setInputs(prev => ({ ...prev, directReferralPercent: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Commission %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={inputs.cycleCommissionPercent}
                  onChange={(e) => setInputs(prev => ({ ...prev, cycleCommissionPercent: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Daily Cap (₱)</Label>
              <Input
                type="number"
                min={0}
                value={inputs.dailyCap}
                onChange={(e) => setInputs(prev => ({ ...prev, dailyCap: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cycle Matching */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="p-4 text-center">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-3xl font-bold">{results.cyclesCompleted}</p>
                  <p className="text-sm text-muted-foreground">Cycles Completed</p>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-3xl font-bold">₱{results.totalMatchedVolume.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Matched Volume</p>
                </CardContent>
              </Card>

              <Card className={`${results.isCapped ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <CardContent className="p-4 text-center">
                  {results.isCapped ? (
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  ) : (
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  )}
                  <p className={`text-3xl font-bold ${results.isCapped ? 'text-red-600' : 'text-green-600'}`}>
                    ₱{results.actualCommission.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {results.isCapped ? 'Capped Commission' : 'Full Commission'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <h4 className="font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Detailed Breakdown
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Weaker Leg Volume:</span>
                  <span className="font-medium">₱{results.weakerLeg.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Volume per Cycle (per leg):</span>
                  <span className="font-medium">₱{CYCLE_VOLUME.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cycles: {results.weakerLeg.toLocaleString()} ÷ {CYCLE_VOLUME.toLocaleString()} =</span>
                  <span className="font-medium">{results.cyclesCompleted} cycles</span>
                </div>

                <Separator className="my-2" />

                <div className="flex justify-between">
                  <span>Matched Volume ({results.cyclesCompleted} × ₱{CYCLE_VOLUME.toLocaleString()} × 2):</span>
                  <span className="font-medium">₱{results.totalMatchedVolume.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-purple-600">
                  <span>- AI Cost ({inputs.aiCostPercent}%):</span>
                  <span>-₱{results.aiCostDeduction.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-amber-600">
                  <span>- Admin Profit ({inputs.adminProfitPercent}%):</span>
                  <span>-₱{results.adminProfitDeduction.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-cyan-600">
                  <span>- Direct Referral ({inputs.directReferralPercent}%):</span>
                  <span>-₱{results.directReferralDeduction.toLocaleString()}</span>
                </div>

                <Separator className="my-2" />

                <div className="flex justify-between font-medium">
                  <span>Distributable Amount:</span>
                  <span>₱{results.distributableAmount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-blue-600">
                  <span>Commission ({inputs.cycleCommissionPercent}%):</span>
                  <span className="font-medium">₱{results.commissionEarned.toLocaleString()}</span>
                </div>

                {results.isCapped && (
                  <>
                    <div className="flex justify-between text-red-600">
                      <span>Daily Cap Applied:</span>
                      <span>-₱{results.commissionLost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Actual Commission Paid:</span>
                      <span>₱{results.actualCommission.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Remaining Volume */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-muted-foreground">Left Leg Remaining</p>
                <p className="text-lg font-bold">₱{results.leftLegRemaining.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-muted-foreground">Right Leg Remaining</p>
                <p className="text-lg font-bold">₱{results.rightLegRemaining.toLocaleString()}</p>
              </div>
            </div>

            {/* Admin Earnings */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Admin Earnings</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Admin Profit (₱{results.adminProfitDeduction.toLocaleString()}) + 
                    Flushed (₱{results.commissionLost.toLocaleString()})
                  </p>
                </div>
                <p className="text-2xl font-bold text-amber-700">₱{results.adminEarnings.toLocaleString()}</p>
              </div>
            </div>

            {/* Cycle Examples Info */}
            <div className="p-4 rounded-lg bg-muted/50 text-sm">
              <h5 className="font-medium mb-2">💡 Cycle Matching Examples (₱11,960 per leg)</h5>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 4 users × ₱2,990 = ₱11,960 ✓</li>
                <li>• 2 users × ₱5,990 = ₱11,980 ✓ (₱20 carried over)</li>
                <li>• 1 user × ₱11,960 = ₱11,960 ✓</li>
                <li>• Mixed: Any combination totaling ≥₱11,960</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}