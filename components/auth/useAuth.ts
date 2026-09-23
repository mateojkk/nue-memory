'use client';

import { useState, useEffect } from 'react';
import { magic } from '@/lib/auth/magic';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Persistent user state fallback across refreshes
  const [demoUser, setDemoUser] = useState<{ email: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nue_demo_user') || sessionStorage.getItem('nue_demo_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Fallback to string
        }
      }
      const savedEmail = localStorage.getItem('nue_user_email');
      if (savedEmail) {
        return { email: savedEmail };
      }
    }
    return null;
  });

  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [livepeerKey, setLivepeerKey] = useState<{ has: boolean; tail: string | null }>({
    has: false,
    tail: null,
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      if (magic) {
        const isLoggedIn = await magic.user.isLoggedIn();
        if (isLoggedIn) {
          const metadata = await magic.user.getInfo();
          setUser(metadata);
          return;
        }
      }
    } catch (e) {
      console.warn('Magic auth check failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const authenticated = Boolean(user?.email || demoUser?.email);
  const email = user?.email || demoUser?.email || null;

  // Load and sync user-specific credit balance from database (/api/profile).
  // Balance starts unknown (null), never at the $10 grant default - showing
  // the default first is what flashed $10 over real balances.
  useEffect(() => {
    if (email) {
      loadProfile(email);
    } else {
      setCreditsLoading(false);
    }
  }, [email]);

  const loadProfile = async (userEmail: string) => {
    try {
      const res = await fetch(`/api/profile?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (data.success && data.profile) {
        setCreditBalance(Number(data.profile.credit_balance ?? 10.0));
        setLivepeerKey({
          has: Boolean(data.profile.hasLivepeerKey),
          tail: typeof data.profile.livepeerKeyTail === 'string' ? data.profile.livepeerKeyTail : null,
        });
        if (data.profile.theme === 'light' || data.profile.theme === 'dark') {
          const isDarkTheme = data.profile.theme === 'dark';
          document.documentElement.classList.toggle('dark', isDarkTheme);
          try {
            localStorage.setItem('nue-theme', data.profile.theme);
            window.dispatchEvent(new CustomEvent('nue-theme-sync', { detail: data.profile.theme }));
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Failed to load user profile credit balance:', e);
    } finally {
      setCreditsLoading(false);
    }
  };

  const saveLivepeerKey = async (key: string): Promise<string | null> => {
    if (!email) return 'Sign in first.';
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'set_livepeer_key', key }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        return data?.error || 'Could not save the key.';
      }
      setLivepeerKey({ has: true, tail: data.livepeerKeyTail || null });
      return null;
    } catch {
      return 'Network error saving the key.';
    }
  };

  const removeLivepeerKey = async (): Promise<void> => {
    if (!email) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'remove_livepeer_key' }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setLivepeerKey({ has: false, tail: null });
      }
    } catch (e) {
      console.warn('Failed to remove Livepeer key:', e);
    }
  };

  const deductCredits = async (amount = 0.05) => {
    if (!email) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'deduct', amount }),
      });
      const data = await res.json();
      if (data.success && data.credit_balance !== undefined) {
        setCreditBalance(Number(data.credit_balance));
        return data.credit_balance;
      }
    } catch (e) {
      console.warn('Failed to deduct credits:', e);
    }
  };

  const loginWithMagic = async (targetEmail: string) => {
    if (!magic) {
      // Offline / Keyless demo fallback
      const u = { email: targetEmail };
      setDemoUser(u);
      if (typeof window !== 'undefined') {
        localStorage.setItem('nue_demo_user', JSON.stringify(u));
        sessionStorage.setItem('nue_demo_user', JSON.stringify(u));
      }
      return { success: true, fallback: true };
    }

    // Magic Labs authentic passwordless email login
    const didToken = await magic.auth.loginWithMagicLink({
      email: targetEmail,
      showUI: true,
    });

    if (didToken) {
      const metadata = await magic.user.getInfo();
      setUser(metadata);
      return { success: true, didToken };
    }

    throw new Error('Magic login was cancelled or failed.');
  };

  const logout = async () => {
    try {
      if (magic) {
        await magic.user.logout();
      }
    } catch (e) {
      console.warn('Magic logout error:', e);
    }
    setUser(null);
    setDemoUser(null);
    setCreditBalance(null);
    setCreditsLoading(false);
    setLivepeerKey({ has: false, tail: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nue_demo_user');
      sessionStorage.removeItem('nue_demo_user');
    }
  };

  return {
    ready: !loading,
    authenticated,
    user: user || demoUser,
    email,
    creditBalance,
    creditsLoading,
    livepeerKey,
    saveLivepeerKey,
    removeLivepeerKey,
    deductCredits,
    refreshCredits: () => email && loadProfile(email),
    loginWithMagic,
    logout,
  };
}
