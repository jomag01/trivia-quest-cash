import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calculator, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StairStepConfig {
  step_number: number;
  step_name: string;
  commission_percentage: number;
  sales_quota: number;
}

export default function EarningsCalculator() {
  const [stairSteps, setStairSteps] = useState<StairStepConfig[]>([]);
  
  // 7-level network inputs
  const [networkReferrals, setNetworkReferrals] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [avgPurchaseAmount, setAvgPurchaseAmount] = useState<number>(1000);
  
  // Stair step inputs
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [salesAmount, setSalesAmount] = useState<number>(10000);
  
  // Downline stair step inputs
  const [downlineCounts, setDownlineCounts] = useState<{ [key: number]: number }>({});
  const [downlineSales, setDownlineSales] = useState<{ [key: number]: number }>({});

  // Commission rates for 7-level network (example percentages)
  const networkCommissionRates = [10, 5, 3, 2, 1, 0.5, 0.5];

  useEffect(() => {
    fetchStairSteps();
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

  const totalNetworkEarnings = calculateNetworkEarnings();
  const totalStairStepEarnings = calculateStairStepEarnings();
  const downlineEarnings = calculateDownlineEarnings();
  const grandTotal = totalNetworkEarnings + totalStairStepEarnings + downlineEarnings.total;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="w-6 h-6 text-primary" />
          <CardTitle>Earnings Calculator</CardTitle>
        </div>
        <CardDescription>
          Calculate your potential earnings from the 7-level network and stair-step plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 7-Level Network Calculator */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">7-Level Network Affiliate</h3>
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
              />
            </div>

            {networkReferrals.map((count, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 items-center">
                <Label>Level {index + 1}</Label>
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

          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Network Earnings:</span>
              <span className="text-xl font-bold text-primary">
                ₱{totalNetworkEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Stair Step Calculator */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Stair-Step Plan</h3>
          </div>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="current-step">Your Current Step</Label>
              <Select
                value={currentStep.toString()}
                onValueChange={(value) => setCurrentStep(Number(value))}
              >
                <SelectTrigger>
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
              />
            </div>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Personal Sales Earnings:</span>
              <span className="text-xl font-bold text-primary">
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
                <div key={step.step_number} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{step.step_name} ({step.commission_percentage}%)</span>
                    <span className="text-xs text-primary">
                      You earn: {(stairSteps.find(s => s.step_number === currentStep)?.commission_percentage || 0) - step.commission_percentage}% difference
                    </span>
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

            <div className="bg-primary/10 p-4 rounded-lg mt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Downline Differential Earnings:</span>
                <span className="text-xl font-bold text-primary">
                  ₱{downlineEarnings.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Total Earnings */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Total Potential Earnings</h3>
              <p className="text-xs text-muted-foreground">Combined from both systems</p>
            </div>
            <span className="text-3xl font-bold text-primary">
              ₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>* Network rates: Level 1 (10%), Level 2 (5%), Level 3 (3%), Level 4 (2%), Level 5-7 (1%, 0.5%, 0.5%)</p>
          <p>* Stair-step earnings are based on your current rank and team sales</p>
          <p>* Actual earnings may vary based on product purchases and qualification requirements</p>
        </div>
      </CardContent>
    </Card>
  );
}
