/**
 * Input variables for Family Recipes infrastructure.
 */

# -----------------------------------------------------------------------------
# Environment
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Deployment environment (dev or prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be 'dev' or 'prod'."
  }
}

# -----------------------------------------------------------------------------
# MongoDB Atlas
# -----------------------------------------------------------------------------

variable "mongodb_atlas_public_key" {
  description = "MongoDB Atlas API public key"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_private_key" {
  description = "MongoDB Atlas API private key"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_org_id" {
  description = "MongoDB Atlas organization ID"
  type        = string
}

variable "mongodb_project_name" {
  description = "Name of the MongoDB Atlas project"
  type        = string
  default     = "family-recipes"
}

variable "mongodb_cluster_name" {
  description = "Name of the MongoDB cluster"
  type        = string
  default     = "family-recipes"
}

variable "mongodb_cluster_tier" {
  description = "MongoDB Atlas cluster tier (e.g., M0, M10, M20)"
  type        = string
  default     = "M0"
}

variable "mongodb_region" {
  description = "MongoDB Atlas region"
  type        = string
  default     = "US_EAST_1"
}

variable "mongodb_db_username" {
  description = "MongoDB database username"
  type        = string
  default     = "app"
}

variable "mongodb_db_password" {
  description = "MongoDB database password"
  type        = string
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Vercel
# -----------------------------------------------------------------------------

variable "vercel_api_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team ID (optional, for team projects)"
  type        = string
  default     = null
}

variable "vercel_project_id" {
  description = "Existing Vercel project ID"
  type        = string
}

# -----------------------------------------------------------------------------
# Grafana Cloud
# -----------------------------------------------------------------------------

variable "grafana_url" {
  description = "Grafana Cloud instance URL"
  type        = string
}

variable "grafana_auth" {
  description = "Grafana Cloud API key with admin access"
  type        = string
  sensitive   = true
}

variable "grafana_cloud_stack_slug" {
  description = "Grafana Cloud stack slug"
  type        = string
}
