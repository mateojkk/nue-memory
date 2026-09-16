'use client';

import { useState, useEffect } from 'react';
import { magic } from '@/lib/auth/magic';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fallback demo user state when Magic key is not yet set in environment
  const [demoUser, setDemoUser] = useState<{ email: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('nue_demo_user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
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

  const loginWithMagic = async (targetEmail: string) => {
    if (!magic) {
      // Offline / Keyless demo fallback
      const u = { email: targetEmail };
      setDemoUser(u);
      if (typeof window !== 'undefined') {
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
      sessionStorage.removeItem('nue_demo_user');
    }
  };

  return {
    ready: !loading,
    authenticated,
    user: user || demoUser,
    email,
    loginWithMagic,
    logout,
  };
}
