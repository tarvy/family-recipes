/**
 * Root Terraform module for Family Recipes infrastructure.
 *
 * This module orchestrates:
 * - MongoDB Atlas cluster and database configuration
 * - Vercel project environment variables
 */

# -----------------------------------------------------------------------------
# Providers
# -----------------------------------------------------------------------------

provider "mongodbatlas" {
  public_key  = var.mongodb_atlas_public_key
  private_key = var.mongodb_atlas_private_key
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}

# -----------------------------------------------------------------------------
# MongoDB Atlas Module
# -----------------------------------------------------------------------------

module "mongodb_atlas" {
  source = "./modules/mongodb-atlas"

  org_id       = var.mongodb_atlas_org_id
  project_name = var.mongodb_project_name
  environment  = var.environment
  cluster_name = var.mongodb_cluster_name
  cluster_tier = var.mongodb_cluster_tier
  region       = var.mongodb_region
  db_username  = var.mongodb_db_username
  db_password  = var.mongodb_db_password
}

# -----------------------------------------------------------------------------
# Vercel Module
# -----------------------------------------------------------------------------

module "vercel" {
  source = "./modules/vercel"

  project_id  = var.vercel_project_id
  team_id     = var.vercel_team_id
  environment = var.environment
  mongodb_uri = module.mongodb_atlas.connection_string
  mongodb_db  = "family_recipes"
}
