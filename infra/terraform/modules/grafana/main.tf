/**
 * Grafana module for Family Recipes.
 *
 * Creates dashboards and alert rules for monitoring the application.
 * Data sources (Prometheus, Loki, Tempo) are pre-configured in Grafana Cloud.
 */

terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 2.14"
    }
  }
}

# -----------------------------------------------------------------------------
# Folder for dashboards
# -----------------------------------------------------------------------------

resource "grafana_folder" "family_recipes" {
  title = "Family Recipes ${title(var.environment)}"
}

# -----------------------------------------------------------------------------
# Application Dashboard
# -----------------------------------------------------------------------------

resource "grafana_dashboard" "application" {
  folder = grafana_folder.family_recipes.id

  config_json = jsonencode({
    title       = "Family Recipes - Application"
    description = "Application metrics and performance"
    tags        = ["family-recipes", var.environment]
    timezone    = "browser"
    refresh     = "30s"

    panels = [
      # Row: Overview
      {
        type    = "row"
        title   = "Overview"
        gridPos = { h = 1, w = 24, x = 0, y = 0 }
      },
      {
        type    = "stat"
        title   = "Request Rate"
        gridPos = { h = 4, w = 6, x = 0, y = 1 }
        targets = [{
          expr   = "sum(rate(http_requests_total{app=\"family-recipes\"}[5m]))"
          legend = "req/s"
        }]
      },
      {
        type    = "stat"
        title   = "Error Rate"
        gridPos = { h = 4, w = 6, x = 6, y = 1 }
        targets = [{
          expr   = "sum(rate(http_requests_total{app=\"family-recipes\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{app=\"family-recipes\"}[5m])) * 100"
          legend = "%"
        }]
      },
      {
        type    = "stat"
        title   = "P95 Latency"
        gridPos = { h = 4, w = 6, x = 12, y = 1 }
        targets = [{
          expr   = "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{app=\"family-recipes\"}[5m])) by (le))"
          legend = "seconds"
        }]
      },
      {
        type    = "stat"
        title   = "Active Traces"
        gridPos = { h = 4, w = 6, x = 18, y = 1 }
        targets = [{
          expr   = "sum(tempo_traces_total{app=\"family-recipes\"})"
          legend = "traces"
        }]
      },

      # Row: Database
      {
        type    = "row"
        title   = "MongoDB"
        gridPos = { h = 1, w = 24, x = 0, y = 5 }
      },
      {
        type    = "graph"
        title   = "Database Query Duration"
        gridPos = { h = 8, w = 12, x = 0, y = 6 }
        targets = [{
          expr   = "histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket{app=\"family-recipes\"}[5m])) by (le, operation))"
          legend = "{{operation}}"
        }]
      },
      {
        type    = "graph"
        title   = "Database Connections"
        gridPos = { h = 8, w = 12, x = 12, y = 6 }
        targets = [{
          expr   = "mongodb_connections_current{app=\"family-recipes\"}"
          legend = "connections"
        }]
      },

      # Row: API Routes
      {
        type    = "row"
        title   = "API Routes"
        gridPos = { h = 1, w = 24, x = 0, y = 14 }
      },
      {
        type    = "graph"
        title   = "Request Rate by Route"
        gridPos = { h = 8, w = 24, x = 0, y = 15 }
        targets = [{
          expr   = "sum(rate(http_requests_total{app=\"family-recipes\"}[5m])) by (route)"
          legend = "{{route}}"
        }]
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Traces Dashboard
# -----------------------------------------------------------------------------

resource "grafana_dashboard" "traces" {
  folder = grafana_folder.family_recipes.id

  config_json = jsonencode({
    title       = "Family Recipes - Traces"
    description = "Distributed tracing with Tempo"
    tags        = ["family-recipes", var.environment, "traces"]
    timezone    = "browser"
    refresh     = "1m"

    panels = [
      {
        type    = "traces"
        title   = "Recent Traces"
        gridPos = { h = 20, w = 24, x = 0, y = 0 }
        targets = [{
          datasource = { type = "tempo" }
          query      = "{resource.service.name=\"family-recipes\"}"
        }]
      }
    ]
  })
}
