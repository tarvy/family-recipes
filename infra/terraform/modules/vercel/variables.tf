/**
 * Variables for Vercel module.
 */

variable "project_id" {
  description = "Vercel project ID"
  type        = string
}

variable "team_id" {
  description = "Vercel team ID (optional)"
  type        = string
  default     = null
}

variable "environment" {
  description = "Environment name (dev or prod)"
  type        = string
}

variable "mongodb_uri" {
  description = "MongoDB connection string"
  type        = string
  sensitive   = true
}

variable "mongodb_db" {
  description = "MongoDB database name"
  type        = string
  default     = "family_recipes"
}
