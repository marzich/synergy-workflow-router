import { describe, expect, test } from "bun:test";
import { routeWorkflow } from "../src/router/route";
import { generateWorkflowPrompt } from "../src/router/prompt";

const baseRequest = {
  urgency: "normal" as const,
  type: "feature" as const,
  complexity: "module" as const,
};

describe("routeWorkflow", () => {
  test("routes immediate trivial bug fixes to fast patch", () => {
    const route = routeWorkflow({
      urgency: "immediate",
      type: "bug",
      complexity: "trivial",
    });

    expect(route.tier).toBe("T0_FAST_PATCH");
    expect(route.tddPolicy.mode).toBe("smoke_only");
    expect(route.subagentPlan.required).toEqual([]);
    expect(route.reviewPolicy.reviewers).toEqual(["quality-gatekeeper"]);
  });

  test("routes normal module features to full TDD workflow", () => {
    const route = routeWorkflow(baseRequest);

    expect(route.tier).toBe("T2_NORMAL_FEATURE");
    expect(route.tddPolicy.mode).toBe("full_red_green");
    expect(route.stages).toContain("test");
    expect(route.stages).toContain("review");
    expect(route.subagentPlan.required).toContain("test-strategist");
    expect(route.subagentPlan.required).toContain("implementation-engineer");
  });

  test("adds contract stage and API reviewer for cross-module API risk", () => {
    const route = routeWorkflow({
      urgency: "normal",
      type: "feature",
      complexity: "cross_module",
      riskSurfaces: ["api", "performance"],
    });

    expect(route.tier).toBe("T3_COMPLEX_CHANGE");
    expect(route.stages).toContain("contract");
    expect(route.reviewPolicy.reviewers).toContain("api-compatibility-reviewer");
    expect(route.reviewPolicy.reviewers).toContain("performance-reviewer");
    expect(route.subagentPlan.required).toContain("integration-engineer");
  });

  test("routes research urgency to design-only plan", () => {
    const route = routeWorkflow({
      urgency: "research",
      type: "feature",
      complexity: "trivial",
    });

    expect(route.tier).toBe("T4_RESEARCH_PLAN");
    expect(route.tddPolicy.mode).toBe("none");
    expect(route.reviewPolicy.reviewers).toEqual([]);
    expect(route.subagentPlan.required).toContain("code-cartographer");
  });
});

describe("generateWorkflowPrompt", () => {
  test("includes route tier, stages, TDD policy, subagents, reviewers, and loop policy", () => {
    const route = routeWorkflow(baseRequest);
    const prompt = generateWorkflowPrompt(route);

    expect(prompt).toContain("## Workflow: T2 — Normal Feature");
    expect(prompt).toContain("### Stages");
    expect(prompt).toContain("### TDD Policy");
    expect(prompt).toContain("### Subagents");
    expect(prompt).toContain("### Review Policy");
    expect(prompt).toContain("### Loop Policy");
  });
});
