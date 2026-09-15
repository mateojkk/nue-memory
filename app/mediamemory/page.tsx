import { NueApp } from '@/components/AppShell';

/**
 * Media Memory route.
 *
 * This is the working surface: it opens Nue Memory directly on the Media Memory
 * workspace, where the create -> review -> feedback -> remember -> recall loop
 * runs against the real Livepeer Agent and Walrus MemWal layers.
 *
 * What Media Memory *is* gets explained on the landing page (one section) and in
 * the workspace intro panel. This route is where you use it.
 */
export const metadata = {
  title: 'Media Memory · Nue Memory',
  description:
    'Media Memory is the first app built on Nue Memory: media agents remember creative feedback once and apply it to every later project without reprompting.',
};

export default function MediaMemoryPage() {
  return <NueApp initialView="dashboard" initialTab="media-memory" />;
}
