import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/auth/session';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for authenticated routes.
 * Provides fallback auth check for expired/invalid sessions
 * that middleware's cookie-existence check doesn't catch.
 */
export default async function MainLayout({ children }: MainLayoutProps) {
  const cookieStore = await cookies();
  const user = await getSessionFromCookies(cookieStore);

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
