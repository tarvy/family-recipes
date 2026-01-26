/**
 * Variables for MongoDB Atlas module.
 */

variable "org_id" {
  description = "MongoDB Atlas organization ID"
  type        = string
}

variable "project_name" {
  description = "Name of the MongoDB Atlas project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev or prod)"
  type        = string
}

variable "cluster_name" {
  description = "Name of the MongoDB cluster"
  type        = string
}

variable "cluster_tier" {
  description = "MongoDB Atlas cluster tier (e.g., M0, M10, M20)"
  type        = string
  default     = "M0"
}

variable "region" {
  description = "MongoDB Atlas region"
  type        = string
  default     = "US_EAST_1"
}

variable "db_username" {
  description = "Database username"
  type        = string
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}
