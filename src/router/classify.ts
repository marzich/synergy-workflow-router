import type { RouteTier, WorkflowRequest } from "../schemas/workflow";

/**
 * Classify a workflow request into a route tier.
 *
 * Priority (highest to lowest):
 * 1. research urgency or research type → T4
 * 2. synergy_self_mod → T3
 * 3. cross_module / system complexity → T3
 * 4. Rule table below.
 *
 * Remaining rule table:
 *   immediate + trivial   → T0
 *   immediate + not trivial → T1
 *   bug + trivial/local   → T1
 *   bug + module+         → T3
 *   ui_polish + trivial   → T0
 *   ui_polish + local     → T1
 *   feature/refactor + module     → T2
 *   feature/refactor + cross+/sys → T3 (caught by rule 3)
 *   default               → T2
 */
export function classifyWorkflow(request: WorkflowRequest): RouteTier {
  const { urgency, type, complexity } = request;

  // Rule 1: research
  if (urgency === "research" || type === "research") {
    return "T4_RESEARCH_PLAN";
  }

  // Rule 2: synergy self-modification
  if (type === "synergy_self_mod") {
    return "T3_COMPLEX_CHANGE";
  }

  // Rule 3: cross-module or system-wide
  if (complexity === "cross_module" || complexity === "system") {
    return "T3_COMPLEX_CHANGE";
  }

  // Rule 4: remaining cases
  if (urgency === "immediate") {
    return complexity === "trivial" ? "T0_FAST_PATCH" : "T1_PRACTICAL_FIX";
  }

  if (type === "bug") {
    return complexity === "module" ? "T3_COMPLEX_CHANGE" : "T1_PRACTICAL_FIX";
  }

  if (type === "ui_polish") {
    return complexity === "trivial" ? "T0_FAST_PATCH" : "T1_PRACTICAL_FIX";
  }

  if (type === "feature" || type === "refactor") {
    return complexity === "module" ? "T2_NORMAL_FEATURE" : "T3_COMPLEX_CHANGE";
  }

  return "T2_NORMAL_FEATURE";
}
