# Development environment configuration
# Sensitive values should be provided via environment variables or CI secrets

environment = "dev"

# MongoDB Atlas - Free tier for development
mongodb_project_name = "family-recipes-dev"
mongodb_cluster_name = "family-recipes-dev"
mongodb_cluster_tier = "M0"
mongodb_region       = "US_EAST_1"
mongodb_db_username  = "app_dev"

# Note: The following must be provided via TF_VAR_* environment variables:
# - mongodb_atlas_public_key
# - mongodb_atlas_private_key
# - mongodb_atlas_org_id
# - mongodb_db_password
# - vercel_api_token
# - vercel_project_id
