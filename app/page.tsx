import { NueApp } from '@/components/AppShell';

/**
 * Landing route: Nue Memory, the memory infrastructure layer for AI agents.
 * Media Memory is presented as the first app built on it (single section) and
 * the studio itself lives on its own route at /mediamemory.
 */
export default function Home() {
  return <NueApp initialView="landing" />;
}
