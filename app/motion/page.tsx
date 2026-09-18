import { NueApp } from '@/components/AppShell';
import type { DashboardTab } from '@/components/dashboard/NueDashboard';

interface MotionPageProps {
  searchParams?: Promise<{ tab?: string; project?: string }>;
}

/**
 * Media Memory route - the working surface.
 *
 * Opens Nue Memory directly on the Media Memory workspace, where the
 * create -> review -> feedback -> remember -> recall loop runs against the
 * real Livepeer Agent and Walrus MemWal layers.
 */
export const metadata = {
  title: 'Nue Motion · Autonomous Video with Agent Memory',
  description:
    'Nue Motion is the generative video agent powered by Nue and Livepeer: continuous memory recall across every video project with zero reprompting.',
};

export default async function MotionPage({ searchParams }: MotionPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const initialTab = (resolvedParams?.tab as DashboardTab) || undefined;
  const initialProjectId = resolvedParams?.project || undefined;
  return <NueApp view="dashboard" initialTab={initialTab} initialProjectId={initialProjectId} />;
}

