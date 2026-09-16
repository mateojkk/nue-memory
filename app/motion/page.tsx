import { NueApp } from '@/components/AppShell';

/**
 * Media Memory route — the working surface.
 *
 * Opens Nue Memory directly on the Media Memory workspace, where the
 * create -> review -> feedback -> remember -> recall loop runs against the
 * real Livepeer Agent and Walrus MemWal layers. What Media Memory *is* gets
 * explained in one section on /landing; this route is where you use it.
 */
export const metadata = {
  title: 'Nue Motion · Autonomous Video with Agent Memory',
  description:
    'Nue Motion is the generative video agent powered by Nue and Livepeer: continuous memory recall across every video project with zero reprompting.',
};

export default function MotionPage() {
  return <NueApp view="dashboard" initialTab="media-memory" />;
}

