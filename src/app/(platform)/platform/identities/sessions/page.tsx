import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { PlatformOtpRequestsTable } from '@/modules/platform/components/identities/platform-otp-requests-table';
import { PlatformSessionsTable } from '@/modules/platform/components/identities/platform-sessions-table';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformIdentitySessionsPageData } from '@/modules/auth/server/platform-identity-admin-data';

export default async function PlatformIdentitySessionsPage() {
  await requirePlatformPermission('identity.read');
  const data = await getPlatformIdentitySessionsPageData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Sessions</CardDescription>
            <CardTitle className="text-3xl">{data.summary.sessions}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Active sessions</CardDescription>
            <CardTitle className="text-3xl">{data.summary.activeSessions}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Workspace sessions</CardDescription>
            <CardTitle className="text-3xl">{data.summary.workspaceSessions}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Customer sessions</CardDescription>
            <CardTitle className="text-3xl">{data.summary.customerSessions}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>OTP requests</CardDescription>
            <CardTitle className="text-3xl">{data.summary.otpRequests}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformSessionsTable rows={data.sessionRows} />
      <PlatformOtpRequestsTable rows={data.otpRows} />
    </div>
  );
}
