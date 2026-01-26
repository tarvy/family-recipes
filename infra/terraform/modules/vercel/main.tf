/**
 * Vercel module for Family Recipes.
 *
 * Manages environment variables for the Vercel project.
 * The project itself is created by Vercel's GitHub integration.
 */

locals {
  # Map environment to Vercel targets
  vercel_target = var.environment == "prod" ? "production" : "preview"
}

# -----------------------------------------------------------------------------
# Environment Variables
# -----------------------------------------------------------------------------

resource "vercel_project_environment_variable" "mongodb_uri" {
  project_id = var.project_id
  team_id    = var.team_id
  key        = "MONGODB_URI"
  value      = var.mongodb_uri
  target     = [local.vercel_target]
  sensitive  = true
}

resource "vercel_project_environment_variable" "mongodb_db_name" {
  project_id = var.project_id
  team_id    = var.team_id
  key        = "MONGODB_DB_NAME"
  value      = var.mongodb_db
  target     = [local.vercel_target]
  sensitive  = false
}

# Note: Other environment variables (JWT_SECRET, RESEND_API_KEY, etc.)
# should be set manually in Vercel dashboard or via additional resources.
# This module focuses on infrastructure-provisioned values (MongoDB).
