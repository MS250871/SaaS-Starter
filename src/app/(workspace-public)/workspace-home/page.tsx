import { notFound, redirect } from 'next/navigation';
import { getWorkspacePublicPageData } from '@/modules/workspace/server/workspace-public-page-data';
import { renderWorkspacePublicTemplate } from '@/modules/workspace-public/registry';

export default async function WorkspaceHomePage() {
  const data = await getWorkspacePublicPageData();

  if (!data) {
    notFound();
  }

  if (data.canonicalRedirectUrl) {
    redirect(data.canonicalRedirectUrl);
  }

  return renderWorkspacePublicTemplate(data);
}
