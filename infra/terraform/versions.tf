/**
 * Terraform provider version constraints.
 */

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.15"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.11"
    }
    grafana = {
      source  = "grafana/grafana"
      version = "~> 2.14"
    }
  }
}
