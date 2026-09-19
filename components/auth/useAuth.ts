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

  const [creditBalance, setCreditBalance] = useState<number>(10.0);

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

  // Load and sync user-specific credit balance from database (/api/profile)
  useEffect(() => {
    if (email) {
      loadProfile(email);
    }
  }, [email]);

  const loadProfile = async (userEmail: string) => {
    try {
      const res = await fetch(`/api/profile?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (data.success && data.profile) {
        setCreditBalance(Number(data.profile.credit_balance ?? 10.0));
      }
    } catch (e) {
      console.warn('Failed to load user profile credit balance:', e);
    }
  };

  const topupCredits = async (amount = 5.0) => {
    if (!email) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'topup', amount }),
      });
      const data = await res.json();
      if (data.success && data.credit_balance !== undefined) {
        setCreditBalance(Number(data.credit_balance));
        return data.credit_balance;
      }
    } catch (e) {
      console.warn('Failed to topup credits:', e);
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
    topupCredits,
    deductCredits,
    refreshCredits: () => email && loadProfile(email),
    loginWithMagic,
    logout,
  };
}
