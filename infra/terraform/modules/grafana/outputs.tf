/**
 * Outputs from Grafana module.
 */

output "folder_id" {
  description = "Grafana folder ID"
  value       = grafana_folder.family_recipes.id
}

output "folder_uid" {
  description = "Grafana folder UID"
  value       = grafana_folder.family_recipes.uid
}

output "dashboard_url" {
  description = "URL to the application dashboard"
  value       = grafana_dashboard.application.url
}

output "dashboards" {
  description = "Map of dashboard names to URLs"
  value = {
    application = grafana_dashboard.application.url
    traces      = grafana_dashboard.traces.url
  }
}
