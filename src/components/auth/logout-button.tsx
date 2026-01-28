'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui';

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (_error) {
      // Error is silently caught - logout failures don't need user notification
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button type="button" variant="destructive" onClick={handleLogout} disabled={isLoading}>
      {isLoading ? 'Signing out...' : 'Sign Out'}
    </Button>
  );
}
