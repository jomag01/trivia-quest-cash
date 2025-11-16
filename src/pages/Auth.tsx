import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Mail, Lock, User, Globe, Eye, EyeOff } from "lucide-react";
import { CURRENCIES, getCurrencyFromCountry, detectUserCountry, type CurrencyCode } from "@/lib/currencies";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState<string>("PH");
  const [currency, setCurrency] = useState<CurrencyCode>("PHP");
  const [detectingCountry, setDetectingCountry] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);

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

  const validatePhoneNumber = (phone: string): boolean => {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (resetMethod === 'email') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });

        if (error) throw error;
        
        toast.success("Password reset email sent! Check your inbox.");
        setIsForgotPassword(false);
        setIsLogin(true);
      } else {
        // Validate phone number format
        if (!validatePhoneNumber(phoneNumber)) {
          toast.error("Invalid phone format. Use E.164 format (e.g., +639123456789)");
          setLoading(false);
          return;
        }

        // Send OTP to phone number
        const { error } = await supabase.auth.signInWithOtp({
          phone: phoneNumber,
        });

        if (error) throw error;
        
        toast.success("Verification code sent to your phone!");
        setIsVerifying(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!validatePhoneNumber(phoneNumber)) {
        toast.error("Invalid phone format. Use E.164 format (e.g., +639123456789)");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: verificationCode,
        type: 'sms'
      });

      if (error) throw error;
      
      toast.success("Phone verified! You can now set a new password.");
      setIsForgotPassword(false);
      setIsVerifying(false);
      setIsLogin(true);
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(false);

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
        // Validate referral code if provided and capture referrer id
        let referrerId: string | null = null;
        const normalizedCode = referralCode.trim().toUpperCase();
        if (normalizedCode) {
          const { data, error } = await supabase.functions.invoke('validate-referral', {
            body: { referralCode: normalizedCode }
          });

          if (error || !data?.valid) {
            toast.error(data?.error || "Invalid referral code. Please check and try again.");
            setLoading(false);
            return;
          }
          referrerId = data.referrerId;
        }

        // Prepare user metadata with referrer_id for the trigger
        const userData: any = {
          full_name: fullName,
          country: country,
          currency: currency,
          currency_symbol: CURRENCIES[currency].symbol,
          referrer_id: referrerId
        };

        const { error, data: signUpData } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: userData,
          },
        });

        if (error) throw error;
        
        // Update profile with referrer_id after signup
        if (signUpData.user && referrerId) {
          await (supabase as any)
            .from('profiles')
            .update({ referrer_id: referrerId })
            .eq('id', signUpData.user.id);
        }
        
        toast.success("Account created! You can now login.");
        setIsLogin(true);
      }
    } catch (error: any) {
      if (isLogin && (error.message.includes("Invalid login credentials") || error.message.includes("Invalid"))) {
        setLoginError(true);
        toast.error("Incorrect email or password");
      } else {
        toast.error(error.message || "An error occurred");
      }
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
            {isForgotPassword ? "Reset Password" : isLogin ? "Welcome Back" : "Join GameWin"}
          </h1>
          <p className="text-muted-foreground">
            {isForgotPassword 
              ? "Enter your email to receive reset instructions" 
              : isLogin 
                ? "Login to continue playing" 
                : "Create your account and start earning"}
          </p>
        </div>

        {isForgotPassword ? (
          isVerifying ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsVerifying(false);
                    setIsForgotPassword(false);
                    setIsLogin(true);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label>Reset Method</Label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setResetMethod('email')}
                    className={`flex-1 p-2 rounded border ${
                      resetMethod === 'email' 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border'
                    }`}
                  >
                    <Mail className="w-4 h-4 mx-auto mb-1" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetMethod('phone')}
                    className={`flex-1 p-2 rounded border ${
                      resetMethod === 'phone' 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border'
                    }`}
                  >
                    <User className="w-4 h-4 mx-auto mb-1" />
                    Phone
                  </button>
                </div>
              </div>

              {resetMethod === 'email' ? (
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
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    placeholder="+639123456789"
                  />
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +63 for Philippines)
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : resetMethod === 'email' ? "Send Reset Link" : "Send Code"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsLogin(true);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )
        ) : (
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

              <div className="space-y-2">
                <Label htmlFor="referralCode" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Referral Code (Optional)
                </Label>
                <Input
                  id="referralCode"
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Enter referrer's code (optional)"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a referral code if you have one
                </p>
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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
          </Button>

          {isLogin && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setLoginError(false);
                }}
                className={`text-sm transition-colors ${
                  loginError 
                    ? "text-primary font-semibold hover:underline animate-pulse" 
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {loginError ? "Reset your password here" : "Forgot password?"}
              </button>
            </div>
          )}
        </form>
        )}

        {!isForgotPassword && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Auth;
