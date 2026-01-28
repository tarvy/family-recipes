import { cookies } from 'next/headers';
import { PasskeyManager } from '@/components/auth/passkey-manager';
import { MainLayout } from '@/components/layout';
import { connectDB } from '@/db/connection';
import { Passkey } from '@/db/models';
import { getSessionFromCookies } from '@/lib/auth';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

interface PasskeySummary {
  id: string;
  createdAt: string;
  lastUsedAt?: string | null;
  deviceType?: string;
  backedUp: boolean;
  transports: string[];
}

export default async function SettingsPage() {
  // Layout guarantees authentication - fetch user for data access
  const user = await getSessionFromCookies(await cookies());

  // Explicit guard: layout should redirect unauthenticated users, but fail clearly if not
  if (!user) {
    throw new Error('User not authenticated - layout redirect failed');
  }

  const passkeys = await withTrace('page.settings.passkeys', async (span) => {
    span.setAttribute('user_id', user.id);

    await connectDB();

    const records = await traceDbQuery('find', 'passkeys', async () => {
      return Passkey.find({ userId: user.id }).sort({ createdAt: -1 });
    });

    return records.map<PasskeySummary>((record) => {
      const summary: PasskeySummary = {
        id: record._id.toString(),
        createdAt: record.createdAt?.toISOString() ?? new Date().toISOString(),
        lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
        backedUp: record.backedUp,
        transports: record.transports ?? [],
      };

      if (record.deviceType !== undefined) {
        summary.deviceType = record.deviceType;
      }

      return summary;
    });
  });

  return (
    <MainLayout>
      <div className="px-6 py-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage your account security and authentication options.
            </p>
          </div>

          <PasskeyManager initialPasskeys={passkeys} />
        </div>
      </div>
    </MainLayout>
  );
}
