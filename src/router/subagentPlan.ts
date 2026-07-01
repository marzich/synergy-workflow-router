import type { RouteTier, SubagentPlan, WorkflowRequest } from "../schemas/workflow";

/**
 * Resolve the subagent plan for a given route tier and request.
 *
 *   T0: no subagents — self-execute
 *   T1: optional codex/cartographer if root cause unclear;
 *       maybe implementation-engineer if not self-fix
 *   T2: cartographer, requirements, architect, test-strategist,
 *       implementation, quality/reviews
 *   T3: codex+cartographer, requirements, architect,
 *       contract/migration if risk, parallel tests, parallel
 *       implementation, integration, reviews
 *   T4: investigation only — codex + cartographer, Fix Plan prompt
 */
export function resolveSubagentPlan(
  tier: RouteTier,
  request: WorkflowRequest,
): SubagentPlan {
  switch (tier) {
    case "T0_FAST_PATCH":
      return {
        required: [],
        optional: [],
        description: "Self-execute — no subagents needed.",
      };

    case "T1_PRACTICAL_FIX": {
      const optional: string[] = [];
      if (request.rootCause === "unclear") {
        optional.push("codex", "code-cartographer");
      }
      optional.push("implementation-engineer");
      return {
        required: [],
        optional,
        description:
          request.rootCause === "unclear"
            ? "Investigate root cause (codex/cartographer) then self-execute or delegate to implementation-engineer."
            : "Self-execute the fix or delegate to implementation-engineer.",
      };
    }

    case "T2_NORMAL_FEATURE":
      return {
        required: [
          "code-cartographer",
          "requirements-engineer",
          "solution-architect",
          "test-strategist",
          "implementation-engineer",
          "quality-gatekeeper",
        ],
        optional: [],
        description:
          "Full feature workflow: map → design → test → implement → review.",
      };

    case "T3_COMPLEX_CHANGE": {
      const required: string[] = [
        "codex",
        "code-cartographer",
        "requirements-engineer",
        "solution-architect",
      ];
      const optional: string[] = [];

      // Contract/migration if specific risk surfaces
      if (request.riskSurfaces) {
        if (request.riskSurfaces.includes("api")) {
          required.push("api-contract-designer");
        }
        if (request.riskSurfaces.includes("migration")) {
          required.push("migration-architect");
        }
      }

      required.push(
        "test-strategist",
        "implementation-engineer",
        "integration-engineer",
        "quality-gatekeeper",
      );

      return {
        required,
        optional,
        description:
          "Full complex change workflow: investigate → map → design → contract → test → implement (parallel) → integrate → review.",
      };
    }

    case "T4_RESEARCH_PLAN":
      return {
        required: ["codex", "code-cartographer"],
        optional: [],
        description:
          "Investigation and design only. Generate Fix Plan prompt for user approval. No implementation.",
      };
  }
}
