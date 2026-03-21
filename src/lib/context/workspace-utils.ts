import { getActor } from '@/lib/context/actor-context';

export function getWorkspaceId() {
  try {
    return getActor()?.workspaceId;
  } catch {
    return undefined;
  }
}

export function shouldBypassWorkspace() {
  try {
    const actor = getActor();
    return actor?.isPlatformAdmin === true;
  } catch {
    return false;
  }
}
