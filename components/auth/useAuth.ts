'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export function useAuth() {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const [demoUser, setDemoUser] = useState<{ email: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('nue_demo_user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  let privy: any = null;
  try {
    if (appId) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      privy = usePrivy();
    }
  } catch (e) {
    privy = null;
  }

  const authenticated = privy ? privy.authenticated : Boolean(demoUser);
  const ready = privy ? privy.ready : true;
  const user = privy?.user || demoUser;
  const email = privy?.user?.email?.address || demoUser?.email || null;

  const login = () => {
    if (privy) {
      privy.login();
    } else {
      const entered = prompt('Enter your email to activate your $10 Nue Motion grant:', 'creator@nue.ai');
      if (entered) {
        const u = { email: entered };
        setDemoUser(u);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('nue_demo_user', JSON.stringify(u));
        }
      }
    }
  };

  const logout = async () => {
    if (privy) {
      await privy.logout();
    } else {
      setDemoUser(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('nue_demo_user');
      }
    }
  };

  return {
    ready,
    authenticated,
    user,
    email,
    login,
    logout,
  };
}
