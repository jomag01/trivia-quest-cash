import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calculator, TrendingUp, GitBranch, Sparkles, Zap, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface StairStepConfig {
  step_number: number;
  step_name: string;
  commission_percentage: number;
  sales_quota: number;
}

interface BinarySettings {
  cycleAmount: number;
  cycleCommission: number;
  maxCyclesPerDay: number;
  sponsorBonus: number;
}

export default function EarningsCalculator() {
  const [stairSteps, setStairSteps] = useState<StairStepConfig[]>([]);
  const [binarySettings, setBinarySettings] = useState<BinarySettings>({
    cycleAmount: 2000,
    cycleCommission: 200,
    maxCyclesPerDay: 10,
    sponsorBonus: 10,
  });
  
  // 7-level network inputs
  const [networkReferrals, setNetworkReferrals] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [avgPurchaseAmount, setAvgPurchaseAmount] = useState<number>(1000);
  const [networkMultiplier, setNetworkMultiplier] = useState<number>(5);
  
  // Stair step inputs
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [salesAmount, setSalesAmount] = useState<number>(10000);
  
  // Downline stair step inputs
  const [downlineCounts, setDownlineCounts] = useState<{ [key: number]: number }>({});
  const [downlineSales, setDownlineSales] = useState<{ [key: number]: number }>({});

  // Leadership breakaway inputs (21% leaders across 7 levels)
  const [leadershipCounts, setLeadershipCounts] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [leadershipSales, setLeadershipSales] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [leadershipMultiplier, setLeadershipMultiplier] = useState<number>(5);

  // Binary Affiliate inputs
  const [leftLegPurchases, setLeftLegPurchases] = useState<number>(0);
  const [rightLegPurchases, setRightLegPurchases] = useState<number>(0);
  const [directSponsors, setDirectSponsors] = useState<number>(0);
  const [sponsorAvgPurchase, setSponsorAvgPurchase] = useState<number>(5000);
  const [daysCalculation, setDaysCalculation] = useState<number>(30);

  // Commission rates for 7-level network (example percentages)
  const networkCommissionRates = [10, 5, 3, 2, 1, 0.5, 0.5];

  useEffect(() => {
    fetchStairSteps();
    fetchBinarySettings();
  }, []);

  const fetchStairSteps = async () => {
    try {
      const { data, error } = await supabase
        .from("stair_step_config")
        .select("step_number, step_name, commission_percentage, sales_quota")
        .eq("active", true)
        .order("step_number");

      if (error) throw error;
      setStairSteps(data || []);
    } catch (error) {
      console.error("Error fetching stair steps:", error);
    }
  };

  const fetchBinarySettings = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["binary_cycle_amount", "binary_cycle_commission", "binary_max_cycles_per_day", "binary_sponsor_bonus"]);

      if (data) {
        const settings: BinarySettings = {
          cycleAmount: 2000,
          cycleCommission: 200,
          maxCyclesPerDay: 10,
          sponsorBonus: 10,
        };

        data.forEach(setting => {
          switch (setting.key) {
            case "binary_cycle_amount":
              settings.cycleAmount = parseFloat(setting.value || "2000");
              break;
            case "binary_cycle_commission":
              settings.cycleCommission = parseFloat(setting.value || "200");
              break;
            case "binary_max_cycles_per_day":
              settings.maxCyclesPerDay = parseInt(setting.value || "10");
              break;
            case "binary_sponsor_bonus":
              settings.sponsorBonus = parseFloat(setting.value || "10");
              break;
          }
        });

        setBinarySettings(settings);
      }
    } catch (error) {
      console.error("Error fetching binary settings:", error);
    }
  };

  // Apply network multiplier to auto-populate levels
  const applyNetworkMultiplier = () => {
    const newReferrals = Array.from({ length: 7 }, (_, i) => 
      Math.pow(networkMultiplier, i + 1)
    );
    setNetworkReferrals(newReferrals);
  };

  // Apply leadership multiplier to auto-populate levels
  const applyLeadershipMultiplier = () => {
    const newCounts = Array.from({ length: 7 }, (_, i) => 
      Math.pow(leadershipMultiplier, i + 1)
    );
    setLeadershipCounts(newCounts);
  };

  // Calculate 7-level network earnings
  const calculateNetworkEarnings = () => {
    return networkReferrals.reduce((total, count, index) => {
      const commissionRate = networkCommissionRates[index] / 100;
      return total + (count * avgPurchaseAmount * commissionRate);
    }, 0);
  };

  // Calculate stair step earnings
  const calculateStairStepEarnings = () => {
    const step = stairSteps.find(s => s.step_number === currentStep);
    if (!step) return 0;
    return salesAmount * (step.commission_percentage / 100);
  };

  // Calculate downline differential earnings
  const calculateDownlineEarnings = () => {
    const currentStepData = stairSteps.find(s => s.step_number === currentStep);
    if (!currentStepData) return { total: 0, breakdown: [] };

    const breakdown: { level: string; percentage: number; earnings: number }[] = [];
    let total = 0;

    stairSteps.forEach(step => {
      if (step.step_number < currentStep) {
        const count = downlineCounts[step.step_number] || 0;
        const sales = downlineSales[step.step_number] || 0;
        const differentialPercentage = currentStepData.commission_percentage - step.commission_percentage;
        const earnings = sales * (differentialPercentage / 100);
        
        if (count > 0 && sales > 0) {
          breakdown.push({
            level: step.step_name,
            percentage: differentialPercentage,
            earnings: earnings
          });
          total += earnings;
        }
      }
    });

    return { total, breakdown };
  };

  // Calculate leadership breakaway earnings (2% from 21% leaders across 7 levels)
  const calculateLeadershipBreakaway = () => {
    return leadershipSales.reduce((total, sales, index) => {
      const count = leadershipCounts[index];
      if (count > 0 && sales > 0) {
        return total + (sales * 0.02); // 2% from all 21% leaders
      }
      return total;
    }, 0);
  };

  // Calculate Binary Affiliate Earnings
  const calculateBinaryEarnings = () => {
    const leftVolume = leftLegPurchases;
    const rightVolume = rightLegPurchases;
    const weakerLeg = Math.min(leftVolume, rightVolume);
    
    // Calculate cycles based on weaker leg
    const potentialCycles = Math.floor(weakerLeg / binarySettings.cycleAmount);
    const maxDailyCycles = binarySettings.maxCyclesPerDay * daysCalculation;
    const actualCycles = Math.min(potentialCycles, maxDailyCycles);
    
    const cycleEarnings = actualCycles * binarySettings.cycleCommission;
    const sponsorBonusEarnings = directSponsors * sponsorAvgPurchase * (binarySettings.sponsorBonus / 100);
    
    return {
      leftVolume,
      rightVolume,
      weakerLeg,
      potentialCycles,
      actualCycles,
      cycleEarnings,
      sponsorBonusEarnings,
      totalBinaryEarnings: cycleEarnings + sponsorBonusEarnings,
    };
  };

  const totalNetworkEarnings = calculateNetworkEarnings();
  const totalStairStepEarnings = calculateStairStepEarnings();
  const downlineEarnings = calculateDownlineEarnings();
  const leadershipBreakaway = calculateLeadershipBreakaway();
  const binaryEarnings = calculateBinaryEarnings();
  const grandTotal = totalNetworkEarnings + totalStairStepEarnings + downlineEarnings.total + leadershipBreakaway + binaryEarnings.totalBinaryEarnings;

  return (
    <Card className="w-full bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border-indigo-500/20">
      <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Earnings Calculator
            </CardTitle>
            <CardDescription>
              Calculate your potential earnings from all commission systems
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Binary Affiliate Calculator */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Binary Affiliate System
            </h3>
            <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0">
              AI Credits
            </Badge>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
              <CardContent className="pt-4 space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                  Left Leg Total Purchases (₱)
                </Label>
                <Input
                  type="number"
                  value={leftLegPurchases}
                  onChange={(e) => setLeftLegPurchases(Number(e.target.value))}
                  placeholder="0"
                  className="border-cyan-500/30 focus:border-cyan-500"
                />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30">
              <CardContent className="pt-4 space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Right Leg Total Purchases (₱)
                </Label>
                <Input
                  type="number"
                  value={rightLegPurchases}
                  onChange={(e) => setRightLegPurchases(Number(e.target.value))}
                  placeholder="0"
                  className="border-blue-500/30 focus:border-blue-500"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm">Direct Sponsors</Label>
              <Input
                type="number"
                value={directSponsors}
                onChange={(e) => setDirectSponsors(Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-sm">Avg Sponsor Purchase (₱)</Label>
              <Input
                type="number"
                value={sponsorAvgPurchase}
                onChange={(e) => setSponsorAvgPurchase(Number(e.target.value))}
                placeholder="5000"
              />
            </div>
            <div>
              <Label className="text-sm">Days to Calculate</Label>
              <Input
                type="number"
                value={daysCalculation}
                onChange={(e) => setDaysCalculation(Number(e.target.value))}
                placeholder="30"
              />
            </div>
          </div>

          {/* Binary Earnings Summary */}
          <div className="grid md:grid-cols-4 gap-3">
            <Card className="bg-purple-500/10 border-purple-500/30">
              <CardContent className="pt-3">
                <p className="text-xs text-muted-foreground">Weaker Leg</p>
                <p className="text-lg font-bold text-purple-600">
                  ₱{binaryEarnings.weakerLeg.toLocaleString('en-PH')}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-indigo-500/10 border-indigo-500/30">
              <CardContent className="pt-3">
                <p className="text-xs text-muted-foreground">Cycles Matched</p>
                <p className="text-lg font-bold text-indigo-600">
                  {binaryEarnings.actualCycles}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-cyan-500/10 border-cyan-500/30">
              <CardContent className="pt-3">
                <p className="text-xs text-muted-foreground">Cycle Earnings</p>
                <p className="text-lg font-bold text-cyan-600">
                  ₱{binaryEarnings.cycleEarnings.toLocaleString('en-PH')}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="pt-3">
                <p className="text-xs text-muted-foreground">Sponsor Bonus</p>
                <p className="text-lg font-bold text-amber-600">
                  ₱{binaryEarnings.sponsorBonusEarnings.toLocaleString('en-PH')}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 p-4 rounded-lg border border-cyan-500/30">
            <div className="flex justify-between items-center">
              <span className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-500" />
                Binary Affiliate Earnings:
              </span>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                ₱{binaryEarnings.totalBinaryEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ₱{binarySettings.cycleCommission}/cycle × {binaryEarnings.actualCycles} cycles + {binarySettings.sponsorBonus}% sponsor bonus
            </p>
          </div>
        </div>

        <Separator className="bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

        {/* 7-Level Network Calculator */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              7-Level Network Affiliate
            </h3>
          </div>
          
          <div className="grid gap-3">
            <div>
              <Label htmlFor="avg-purchase">Average Purchase Amount (₱)</Label>
              <Input
                id="avg-purchase"
                type="number"
                value={avgPurchaseAmount}
                onChange={(e) => setAvgPurchaseAmount(Number(e.target.value))}
                placeholder="1000"
                className="border-violet-500/30 focus:border-violet-500"
              />
            </div>

            <div className="border rounded-lg p-3 bg-violet-500/5 border-violet-500/30">
              <Label htmlFor="network-multiplier" className="text-sm font-medium">Auto-populate in Multiples</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="network-multiplier"
                  type="number"
                  min="1"
                  value={networkMultiplier}
                  onChange={(e) => setNetworkMultiplier(Number(e.target.value))}
                  placeholder="5"
                  className="w-24"
                />
                <button
                  onClick={applyNetworkMultiplier}
                  className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-md text-sm hover:opacity-90 transition-opacity"
                >
                  Apply
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Enter a multiplier (e.g., 5) to auto-populate all levels exponentially
              </p>
            </div>

            {networkReferrals.map((count, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 items-center">
                <Label className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ 
                    backgroundColor: `hsl(${260 + index * 15}, 70%, 50%)` 
                  }}></span>
                  Level {index + 1}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={count}
                  onChange={(e) => {
                    const newReferrals = [...networkReferrals];
                    newReferrals[index] = Number(e.target.value);
                    setNetworkReferrals(newReferrals);
                  }}
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">
                  {networkCommissionRates[index]}% = ₱{(count * avgPurchaseAmount * networkCommissionRates[index] / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 p-4 rounded-lg border border-violet-500/30">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Network Earnings:</span>
              <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                ₱{totalNetworkEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <Separator className="bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

        {/* Stair Step Calculator */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Stair-Step Plan
            </h3>
          </div>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="current-step">Your Current Step</Label>
              <Select
                value={currentStep.toString()}
                onValueChange={(value) => setCurrentStep(Number(value))}
              >
                <SelectTrigger className="border-orange-500/30 focus:border-orange-500">
                  <SelectValue placeholder="Select your step" />
                </SelectTrigger>
                <SelectContent>
                  {stairSteps.map((step) => (
                    <SelectItem key={step.step_number} value={step.step_number.toString()}>
                      {step.step_name} - {step.commission_percentage}% (Quota: ₱{step.sales_quota.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sales-amount">Team Sales Amount (₱)</Label>
              <Input
                id="sales-amount"
                type="number"
                value={salesAmount}
                onChange={(e) => setSalesAmount(Number(e.target.value))}
                placeholder="10000"
                className="border-orange-500/30 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 p-4 rounded-lg border border-orange-500/30">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Personal Sales Earnings:</span>
              <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                ₱{totalStairStepEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {stairSteps.find(s => s.step_number === currentStep) && (
              <p className="text-xs text-muted-foreground mt-2">
                At {stairSteps.find(s => s.step_number === currentStep)?.commission_percentage}% commission rate
              </p>
            )}
          </div>

          {/* Downline Differential Earnings */}
          <div className="space-y-3 mt-6">
            <h4 className="font-semibold text-sm">Earnings from Downlines Below Your Level</h4>
            <p className="text-xs text-muted-foreground">
              Calculate how much you earn from team members at lower steps (based on percentage difference)
            </p>
            
            {stairSteps
              .filter(step => step.step_number < currentStep)
              .map(step => (
                <div key={step.step_number} className="border rounded-lg p-3 space-y-2 border-orange-500/20 bg-orange-500/5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{step.step_name} ({step.commission_percentage}%)</span>
                    <Badge variant="outline" className="border-orange-500 text-orange-600">
                      You earn: {(stairSteps.find(s => s.step_number === currentStep)?.commission_percentage || 0) - step.commission_percentage}% difference
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Number of People</Label>
                      <Input
                        type="number"
                        min="0"
                        value={downlineCounts[step.step_number] || 0}
                        onChange={(e) => setDownlineCounts(prev => ({
                          ...prev,
                          [step.step_number]: Number(e.target.value)
                        }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Their Total Sales (₱)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={downlineSales[step.step_number] || 0}
                        onChange={(e) => setDownlineSales(prev => ({
                          ...prev,
                          [step.step_number]: Number(e.target.value)
                        }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  {downlineCounts[step.step_number] > 0 && downlineSales[step.step_number] > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Earnings: ₱{((downlineSales[step.step_number] || 0) * ((stairSteps.find(s => s.step_number === currentStep)?.commission_percentage || 0) - step.commission_percentage) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              ))}

            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4 rounded-lg mt-3 border border-amber-500/30">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Downline Differential Earnings:</span>
                <span className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  ₱{downlineEarnings.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

        {/* Leadership Breakaway Earnings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Leadership Breakaway (2% Override)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Earn 2% from all your downlines who are at 21% level, down to 7 levels deep
          </p>

          <div className="border rounded-lg p-3 bg-emerald-500/5 border-emerald-500/30 mb-3">
            <Label htmlFor="leadership-multiplier" className="text-sm font-medium">Auto-populate in Multiples</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="leadership-multiplier"
                type="number"
                min="1"
                value={leadershipMultiplier}
                onChange={(e) => setLeadershipMultiplier(Number(e.target.value))}
                placeholder="5"
                className="w-24"
              />
              <button
                onClick={applyLeadershipMultiplier}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-md text-sm hover:opacity-90 transition-opacity"
              >
                Apply
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Enter a multiplier (e.g., 5) to auto-populate all levels exponentially
            </p>
          </div>

          <div className="space-y-3">
            {leadershipCounts.map((count, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2 border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ 
                      backgroundColor: `hsl(${160 + index * 10}, 70%, 45%)` 
                    }}></span>
                    Level {index + 1} - 21% Leaders
                  </span>
                  <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                    You earn: 2% override
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Number of 21% Leaders</Label>
                    <Input
                      type="number"
                      min="0"
                      value={count}
                      onChange={(e) => {
                        const newCounts = [...leadershipCounts];
                        newCounts[index] = Number(e.target.value);
                        setLeadershipCounts(newCounts);
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Their Total Sales (₱)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={leadershipSales[index]}
                      onChange={(e) => {
                        const newSales = [...leadershipSales];
                        newSales[index] = Number(e.target.value);
                        setLeadershipSales(newSales);
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {count > 0 && leadershipSales[index] > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Earnings: ₱{(leadershipSales[index] * 0.02).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 p-4 rounded-lg border border-emerald-500/30">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Leadership Breakaway Earnings:</span>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                ₱{leadershipBreakaway.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <Separator className="bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

        {/* Total Earnings */}
        <div className="bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 p-6 rounded-lg border border-indigo-500/30">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Total Potential Earnings</h3>
              <p className="text-xs text-muted-foreground">Combined from all commission systems</p>
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              ₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          
          {/* Earnings Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
            <div className="bg-cyan-500/20 p-2 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Binary</p>
              <p className="text-sm font-bold text-cyan-600">₱{binaryEarnings.totalBinaryEarnings.toLocaleString('en-PH')}</p>
            </div>
            <div className="bg-violet-500/20 p-2 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Network</p>
              <p className="text-sm font-bold text-violet-600">₱{totalNetworkEarnings.toLocaleString('en-PH')}</p>
            </div>
            <div className="bg-orange-500/20 p-2 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Stair-Step</p>
              <p className="text-sm font-bold text-orange-600">₱{totalStairStepEarnings.toLocaleString('en-PH')}</p>
            </div>
            <div className="bg-amber-500/20 p-2 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Downline</p>
              <p className="text-sm font-bold text-amber-600">₱{downlineEarnings.total.toLocaleString('en-PH')}</p>
            </div>
            <div className="bg-emerald-500/20 p-2 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Breakaway</p>
              <p className="text-sm font-bold text-emerald-600">₱{leadershipBreakaway.toLocaleString('en-PH')}</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 p-4 bg-muted/30 rounded-lg">
          <p>* <span className="text-cyan-600 font-medium">Binary:</span> ₱{binarySettings.cycleCommission}/cycle (₱{binarySettings.cycleAmount} matched), max {binarySettings.maxCyclesPerDay} cycles/day + {binarySettings.sponsorBonus}% sponsor bonus</p>
          <p>* <span className="text-violet-600 font-medium">Network:</span> Level 1 (10%), Level 2 (5%), Level 3 (3%), Level 4 (2%), Level 5-7 (1%, 0.5%, 0.5%)</p>
          <p>* <span className="text-orange-600 font-medium">Stair-step:</span> Based on your current rank and team sales</p>
          <p>* <span className="text-emerald-600 font-medium">Leadership:</span> 2% from all 21% leaders in your 7-level network</p>
        </div>
      </CardContent>
    </Card>
  );
}