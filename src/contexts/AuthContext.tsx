import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyCode } from '@/lib/currencies';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
  currency: CurrencyCode;
  currency_symbol: string;
  referral_code: string;
  referred_by: string | null;
  is_verified_seller: boolean;
  seller_rating: number;
  total_reviews: number;
  username?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  birthday?: string | null;
  phone_number?: string | null;
}

type UserRole = 'admin' | 'user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as Profile);
      return;
    }

    // Auto-create profile if missing to prevent dashboard from stalling
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUser = userData?.user;

      const generatedReferral = `GAME${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

      const insertPayload = {
        id: userId,
        email: authUser?.email ?? null,
        full_name: (authUser?.user_metadata as any)?.full_name ?? (authUser?.user_metadata as any)?.name ?? null,
        country: (authUser?.user_metadata as any)?.country ?? null,
        currency: ((authUser?.user_metadata as any)?.currency as CurrencyCode) ?? 'PHP',
        currency_symbol: (authUser?.user_metadata as any)?.currency_symbol ?? '₱',
        referral_code: (authUser?.user_metadata as any)?.referral_code ?? generatedReferral,
        referred_by: (authUser?.user_metadata as any)?.referred_by ?? null,
      };
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .upsert([insertPayload], { onConflict: 'id' })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to create missing profile:", insertError);
        // Try fetching again in case it was created by the trigger
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (retryProfile) {
          setProfile(retryProfile as Profile);
        }
        return;
      }

      setProfile(newProfile as Profile);
    } catch (e) {
      console.error("Error handling missing profile:", e);
    }
  };
  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setUserRole(data.role as UserRole);
    } else {
      setUserRole('user'); // Default to 'user' role if no role found
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchUserRole(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserRole(null);
  };

  const isAdmin = userRole === 'admin';

  return (
    <AuthContext.Provider value={{ user, session, profile, userRole, isAdmin, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
