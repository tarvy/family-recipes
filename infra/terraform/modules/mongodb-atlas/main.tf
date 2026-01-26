/**
 * MongoDB Atlas module for Family Recipes.
 *
 * Creates:
 * - Atlas project
 * - Serverless cluster (M0 free tier compatible)
 * - Database user with readWrite access
 * - IP access list (allow from anywhere for Vercel)
 */

terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.15"
    }
  }
}

# -----------------------------------------------------------------------------
# Project
# -----------------------------------------------------------------------------

resource "mongodbatlas_project" "main" {
  name   = var.project_name
  org_id = var.org_id

  # Project settings
  is_collect_database_specifics_statistics_enabled = true
  is_data_explorer_enabled                         = true
  is_performance_advisor_enabled                   = true
  is_realtime_performance_panel_enabled            = true
  is_schema_advisor_enabled                        = true
}

# -----------------------------------------------------------------------------
# Cluster
# -----------------------------------------------------------------------------

resource "mongodbatlas_cluster" "main" {
  project_id = mongodbatlas_project.main.id
  name       = var.cluster_name

  # Provider settings for free tier (M0)
  provider_name               = "TENANT"
  backing_provider_name       = "AWS"
  provider_region_name        = var.region
  provider_instance_size_name = var.cluster_tier

  # M0 specific settings
  # Note: M0 clusters have limited configurability
}

# -----------------------------------------------------------------------------
# Database User
# -----------------------------------------------------------------------------

resource "mongodbatlas_database_user" "app" {
  project_id         = mongodbatlas_project.main.id
  username           = var.db_username
  password           = var.db_password
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "family_recipes"
  }

  # Also grant access to admin for connection verification
  roles {
    role_name     = "readAnyDatabase"
    database_name = "admin"
  }

  labels {
    key   = "environment"
    value = var.environment
  }
}

# -----------------------------------------------------------------------------
# IP Access List
# -----------------------------------------------------------------------------

# Allow access from anywhere (required for Vercel serverless functions)
# In production, consider using VPC peering or Private Endpoints
resource "mongodbatlas_project_ip_access_list" "anywhere" {
  project_id = mongodbatlas_project.main.id
  cidr_block = "0.0.0.0/0"
  comment    = "Vercel serverless"
}
