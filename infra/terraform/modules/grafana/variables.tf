/**
 * Variables for Grafana module.
 */

variable "stack_slug" {
  description = "Grafana Cloud stack slug"
  type        = string
}

variable "environment" {
  description = "Environment name (dev or prod)"
  type        = string
}
