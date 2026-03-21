import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/* -------------------------------------------------------------------------- */
/*                                  PLAN                                      */
/* -------------------------------------------------------------------------- */

export const planCrud = buildCud({
  model: 'Plan',
  workspaceScoped: false,
  activeField: 'isActive',
  softDelete: false,
});

export const planQueries = buildQueries({
  model: 'Plan',
  workspaceScoped: false,
  defaultActiveFilter: true,
  activeField: 'isActive',
});

/* -------------------------------------------------------------------------- */
/*                                 FEATURE                                    */
/* -------------------------------------------------------------------------- */

export const featureCrud = buildCud({
  model: 'Feature',
  workspaceScoped: false,
  activeField: 'isActive',
  softDelete: false,
});

export const featureQueries = buildQueries({
  model: 'Feature',
  workspaceScoped: false,
  defaultActiveFilter: true,
  activeField: 'isActive',
});

/* -------------------------------------------------------------------------- */
/*                             LIMIT DEFINITION                               */
/* -------------------------------------------------------------------------- */

export const limitDefinitionCrud = buildCud({
  model: 'LimitDefinition',
  workspaceScoped: false,
  activeField: 'isActive',
  softDelete: false,
});

export const limitDefinitionQueries = buildQueries({
  model: 'LimitDefinition',
  workspaceScoped: false,
  defaultActiveFilter: true,
  activeField: 'isActive',
});

/* -------------------------------------------------------------------------- */
/*                              PLAN FEATURE                                  */
/* -------------------------------------------------------------------------- */

export const planFeatureCrud = buildCud({
  model: 'PlanFeature',
  workspaceScoped: false,
  activeField: undefined, // no isActive
  softDelete: false,
});

export const planFeatureQueries = buildQueries({
  model: 'PlanFeature',
  workspaceScoped: false,
});

/* -------------------------------------------------------------------------- */
/*                               PLAN LIMIT                                   */
/* -------------------------------------------------------------------------- */

export const planLimitCrud = buildCud({
  model: 'PlanLimit',
  workspaceScoped: false,
  activeField: undefined,
  softDelete: false,
});

export const planLimitQueries = buildQueries({
  model: 'PlanLimit',
  workspaceScoped: false,
});

/* -------------------------------------------------------------------------- */
/*                    WORKSPACE FEATURE OVERRIDE                              */
/* -------------------------------------------------------------------------- */

export const workspaceFeatureOverrideCrud = buildCud({
  model: 'WorkspaceFeatureOverride',
  workspaceScoped: true,
  activeField: undefined,
  softDelete: false,
});

export const workspaceFeatureOverrideQueries = buildQueries({
  model: 'WorkspaceFeatureOverride',
  workspaceScoped: true,
});

/* -------------------------------------------------------------------------- */
/*                     WORKSPACE LIMIT OVERRIDE                               */
/* -------------------------------------------------------------------------- */

export const workspaceLimitOverrideCrud = buildCud({
  model: 'WorkspaceLimitOverride',
  workspaceScoped: true,
  activeField: undefined,
  softDelete: false,
});

export const workspaceLimitOverrideQueries = buildQueries({
  model: 'WorkspaceLimitOverride',
  workspaceScoped: true,
});
