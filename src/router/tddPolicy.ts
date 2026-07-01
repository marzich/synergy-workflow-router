import type { RouteTier, TddPolicy, WorkflowRequest } from "../schemas/workflow";

/**
 * Resolve the TDD policy for a given route tier and request.
 *
 *   T0: smoke_only (fast patch — verify nothing broke)
 *   T1: post_fix_verification for bugs / ui_polish; smoke_only otherwise
 *   T2: full_red_green for feature/refactor (write tests first, then implement)
 *   T3: full_red_green for feature/refactor; post_fix_verification for bugs / self_mod
 *   T4: none (design phase only)
 */
export function resolveTddPolicy(
  tier: RouteTier,
  request: WorkflowRequest,
): TddPolicy {
  switch (tier) {
    case "T0_FAST_PATCH":
      return {
        mode: "smoke_only",
        description: "Run existing tests after patch; no new tests required.",
      };

    case "T1_PRACTICAL_FIX":
      if (request.type === "bug") {
        return {
          mode: "post_fix_verification",
          description:
            "Write a regression test after fixing; run existing suite.",
        };
      }
      return {
        mode: "smoke_only",
        description: "Run existing tests to verify no regressions.",
      };

    case "T2_NORMAL_FEATURE":
      return {
        mode: "full_red_green",
        description:
          "Full RED/GREEN TDD: write failing tests first, then implement.",
      };

    case "T3_COMPLEX_CHANGE":
      if (request.type === "bug" || request.type === "synergy_self_mod") {
        return {
          mode: "post_fix_verification",
          description:
            "Write regression test + integration test after the fix; run full suite.",
        };
      }
      return {
        mode: "full_red_green",
        description:
          "Full RED/GREEN TDD with integration tests. Write failing tests first across modules, then implement incrementally.",
      };

    case "T4_RESEARCH_PLAN":
      return {
        mode: "none",
        description: "Investigation phase — no code changes, no tests.",
      };
  }
}
