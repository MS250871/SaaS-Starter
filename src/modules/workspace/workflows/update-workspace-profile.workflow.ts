import { Prisma } from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { invalidateWorkspaceSurfaceCaches } from '@/modules/workspace/services/workspace-cache.services';
import {
  getWorkspaceSettingsFresh,
  upsertWorkspaceSettings,
} from '@/modules/workspace/services/setting.services';
import { uploadWorkspaceProfileAsset } from '@/modules/workspace/services/workspace-profile-assets.services';
import {
  mergeWorkspaceProfileSettings,
  pickWorkspaceProfileSettings,
  readWorkspaceSettingsJson,
  type WorkspaceProfileSettings,
} from '@/modules/workspace/settings';

export async function updateWorkspaceProfileWorkflow(input: {
  workspaceId: string;
  identityId: string;
  profile: WorkspaceProfileSettings;
  logoFile?: File | null;
  faviconFile?: File | null;
}) {
  const result = await withUnitOfWork(async () => {
    const existing = await getWorkspaceSettingsFresh(input.workspaceId);
    const currentSettings = readWorkspaceSettingsJson(existing?.settings);
    const nextProfile: WorkspaceProfileSettings = {
      ...input.profile,
      branding: {
        ...(input.profile.branding ?? {}),
      },
    };

    if (input.logoFile) {
      const uploadedLogo = await uploadWorkspaceProfileAsset({
        workspaceId: input.workspaceId,
        identityId: input.identityId,
        file: input.logoFile,
        assetType: 'logo',
        logoAspect:
          input.profile.branding?.logoAspect === null
            ? undefined
            : input.profile.branding?.logoAspect ?? undefined,
      });

      nextProfile.branding = {
        ...(nextProfile.branding ?? {}),
        logoUrl: uploadedLogo.url,
        logoMediaId: uploadedLogo.mediaId,
      };
    }

    if (input.faviconFile) {
      const uploadedFavicon = await uploadWorkspaceProfileAsset({
        workspaceId: input.workspaceId,
        identityId: input.identityId,
        file: input.faviconFile,
        assetType: 'favicon',
      });

      nextProfile.branding = {
        ...(nextProfile.branding ?? {}),
        faviconUrl: uploadedFavicon.url,
        faviconMediaId: uploadedFavicon.mediaId,
      };
    }

    const nextSettings = mergeWorkspaceProfileSettings(
      currentSettings,
      nextProfile,
    );

    const updated = await upsertWorkspaceSettings({
      workspaceId: input.workspaceId,
      themes: existing?.themes ?? {},
      settings: nextSettings as Prisma.InputJsonValue,
    });

    return {
      workspaceId: input.workspaceId,
      profile: pickWorkspaceProfileSettings(
        readWorkspaceSettingsJson(updated.settings),
      ),
    };
  });

  await invalidateWorkspaceSurfaceCaches(input.workspaceId);

  return result;
}
