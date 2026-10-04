# PR-066: MCP Tool Output Schema Mismatches - Requirements

> **Status**: Approved (requested directly by the owner, Travis)
> **PR Branch**: `fix/mcp-output-schemas`

## Problem Statement

`recipe_get` fails for every slug with "MCP error -32602: Structured content
does not match the tool's output schema: data/recipe must NOT have additional
properties, data/recipe/steps/N must NOT have additional properties". The
client needs full recipe details, so the schema must declare the data rather
than the tool dropping it.

## Acceptance Criteria

```gherkin
Feature: MCP tool outputs match their declared schemas

  Scenario: recipe_get returns full details
    Given a recipe with per-step ingredients, a rating, a cook log, and updatedAt
    When an MCP client calls recipe_get
    Then the call succeeds and those fields are present

  Scenario: Every tool is covered
    Given every registered MCP tool
    When it is called through an SDK client with realistic data
    Then its structured content validates against its declared outputSchema
```
