import type { ReviewPolicy, RouteTier, WorkflowRequest } from "../schemas/workflow";

const LANGUAGE_REVIEWERS: Record<string, string> = {
  typescript: "typescript-quality-engineer",
  python: "python-quality-engineer",
  rust: "rust-quality-engineer",
};

const RISK_REVIEWERS: Record<string, string> = {
  api: "api-compatibility-reviewer",
  security: "security-reviewer",
  performance: "performance-reviewer",
  docs: "documentation-reviewer",
  migration: "migration-architect",
};

/**
 * Resolve the review policy for a given route tier and request.
 *
 * Every code-change tier includes quality-gatekeeper.
 * Language-specific reviewers are added when `request.language` is provided.
 * Maintainability reviewer is added for non-trivial code changes.
 * Risk-surface reviewers are added for T2+ if risk surfaces are specified.
 */
export function resolveReviewPolicy(
  tier: RouteTier,
  request: WorkflowRequest,
): ReviewPolicy {
  const reviewers: string[] = [];

  if (tier === "T4_RESEARCH_PLAN") {
    return {
      reviewers: [],
      description: "Design review only — no code reviewers needed.",
    };
  }

  // Always include quality-gatekeeper for code-change tiers
  reviewers.push("quality-gatekeeper");

  // Language-specific quality
  if (request.language && LANGUAGE_REVIEWERS[request.language]) {
    reviewers.push(LANGUAGE_REVIEWERS[request.language]);
  }

  // Maintainability for non-trivial changes
  if (tier !== "T0_FAST_PATCH") {
    reviewers.push("maintainability-reviewer");
  }

  // Risk-surface reviewers for T2+
  if (
    tier !== "T0_FAST_PATCH" &&
    tier !== "T1_PRACTICAL_FIX" &&
    request.riskSurfaces &&
    request.riskSurfaces.length > 0
  ) {
    for (const surface of request.riskSurfaces) {
      const reviewer = RISK_REVIEWERS[surface];
      if (reviewer && !reviewers.includes(reviewer)) {
        reviewers.push(reviewer);
      }
    }
  }

  return {
    reviewers,
    description:
      reviewers.length > 0
        ? `Reviewers: ${reviewers.join(", ")}`
        : "No reviewers assigned.",
  };
}
