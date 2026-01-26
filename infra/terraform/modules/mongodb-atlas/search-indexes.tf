/**
 * Atlas Search indexes for full-text recipe search.
 *
 * Note: Atlas Search is not available on M0 (free tier) clusters.
 * These resources will only work on M10+ clusters.
 * Uncomment when upgrading to a paid tier.
 */

# -----------------------------------------------------------------------------
# Recipe Search Index
# -----------------------------------------------------------------------------

# Uncomment when using M10+ cluster tier:
#
# resource "mongodbatlas_search_index" "recipes" {
#   project_id   = mongodbatlas_project.main.id
#   cluster_name = mongodbatlas_cluster.main.name
#   name         = "recipes_search"
#   database     = "family_recipes"
#   collection_name = "recipes"
#   type         = "search"
#
#   mappings_dynamic = false
#
#   mappings_fields = jsonencode({
#     title = {
#       type     = "string"
#       analyzer = "lucene.standard"
#     }
#     description = {
#       type     = "string"
#       analyzer = "lucene.standard"
#     }
#     ingredients = {
#       type = "document"
#       fields = {
#         name = {
#           type     = "string"
#           analyzer = "lucene.standard"
#         }
#       }
#     }
#     tags = {
#       type     = "string"
#       analyzer = "lucene.keyword"
#     }
#     cuisine = {
#       type     = "string"
#       analyzer = "lucene.keyword"
#     }
#     course = {
#       type     = "string"
#       analyzer = "lucene.keyword"
#     }
#   })
#
#   search_analyzer = "lucene.standard"
# }

# -----------------------------------------------------------------------------
# Autocomplete Index (for search-as-you-type)
# -----------------------------------------------------------------------------

# Uncomment when using M10+ cluster tier:
#
# resource "mongodbatlas_search_index" "recipes_autocomplete" {
#   project_id      = mongodbatlas_project.main.id
#   cluster_name    = mongodbatlas_cluster.main.name
#   name            = "recipes_autocomplete"
#   database        = "family_recipes"
#   collection_name = "recipes"
#   type            = "search"
#
#   mappings_dynamic = false
#
#   mappings_fields = jsonencode({
#     title = [{
#       type         = "autocomplete"
#       analyzer     = "lucene.standard"
#       tokenization = "edgeGram"
#       minGrams     = 2
#       maxGrams     = 15
#       foldDiacritics = true
#     }]
#   })
# }
