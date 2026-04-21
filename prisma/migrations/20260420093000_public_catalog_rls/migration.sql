-- ============================================================
-- PUBLIC / GLOBAL CATALOG RLS
-- Covers global reference tables that must remain readable
-- without workspace scoping, while restricting writes to
-- system actors and platform admins.
-- ============================================================

/* =========================================================
   ENABLE / FORCE RLS
========================================================= */
ALTER TABLE "Permission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Permission" FORCE ROW LEVEL SECURITY;

ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Feature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Feature" FORCE ROW LEVEL SECURITY;

ALTER TABLE "LimitDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LimitDefinition" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PlanFeature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanFeature" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PlanLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanLimit" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Price" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Price" FORCE ROW LEVEL SECURITY;

/* =========================================================
   PERMISSION
========================================================= */
DROP POLICY IF EXISTS permission_select ON "Permission";
CREATE POLICY permission_select
ON "Permission"
FOR SELECT
USING (true);

DROP POLICY IF EXISTS permission_insert ON "Permission";
CREATE POLICY permission_insert
ON "Permission"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS permission_update ON "Permission";
CREATE POLICY permission_update
ON "Permission"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS permission_delete ON "Permission";
CREATE POLICY permission_delete
ON "Permission"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);

/* =========================================================
   ROLE PERMISSION
========================================================= */
DROP POLICY IF EXISTS rolepermission_select ON "RolePermission";
CREATE POLICY rolepermission_select
ON "RolePermission"
FOR SELECT
USING (true);

DROP POLICY IF EXISTS rolepermission_insert ON "RolePermission";
CREATE POLICY rolepermission_insert
ON "RolePermission"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS rolepermission_update ON "RolePermission";
CREATE POLICY rolepermission_update
ON "RolePermission"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS rolepermission_delete ON "RolePermission";
CREATE POLICY rolepermission_delete
ON "RolePermission"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);

/* =========================================================
   PLAN
========================================================= */
DROP POLICY IF EXISTS plan_select ON "Plan";
CREATE POLICY plan_select
ON "Plan"
FOR SELECT
USING (true);

DROP POLICY IF EXISTS plan_insert ON "Plan";
CREATE POLICY plan_insert
ON "Plan"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS plan_update ON "Plan";
CREATE POLICY plan_update
ON "Plan"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS plan_delete ON "Plan";
CREATE POLICY plan_delete
ON "Plan"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);

/* =========================================================
   FEATURE
========================================================= */
DROP POLICY IF EXISTS feature_select ON "Feature";
CREATE POLICY feature_select
ON "Feature"
FOR SELECT
USING (true);

DROP POLICY IF EXISTS feature_insert ON "Feature";
CREATE POLICY feature_insert
ON "Feature"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS feature_update ON "Feature";
CREATE POLICY feature_update
ON "Feature"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS feature_delete ON "Feature";
CREATE POLICY feature_delete
ON "Feature"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);

/* =========================================================
   LIMIT DEFINITION
========================================================= */
DROP POLICY IF EXISTS limitdefinition_select ON "LimitDefinition";
CREATE POLICY limitdefinition_select
ON "LimitDefinition"
FOR SELECT
USING (true);

DROP POLICY IF EXISTS limitdefinition_insert ON "LimitDefinition";
CREATE POLICY limitdefinition_insert
ON "LimitDefinition"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS limitdefinition_update ON "LimitDefinition";
CREATE POLICY limitdefinition_update
ON "LimitDefinition"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS limitdefinition_delete ON "LimitDefinition";
CREATE POLICY limitdefinition_delete
ON "LimitDefinition"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);

/* =========================================================
   PLAN FEATURE
========================================================= */
DROP POLICY IF EXISTS planfeature_select ON "PlanFeature";
CREATE POLICY planfeature_select
ON "PlanFeature"
FOR SELECT
USING (true);

DROP POLICY IF EXISTS planfeature_insert ON "PlanFeature";
CREATE POLICY planfeature_insert
ON "PlanFeature"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS planfeature_update ON "PlanFeature";
CREATE POLICY planfeature_update
ON "PlanFeature"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS planfeature_delete ON "PlanFeature";
CREATE POLICY planfeature_delete
ON "PlanFeature"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);

/* =========================================================
   PLAN LIMIT
========================================================= */
DROP POLICY IF EXISTS planlimit_select ON "PlanLimit";
CREATE POLICY planlimit_select
ON "PlanLimit"
FOR SELECT
USING (true);

DROP POLICY IF EXISTS planlimit_insert ON "PlanLimit";
CREATE POLICY planlimit_insert
ON "PlanLimit"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS planlimit_update ON "PlanLimit";
CREATE POLICY planlimit_update
ON "PlanLimit"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS planlimit_delete ON "PlanLimit";
CREATE POLICY planlimit_delete
ON "PlanLimit"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);

/* =========================================================
   PRODUCT
========================================================= */
DROP POLICY IF EXISTS product_select ON "Product";
CREATE POLICY product_select
ON "Product"
FOR SELECT
USING (true);

DROP POLICY IF EXISTS product_insert ON "Product";
CREATE POLICY product_insert
ON "Product"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS product_update ON "Product";
CREATE POLICY product_update
ON "Product"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS product_delete ON "Product";
CREATE POLICY product_delete
ON "Product"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);

/* =========================================================
   PRICE
========================================================= */
DROP POLICY IF EXISTS price_select ON "Price";
CREATE POLICY price_select
ON "Price"
FOR SELECT
USING (true);

DROP POLICY IF EXISTS price_insert ON "Price";
CREATE POLICY price_insert
ON "Price"
FOR INSERT
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS price_update ON "Price";
CREATE POLICY price_update
ON "Price"
FOR UPDATE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
)
WITH CHECK (
  app.is_system_actor()
  OR app.is_platform_admin()
);

DROP POLICY IF EXISTS price_delete ON "Price";
CREATE POLICY price_delete
ON "Price"
FOR DELETE
USING (
  app.is_system_actor()
  OR app.is_platform_admin()
);
