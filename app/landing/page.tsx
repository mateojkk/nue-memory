import { NueApp } from '@/components/AppShell';

/**
 * Landing route: Nue Memory, the memory infrastructure layer for AI agents.
 * Media Memory is presented as the first app built on it (single section).
 * The working app lives at /mediamemory; / redirects there.
 */
export const metadata = {
  title: 'Nue · The Memory Infrastructure Layer for AI Agents',
  description:
    'Nue is the memory infrastructure layer for AI agents: durable, evolving memory with extraction, conflict resolution, and durable decentralized storage.',
};

export default function LandingPage() {
  return <NueApp view="landing" />;
}
