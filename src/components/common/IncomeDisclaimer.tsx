import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface IncomeDisclaimerProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export default function IncomeDisclaimer({ variant = 'compact', className = '' }: IncomeDisclaimerProps) {
  const [disclaimer, setDisclaimer] = useState<string | null>(null);

  useEffect(() => {
    fetchDisclaimer();
  }, []);

  const fetchDisclaimer = async () => {
    try {
      const { data, error } = await supabase
        .from("legal_terms")
        .select("content")
        .eq("term_type", "income_disclaimer")
        .eq("is_active", true)
        .single();

      if (!error && data) {
        setDisclaimer(data.content);
      }
    } catch (error) {
      // Use default if fetch fails
      setDisclaimer("**SEC Disclaimer:** This is a sales-based referral rewards program. Earnings are not guaranteed and depend on individual effort, team performance, and compliance with company rules.");
    }
  };

  const defaultDisclaimer = "**SEC Disclaimer:** This is a sales-based referral rewards program. Earnings are not guaranteed and depend on individual effort, team performance, and compliance with company rules.";
  const text = disclaimer || defaultDisclaimer;

  if (variant === 'compact') {
    return (
      <div className={`bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 ${className}`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <span className="font-semibold">SEC Disclaimer:</span> This is a sales-based referral rewards program. Earnings are not guaranteed and depend on individual effort, team performance, and compliance with company rules.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h4 className="font-semibold text-sm text-amber-700 dark:text-amber-300 mb-1">
            Income Disclaimer
          </h4>
          <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
            This is a sales-based referral rewards program where members earn bonuses based on the successful sale and use of company products and services. Earnings are not guaranteed and depend on individual effort, team performance, and compliance with company rules.
          </p>
        </div>
      </div>
    </div>
  );
}
