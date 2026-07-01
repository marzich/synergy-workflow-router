import { tool } from "@ericsanchezok/synergy-plugin/tool";
import { routeWorkflow } from "../router/route";
import { generateWorkflowPrompt } from "../router/prompt";
import { TIER_LABELS, type RouteTier } from "../schemas/workflow";

const z = tool.schema;

export const workflowRouteTool = tool({
  description:
    "Classify a development task and produce a recommended workflow route with TDD policy, subagent plan, review policy, and stage list.",
  args: {
    urgency: z.enum(["immediate", "normal", "research"]),
    type: z.enum([
      "bug",
      "feature",
      "refactor",
      "synergy_self_mod",
      "ui_polish",
      "research",
      "other",
    ]),
    complexity: z.enum([
      "trivial",
      "local",
      "module",
      "cross_module",
      "system",
    ]),
    scope: z.string().optional(),
    rootCause: z.enum(["clear", "unclear"]).optional(),
    language: z.string().optional(),
    riskSurfaces: z
      .array(
        z.enum(["api", "security", "performance", "docs", "migration"]),
      )
      .optional(),
  },
  async execute(args, _context) {
    const route = routeWorkflow(args);
    const prompt = generateWorkflowPrompt(route);
    return {
      output: prompt,
      title: `Workflow: ${formatTierLabel(route.tier)}`,
      metadata: { route },
    };
  },
});

function formatTierLabel(tier: RouteTier): string {
  return TIER_LABELS[tier] ?? tier;
}
