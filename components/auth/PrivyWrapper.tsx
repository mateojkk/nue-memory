'use client';

import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

interface PrivyWrapperProps {
  children: React.ReactNode;
}

export function PrivyWrapper({ children }: PrivyWrapperProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

  // If no Privy app ID is configured yet, render children directly with fallback
  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#e08a3c',
          logo: '/logo-transparent.png',
          showWalletLoginFirst: false,
        },
        loginMethods: ['email'],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
