import { NueApp } from '@/components/AppShell';

export const metadata = {
  title: 'Nue · AI Agents That Remember You',
  description:
    'Nue Memory is the memory layer that lets agents keep your taste across every project. Nue Motion, video that remembers your style, is the first app built on it.',
};

export default function Home() {
  return <NueApp view="landing" />;
}
