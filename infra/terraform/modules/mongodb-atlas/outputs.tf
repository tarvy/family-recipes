/**
 * Outputs from MongoDB Atlas module.
 */

output "project_id" {
  description = "MongoDB Atlas project ID"
  value       = mongodbatlas_project.main.id
}

output "cluster_name" {
  description = "MongoDB Atlas cluster name"
  value       = mongodbatlas_cluster.main.name
}

output "cluster_id" {
  description = "MongoDB Atlas cluster ID"
  value       = mongodbatlas_cluster.main.cluster_id
}

output "connection_string" {
  description = "MongoDB connection string for the application"
  value       = "mongodb+srv://${var.db_username}:${var.db_password}@${mongodbatlas_cluster.main.name}.${replace(mongodbatlas_cluster.main.connection_strings[0].standard_srv, "mongodb+srv://", "")}"
  sensitive   = true
}

output "connection_string_srv" {
  description = "MongoDB SRV connection string (without credentials)"
  value       = mongodbatlas_cluster.main.connection_strings[0].standard_srv
}
