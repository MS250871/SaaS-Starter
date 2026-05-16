import type {
  WorkspacePublicTemplateComponent,
  WorkspacePublicTemplateData,
  WorkspacePublicTemplateKey,
} from '@/modules/workspace-public/contracts';
import { CoachingClassicTemplate } from '@/modules/workspace-public/templates/coaching-classic/home';

const workspacePublicTemplates: Record<
  WorkspacePublicTemplateKey,
  WorkspacePublicTemplateComponent
> = {
  'coaching-classic': CoachingClassicTemplate,
};

export function renderWorkspacePublicTemplate(data: WorkspacePublicTemplateData) {
  const Template = workspacePublicTemplates[data.templateKey];
  return <Template data={data} />;
}
