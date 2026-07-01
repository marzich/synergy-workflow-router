import type { LoopPolicy, WorkflowRequest, WorkflowRoute } from "../schemas/workflow";
import { classifyWorkflow } from "./classify";
import { resolveTddPolicy } from "./tddPolicy";
import { resolveReviewPolicy } from "./reviewPolicy";
import { resolveSubagentPlan } from "./subagentPlan";

const ALL_STAGES = [
  "classify",
  "investigate",
  "map",
  "design",
  "contract",
  "test",
  "implement",
  "integrate",
  "verify",
  "review",
  "approve",
] as const;

type Stage = (typeof ALL_STAGES)[number];

const STAGES_BY_TIER: Record<string, Stage[]> = {
  T0_FAST_PATCH: ["implement", "verify"],
  T1_PRACTICAL_FIX: ["classify", "implement", "verify"],
  T2_NORMAL_FEATURE: [
    "classify",
    "map",
    "design",
    "test",
    "implement",
    "verify",
    "review",
  ],
  T3_COMPLEX_CHANGE: [
    "classify",
    "investigate",
    "map",
    "design",
    "test",
    "implement",
    "integrate",
    "verify",
    "review",
  ],
  T4_RESEARCH_PLAN: [
    "classify",
    "investigate",
    "map",
    "design",
    "approve",
  ],
};

const LOOP_POLICY_BY_TIER: Record<string, LoopPolicy> = {
  T0_FAST_PATCH: "strict_one_pass",
  T1_PRACTICAL_FIX: "verify_loop",
  T2_NORMAL_FEATURE: "verify_loop",
  T3_COMPLEX_CHANGE: "iterate_with_review",
  T4_RESEARCH_PLAN: "design_then_approve",
};

/**
 * Main entry point: classify a workflow request and produce a complete route
 * including tier, TDD policy, review policy, subagent plan, stages, and loop policy.
 */
export function routeWorkflow(request: WorkflowRequest): WorkflowRoute {
  const tier = classifyWorkflow(request);

  const stages = getStages(tier, request);
  const skippedStages = ALL_STAGES.filter((s) => !stages.includes(s));

  return {
    tier,
    tddPolicy: resolveTddPolicy(tier, request),
    reviewPolicy: resolveReviewPolicy(tier, request),
    subagentPlan: resolveSubagentPlan(tier, request),
    loopPolicy: LOOP_POLICY_BY_TIER[tier],
    stages: stages as string[],
    skippedStages: skippedStages as string[],
  };
}

/**
 * Compute the stage list, optionally inserting extra stages based on request properties.
 */
function getStages(tier: string, request: WorkflowRequest): Stage[] {
  const base = [...STAGES_BY_TIER[tier]];

  // T1: add investigate stage if root cause is unclear
  if (tier === "T1_PRACTICAL_FIX" && request.rootCause === "unclear") {
    const classifyIdx = base.indexOf("classify");
    base.splice(classifyIdx + 1, 0, "investigate");
  }

  // T3: add contract stage if api or migration risk surfaces
  if (
    tier === "T3_COMPLEX_CHANGE" &&
    request.riskSurfaces &&
    (request.riskSurfaces.includes("api") ||
      request.riskSurfaces.includes("migration"))
  ) {
    const designIdx = base.indexOf("design");
    base.splice(designIdx + 1, 0, "contract");
  }

  return base;
}
