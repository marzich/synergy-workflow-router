# synergy-workflow-router

Adaptive development workflow router for Synergy.

This plugin turns development constraints — urgency, task type, complexity, risk surfaces, TDD policy, worktree policy, and subagent budget — into a concrete workflow recommendation.

## MVP Scope

Phase 1 + Phase 2:

- Workspace panel for selecting workflow constraints.
- Settings panel with hardcoded/default preferences.
- Prompt-only workflow output.
- `workflow_route` tool for agent-readable routing JSON.

Out of scope for the first version:

- Direct DAG creation.
- Automatic subagent dispatch.
- Loop classifier tool.
- Mutable settings persistence beyond the plugin settings panel surface.

## Core Principle

Workflow is selected by risk, complexity, and urgency — not by habit. TDD is mandatory for durable feature behavior, optional for practical fixes, and skipped for trivial edits. Subagents are used when they reduce uncertainty or parallelize independent work; they are not used merely to satisfy process.
