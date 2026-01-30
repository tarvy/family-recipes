/**
 * Output values from Family Recipes infrastructure.
 */

# -----------------------------------------------------------------------------
# MongoDB Atlas
# -----------------------------------------------------------------------------

output "mongodb_connection_string" {
  description = "MongoDB connection string (sensitive)"
  value       = module.mongodb_atlas.connection_string
  sensitive   = true
}

output "mongodb_project_id" {
  description = "MongoDB Atlas project ID"
  value       = module.mongodb_atlas.project_id
}

output "mongodb_cluster_name" {
  description = "MongoDB Atlas cluster name"
  value       = module.mongodb_atlas.cluster_name
}

# -----------------------------------------------------------------------------
# Vercel
# -----------------------------------------------------------------------------

output "vercel_project_id" {
  description = "Vercel project ID"
  value       = module.vercel.project_id
}
