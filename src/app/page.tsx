import { cookies } from 'next/headers';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/logout-button';
import { getSessionFromCookies } from '@/lib/auth';

export default async function Home() {
  const user = await getSessionFromCookies(await cookies());

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Family Recipes</h1>
      <p className="mt-4 text-muted-foreground">Personal recipe management with Cooklang</p>

      {user ? (
        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
          <p className="text-xs text-muted-foreground">Role: {user.role}</p>
          <Link href="/settings" className="text-sm text-primary hover:underline">
            Manage settings
          </Link>
          <LogoutButton />
        </div>
      ) : (
        <Link
          href="/login"
          className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Sign In
        </Link>
      )}
    </main>
  );
}
