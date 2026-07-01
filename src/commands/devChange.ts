import type { PluginCLICommand } from "@ericsanchezok/synergy-plugin";
import { workflowRequestSchema } from "../schemas/workflow";
import { routeWorkflow } from "../router/route";
import { generateWorkflowPrompt } from "../router/prompt";

export const devChangeCommand: PluginCLICommand = {
  description:
    "Generate an adaptive development workflow prompt from JSON or CLI flags.",
  options: {
    json: {
      type: "string",
      description: "Full workflow request as JSON (overrides flags)",
    },
    urgency: {
      type: "string",
      description: "Task urgency: immediate | normal | research",
      required: true,
    },
    type: {
      type: "string",
      description: "Task type: bug | feature | refactor | synergy_self_mod | ui_polish | research | other",
      required: true,
    },
    complexity: {
      type: "string",
      description: "Complexity: trivial | local | module | cross_module | system",
      required: true,
    },
    scope: { type: "string", description: "Brief scope description" },
    rootCause: {
      type: "string",
      description: "Root cause clarity: clear | unclear",
    },
    language: { type: "string", description: "Target language" },
    riskSurfaces: {
      type: "string",
      description: "Comma-separated risk surfaces: api, security, performance, docs, migration",
    },
  },
  async execute(raw: Record<string, any>): Promise<string> {
    let data: unknown;

    if (raw.json) {
      try {
        data = JSON.parse(raw.json);
      } catch {
        return "Error: invalid JSON passed to --json";
      }
    } else {
      if (!raw.urgency || !raw.type || !raw.complexity) {
        return "Error: --urgency, --type, and --complexity are required (or use --json)";
      }
      data = {
        urgency: raw.urgency,
        type: raw.type,
        complexity: raw.complexity,
        scope: raw.scope || undefined,
        rootCause: raw.rootCause || undefined,
        language: raw.language || undefined,
        riskSurfaces: raw.riskSurfaces
          ? raw.riskSurfaces.split(",").map((s: string) => s.trim())
          : undefined,
      };
    }

    const result = workflowRequestSchema.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n");
      return `Validation error:\n${issues}`;
    }

    const route = routeWorkflow(result.data);
    return generateWorkflowPrompt(route);
  },
};
