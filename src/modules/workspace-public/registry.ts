import { createElement } from 'react';

import type {
  WorkspacePublicTemplateComponent,
  WorkspacePublicTemplateData,
  WorkspacePublicTemplateKey,
} from '@/modules/workspace-public/contracts';
import { CoachingClassicTemplate } from '@/modules/workspace-public/components/coaching-classic-template';

const workspacePublicTemplates: Record<
  WorkspacePublicTemplateKey,
  WorkspacePublicTemplateComponent
> = {
  'coaching-classic': CoachingClassicTemplate,
};

export function renderWorkspacePublicTemplate(data: WorkspacePublicTemplateData) {
  const Template = workspacePublicTemplates[data.templateKey];
  return createElement(Template, { data });
}
