import { z } from "zod";

// ─── Route tiers ───────────────────────────────────────────

export const RouteTiers = [
  "T0_FAST_PATCH",
  "T1_PRACTICAL_FIX",
  "T2_NORMAL_FEATURE",
  "T3_COMPLEX_CHANGE",
  "T4_RESEARCH_PLAN",
] as const;

export type RouteTier = (typeof RouteTiers)[number];
export const TIER_LABELS: Record<RouteTier, string> = {
  T0_FAST_PATCH: "T0 — Fast Patch",
  T1_PRACTICAL_FIX: "T1 — Practical Fix",
  T2_NORMAL_FEATURE: "T2 — Normal Feature",
  T3_COMPLEX_CHANGE: "T3 — Complex Change",
  T4_RESEARCH_PLAN: "T4 — Research Plan",
};


// ─── Request types ─────────────────────────────────────────

export const TaskType = [
  "bug",
  "feature",
  "refactor",
  "synergy_self_mod",
  "ui_polish",
  "research",
  "other",
] as const;

export type TaskType = (typeof TaskType)[number];

export const Complexity = [
  "trivial",
  "local",
  "module",
  "cross_module",
  "system",
] as const;

export type Complexity = (typeof Complexity)[number];

export const Urgency = ["immediate", "normal", "research"] as const;

export type Urgency = (typeof Urgency)[number];

export const RiskSurface = [
  "api",
  "security",
  "performance",
  "docs",
  "migration",
] as const;

export type RiskSurface = (typeof RiskSurface)[number];

export const workflowRequestSchema = z.object({
  urgency: z.enum(Urgency),
  type: z.enum(TaskType),
  complexity: z.enum(Complexity),
  scope: z.string().optional(),
  rootCause: z.enum(["clear", "unclear"]).optional(),
  language: z.string().optional(),
  riskSurfaces: z.array(z.enum(RiskSurface)).optional(),
});

export type WorkflowRequest = z.infer<typeof workflowRequestSchema>;

// ─── TDD policy ────────────────────────────────────────────

export type TddMode = "none" | "smoke_only" | "post_fix_verification" | "full_red_green";

export interface TddPolicy {
  mode: TddMode;
  description: string;
}

// ─── Review policy ─────────────────────────────────────────

export interface ReviewPolicy {
  reviewers: string[];
  description: string;
}

// ─── Subagent plan ─────────────────────────────────────────

export interface SubagentPlan {
  required: string[];
  optional: string[];
  description: string;
}

// ─── Loop policy ───────────────────────────────────────────

export type LoopPolicy =
  | "strict_one_pass"
  | "verify_loop"
  | "iterate_with_review"
  | "design_then_approve";

// ─── Route output ──────────────────────────────────────────

export interface WorkflowRoute {
  tier: RouteTier;
  tddPolicy: TddPolicy;
  reviewPolicy: ReviewPolicy;
  subagentPlan: SubagentPlan;
  loopPolicy: LoopPolicy;
  stages: string[];
  skippedStages: string[];
}

// Backward-compatible alias for typo in original schema name
export const workfowRequestSchema = workflowRequestSchema;
