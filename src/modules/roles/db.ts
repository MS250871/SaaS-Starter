import { buildCud } from "@/lib/crud/cud-factory"
import { buildQueries } from "@/lib/crud/query-factory"

export const roleDefinitionCrud = buildCud({
  model: "RoleDefinition",
  workspaceScoped: false,
  activeField: "isActive",
  softDelete: false,
})

export const roleDefinitionQueries = buildQueries({
  model: "RoleDefinition",
  workspaceScoped: false,
  defaultActiveFilter: true,
  activeField: "isActive",
})
