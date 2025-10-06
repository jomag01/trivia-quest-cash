import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Mail, Lock, User, Globe } from "lucide-react";
import { CURRENCIES, getCurrencyFromCountry, detectUserCountry, type CurrencyCode } from "@/lib/currencies";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState<string>("PH");
  const [currency, setCurrency] = useState<CurrencyCode>("PHP");
  const [detectingCountry, setDetectingCountry] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    const detectLocation = async () => {
      setDetectingCountry(true);
      const detectedCountry = await detectUserCountry();
      setCountry(detectedCountry);
      const detectedCurrency = getCurrencyFromCountry(detectedCountry);
      setCurrency(detectedCurrency);
      setDetectingCountry(false);
    };
    
    if (!isLogin) {
      detectLocation();
    }
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              country: country,
              currency: currency,
              currency_symbol: CURRENCIES[currency].symbol,
            },
          },
        });

        if (error) throw error;
        toast.success("Account created! You can now login.");
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md p-8 gradient-accent border-primary/20 shadow-card">
        <div className="text-center mb-8">
          <Trophy className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse-slow" />
          <h1 className="text-3xl font-bold text-gradient-gold mb-2">
            {isLogin ? "Welcome Back" : "Join GameWin"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? "Login to continue playing" : "Create your account and start earning"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Country
                </Label>
                <Select value={country} onValueChange={(value) => {
                  setCountry(value);
                  const newCurrency = getCurrencyFromCountry(value);
                  setCurrency(newCurrency);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 bg-background z-50">
                    <SelectItem value="PH">Philippines</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="SG">Singapore</SelectItem>
                    <SelectItem value="MY">Malaysia</SelectItem>
                    <SelectItem value="TH">Thailand</SelectItem>
                    <SelectItem value="ID">Indonesia</SelectItem>
                    <SelectItem value="VN">Vietnam</SelectItem>
                    <SelectItem value="KR">South Korea</SelectItem>
                    <SelectItem value="HK">Hong Kong</SelectItem>
                    <SelectItem value="NZ">New Zealand</SelectItem>
                    <SelectItem value="MX">Mexico</SelectItem>
                    <SelectItem value="BR">Brazil</SelectItem>
                    <SelectItem value="ZA">South Africa</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="IT">Italy</SelectItem>
                    <SelectItem value="ES">Spain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyCode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 bg-background z-50">
                    {Object.entries(CURRENCIES).map(([code, data]) => (
                      <SelectItem key={code} value={code}>
                        {data.symbol} {data.name} ({code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {detectingCountry && (
                  <p className="text-xs text-muted-foreground">Detecting your location...</p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
