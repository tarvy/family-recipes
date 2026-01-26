/**
 * Outputs from Vercel module.
 */

output "project_id" {
  description = "Vercel project ID"
  value       = var.project_id
}

output "environment_variables_configured" {
  description = "List of environment variables configured by Terraform"
  value       = ["MONGODB_URI", "MONGODB_DB_NAME"]
}
