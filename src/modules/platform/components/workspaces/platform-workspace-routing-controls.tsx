'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircleIcon, RefreshCcwIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SpinnerButton } from '@/components/ui/spinner-button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useActionToast } from '@/hooks/use-action-toast';
import {
  createPlatformWorkspaceCustomDomainAction,
  createPlatformWorkspaceRedirectAliasAction,
  resyncPlatformWorkspaceRoutingAction,
} from '@/modules/workspace/actions/platform-workspace-domain-admin.actions';

function normalizeDomainInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
}

export function PlatformWorkspaceRoutingControls({
  workspaceId,
  workspaceName,
  providerLabel,
  canResyncRouting,
  canCreateDomains,
  canUseCustomDomain,
  hasPrimaryCustomDomain,
  hasRedirectAlias,
  customDomainSlots,
  currentCustomDomainCount,
  remainingCustomDomainSlots,
}: {
  workspaceId: string;
  workspaceName: string;
  providerLabel: string;
  canResyncRouting: boolean;
  canCreateDomains: boolean;
  canUseCustomDomain: boolean;
  hasPrimaryCustomDomain: boolean;
  hasRedirectAlias: boolean;
  customDomainSlots: number;
  currentCustomDomainCount: number;
  remainingCustomDomainSlots: number;
}) {
  const router = useRouter();
  const { showActionError, showActionSuccess } = useActionToast();
  const [isResyncPending, startResyncTransition] = useTransition();
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isAliasPending, startAliasTransition] = useTransition();
  const [customDomain, setCustomDomain] = useState('');
  const [customRoutingMode, setCustomRoutingMode] = useState<'CNAME' | 'APEX_A'>(
    'CNAME',
  );
  const [redirectAlias, setRedirectAlias] = useState('');
  const [aliasRoutingMode, setAliasRoutingMode] = useState<'CNAME' | 'APEX_A'>(
    'APEX_A',
  );

  const canAddCustomDomain =
    canCreateDomains &&
    canUseCustomDomain &&
    (customDomainSlots === 0 || remainingCustomDomainSlots > 0);
  const canAddRedirectAlias =
    canCreateDomains && canUseCustomDomain && hasPrimaryCustomDomain && !hasRedirectAlias;

  const runResync = () => {
    startResyncTransition(async () => {
      const formData = new FormData();
      formData.set('workspaceId', workspaceId);

      const response = await resyncPlatformWorkspaceRoutingAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      showActionSuccess(response.data.successMessage, 'Routing resynced.');
      router.refresh();
    });
  };

  const runCreateCustomDomain = () => {
    startCreateTransition(async () => {
      const formData = new FormData();
      formData.set('workspaceId', workspaceId);
      formData.set('domain', normalizeDomainInput(customDomain));
      formData.set('routingMode', customRoutingMode);

      const response = await createPlatformWorkspaceCustomDomainAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      showActionSuccess(
        response.data.successMessage,
        'Custom domain added successfully.',
      );
      setCustomDomain('');
      router.refresh();
    });
  };

  const runCreateRedirectAlias = () => {
    startAliasTransition(async () => {
      const formData = new FormData();
      formData.set('workspaceId', workspaceId);
      formData.set('domain', normalizeDomainInput(redirectAlias));
      formData.set('routingMode', aliasRoutingMode);

      const response = await createPlatformWorkspaceRedirectAliasAction(formData);

      if (!response.success) {
        showActionError(response.error);
        return;
      }

      showActionSuccess(
        response.data.successMessage,
        'Redirect alias added successfully.',
      );
      setRedirectAlias('');
      router.refresh();
    });
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr_1fr]">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Routing Control</CardTitle>
          <CardDescription>
            Recompute the effective routing state after entitlement or domain
            changes. {workspaceName} stays connected through {providerLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {currentCustomDomainCount} configured custom domains
            </Badge>
            {customDomainSlots > 0 ? (
              <Badge variant="secondary">
                {remainingCustomDomainSlots} slots remaining
              </Badge>
            ) : (
              <Badge variant="outline">Slot limit not configured</Badge>
            )}
          </div>

          {!canResyncRouting ? (
            <Alert>
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Routing update permission required</AlertTitle>
              <AlertDescription>
                Resyncing the effective routing state needs the
                <code className="mx-1">workspaceDomain.update</code>
                permission.
              </AlertDescription>
            </Alert>
          ) : null}

          {isResyncPending ? (
            <SpinnerButton
              message="Resyncing routing..."
              className="w-full sm:w-auto"
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={!canResyncRouting}
              onClick={runResync}
            >
              <RefreshCcwIcon className="size-4" />
              Resync routing now
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Add Custom Domain</CardTitle>
          <CardDescription>
            Attach a new branded host to this workspace and prepare its DNS checks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canUseCustomDomain ? (
            <Alert>
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Custom domains not enabled</AlertTitle>
              <AlertDescription>
                This workspace does not currently have custom-domain entitlement
                through its plan and overrides.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium">Domain</label>
            <Input
              placeholder="academy.example.com"
              value={customDomain}
              onChange={(event) => setCustomDomain(event.target.value)}
              disabled={!canAddCustomDomain || isCreatePending}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Routing mode</label>
            <select
              value={customRoutingMode}
              onChange={(event) =>
                setCustomRoutingMode(event.target.value as 'CNAME' | 'APEX_A')
              }
              disabled={!canAddCustomDomain || isCreatePending}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="CNAME">CNAME</option>
              <option value="APEX_A">Apex A records</option>
            </select>
          </div>

          {customDomainSlots > 0 && remainingCustomDomainSlots === 0 ? (
            <Alert>
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Custom domain limit reached</AlertTitle>
              <AlertDescription>
                Free a slot or raise the entitlement limit before adding another
                custom domain.
              </AlertDescription>
            </Alert>
          ) : null}

          {!canCreateDomains ? (
            <Alert>
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Domain create permission required</AlertTitle>
              <AlertDescription>
                Adding domains needs the
                <code className="mx-1">workspaceDomain.create</code>
                permission.
              </AlertDescription>
            </Alert>
          ) : null}

          {isCreatePending ? (
            <SpinnerButton message="Adding custom domain..." className="w-full" />
          ) : (
            <Button
              type="button"
              className="w-full"
              disabled={!canAddCustomDomain || customDomain.trim().length === 0}
              onClick={runCreateCustomDomain}
            >
              Add custom domain
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Add Redirect Alias</CardTitle>
          <CardDescription>
            Create an apex or alternate redirect that forwards into the primary
            branded host.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasPrimaryCustomDomain ? (
            <Alert>
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Primary custom domain required</AlertTitle>
              <AlertDescription>
                Add and verify a primary custom domain before creating a redirect
                alias.
              </AlertDescription>
            </Alert>
          ) : null}

          {hasRedirectAlias ? (
            <Alert>
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Redirect alias already configured</AlertTitle>
              <AlertDescription>
                Delete the current alias before adding a replacement.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium">Alias domain</label>
            <Input
              placeholder="example.com"
              value={redirectAlias}
              onChange={(event) => setRedirectAlias(event.target.value)}
              disabled={!canAddRedirectAlias || isAliasPending}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Routing mode</label>
            <select
              value={aliasRoutingMode}
              onChange={(event) =>
                setAliasRoutingMode(event.target.value as 'CNAME' | 'APEX_A')
              }
              disabled={!canAddRedirectAlias || isAliasPending}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="APEX_A">Apex A records</option>
              <option value="CNAME">CNAME</option>
            </select>
          </div>

          {isAliasPending ? (
            <SpinnerButton message="Adding redirect alias..." className="w-full" />
          ) : (
            <Button
              type="button"
              className="w-full"
              disabled={!canAddRedirectAlias || redirectAlias.trim().length === 0}
              onClick={runCreateRedirectAlias}
            >
              Add redirect alias
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
