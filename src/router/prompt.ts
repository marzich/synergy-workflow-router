import { TIER_LABELS, type WorkflowRoute } from "../schemas/workflow";

/**
 * Generate a concise but actionable workflow prompt from a route.
 *
 * The prompt includes:
 * - selected workflow tier
 * - required stages
 * - skipped stages
 * - TDD policy
 * - subagents (required and optional)
 * - review policy
 * - loop policy
 */
export function generateWorkflowPrompt(route: WorkflowRoute): string {
  const lines: string[] = [];

  lines.push(`## Workflow: ${formatTier(route.tier)}`);
  lines.push("");

  // Stages
  lines.push("### Stages");
  lines.push(`**Required:** ${bulletList(route.stages)}`);
  if (route.skippedStages.length > 0) {
    lines.push(`**Skipped:** ${bulletList(route.skippedStages)}`);
  }
  lines.push("");

  // TDD
  lines.push("### TDD Policy");
  lines.push(`**Mode:** \`${route.tddPolicy.mode}\``);
  lines.push(route.tddPolicy.description);
  lines.push("");

  // Subagents
  lines.push("### Subagents");
  if (route.subagentPlan.required.length > 0) {
    lines.push(`**Required:** ${bulletList(route.subagentPlan.required)}`);
  }
  if (route.subagentPlan.optional.length > 0) {
    lines.push(`**Optional:** ${bulletList(route.subagentPlan.optional)}`);
  }
  lines.push(route.subagentPlan.description);
  lines.push("");

  // Review
  lines.push("### Review Policy");
  if (route.reviewPolicy.reviewers.length > 0) {
    lines.push(`**Reviewers:** ${bulletList(route.reviewPolicy.reviewers)}`);
  }
  lines.push(route.reviewPolicy.description);
  lines.push("");

  // Loop
  lines.push("### Loop Policy");
  lines.push(`**Mode:** \`${route.loopPolicy}\``);
  lines.push(formatLoopPolicy(route.loopPolicy));

  return lines.join("\n");
}

function formatTier(tier: WorkflowRoute["tier"]): string {
  return TIER_LABELS[tier] ?? tier;
}

function bulletList(items: string[]): string {
  return items.map((item) => `\`${item}\``).join(", ");
}

function formatLoopPolicy(policy: string): string {
  switch (policy) {
    case "strict_one_pass":
      return "Complete in one pass. If verification fails, report — do not loop.";
    case "verify_loop":
      return "Implement, then verify. If verification fails, fix and re-verify once.";
    case "iterate_with_review":
      return "Implement incrementally with review gates. Each review cycle may trigger another iteration.";
    case "design_then_approve":
      return "Produce design artifacts only. Wait for user approval before any implementation.";
    default:
      return "";
  }
}
