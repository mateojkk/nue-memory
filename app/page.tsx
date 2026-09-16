import { NueApp } from '@/components/AppShell';

export const metadata = {
  title: 'Nue · The Memory Infrastructure Layer for AI Agents',
  description:
    'Nue is the memory infrastructure layer for AI agents: durable, evolving memory with extraction, conflict resolution, and durable decentralized storage.',
};

export default function Home() {
  return <NueApp view="landing" />;
}
