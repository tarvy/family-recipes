# Production environment configuration
# Sensitive values should be provided via environment variables or CI secrets

environment = "prod"

# MongoDB Atlas - Consider upgrading from M0 for production
mongodb_project_name = "family-recipes"
mongodb_cluster_name = "family-recipes"
mongodb_cluster_tier = "M0" # Upgrade to M10+ for production SLA
mongodb_region       = "US_EAST_1"
mongodb_db_username  = "app"

# Note: The following must be provided via TF_VAR_* environment variables:
# - mongodb_atlas_public_key
# - mongodb_atlas_private_key
# - mongodb_atlas_org_id
# - mongodb_db_password
# - vercel_api_token
# - vercel_project_id
# - grafana_url
# - grafana_auth
# - grafana_cloud_stack_slug
