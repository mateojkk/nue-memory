import { redirect } from 'next/navigation';

/**
 * Home is the app, not the landing page.
 * / redirects to the Media Memory workspace (/mediamemory); the marketing
 * landing lives at /landing.
 */
export default function Home() {
  redirect('/mediamemory');
}
