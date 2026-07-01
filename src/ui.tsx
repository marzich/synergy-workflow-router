import { createSignal, createMemo, Show, For, Component } from "solid-js";
import h from "solid-js/h";
import type {
  PluginPanelProps,
  PluginSettingsProps,
} from "@ericsanchezok/synergy-plugin/ui";

const React = { createElement: h };

// ---------------------------------------------------------------------------
// Import shared types from router core
// ---------------------------------------------------------------------------

import type {
  WorkflowRequest,
  WorkflowRoute,
  Urgency,
  TaskType,
  Complexity,
  RiskSurface,
} from "./schemas/workflow";
import { routeWorkflow } from "./router/route";
import { generateWorkflowPrompt } from "./router/prompt";

// UI-only concepts (not yet in router schema)
type WorktreePolicy = "clean" | "dirty" | "fresh";
type CodexPolicy = "none" | "investigation_only" | "full";

// ---------------------------------------------------------------------------
// Select option helpers
// ---------------------------------------------------------------------------

const URGENCY_OPTIONS: { value: Urgency; label: string }[] = [
  { value: "immediate", label: "Immediate — now / blocking" },
  { value: "normal", label: "Normal — this week / sprint" },
  { value: "research", label: "Research — investigation only" },
];

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "feature", label: "Feature" },
  { value: "bug", label: "Bug Fix" },
  { value: "refactor", label: "Refactor" },
  { value: "synergy_self_mod", label: "Synergy Self-Mod" },
  { value: "ui_polish", label: "UI Polish" },
  { value: "research", label: "Research" },
  { value: "other", label: "Other" },
];

const COMPLEXITY_OPTIONS: { value: Complexity; label: string }[] = [
  { value: "trivial", label: "Trivial — single line or config" },
  { value: "local", label: "Local — single file, well-understood" },
  { value: "module", label: "Module — multiple files" },
  { value: "cross_module", label: "Cross-Module — architectural" },
  { value: "system", label: "System — multi-system, novel" },
];

const WORKTREE_OPTIONS: { value: WorktreePolicy; label: string }[] = [
  { value: "clean", label: "Clean — new branch from latest" },
  { value: "dirty", label: "Dirty — work in current branch" },
  { value: "fresh", label: "Fresh — clone repo fresh + new branch" },
];

const CODEX_OPTIONS: { value: CodexPolicy; label: string }[] = [
  { value: "none", label: "None — skip Codex" },
  { value: "investigation_only", label: "Investigation only — pre-fix gate" },
  { value: "full", label: "Full — investigation + implementation" },
];

const RISK_SURFACES: { value: RiskSurface; label: string }[] = [
  { value: "api", label: "API / contract changes" },
  { value: "security", label: "Security surface" },
  { value: "performance", label: "Performance / latency" },
  { value: "docs", label: "Documentation" },
  { value: "migration", label: "Migration / compatibility" },
];

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— unspecified —" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "kotlin", label: "Kotlin" },
  { value: "swift", label: "Swift" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
];

// ---------------------------------------------------------------------------
// Hardcoded settings defaults
// ---------------------------------------------------------------------------

interface DefaultSettings {
  codex: CodexPolicy;
  worktree: WorktreePolicy;
  autoReview: boolean;
  tddDefault: string;
  maxSubagents: number;
}

const DEFAULTS: DefaultSettings = {
  codex: "investigation_only",
  worktree: "clean",
  autoReview: true,
  tddDefault: "full_red_green",
  maxSubagents: 4,
};

// ---------------------------------------------------------------------------
// Shared inline styles (avoid external CSS dependency)
// ---------------------------------------------------------------------------

const styles = {
  panel: {
    padding: "16px",
    fontFamily: "var(--synergy-font-family, system-ui, sans-serif)",
    fontSize: "14px",
    color: "var(--synergy-text-primary, #e0e0e0)",
    background: "var(--synergy-bg-primary, #1e1e1e)",
    height: "100%",
    overflowY: "auto" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color: "var(--synergy-text-secondary, #888)",
    marginBottom: "8px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "4px",
    color: "var(--synergy-text-secondary, #aaa)",
  },
  select: {
    width: "100%",
    padding: "6px 10px",
    fontSize: "13px",
    border: "1px solid var(--synergy-border, #444)",
    borderRadius: "4px",
    background: "var(--synergy-input-bg, #2a2a2a)",
    color: "var(--synergy-text-primary, #e0e0e0)",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: "80px",
    padding: "8px 10px",
    fontSize: "13px",
    border: "1px solid var(--synergy-border, #444)",
    borderRadius: "4px",
    background: "var(--synergy-input-bg, #2a2a2a)",
    color: "var(--synergy-text-primary, #e0e0e0)",
    resize: "vertical" as const,
    outline: "none",
    fontFamily: "inherit",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "4px",
  },
  checkbox: {
    accentColor: "var(--synergy-accent, #4fc3f7)",
  },
  button: {
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: 500,
    border: "1px solid var(--synergy-border, #444)",
    borderRadius: "4px",
    background: "var(--synergy-button-bg, #333)",
    color: "var(--synergy-text-primary, #e0e0e0)",
    cursor: "pointer",
  },
  preBlock: {
    padding: "12px",
    fontSize: "12px",
    fontFamily: "var(--synergy-mono-font, 'Menlo', 'Monaco', monospace)",
    background: "var(--synergy-code-bg, #111)",
    border: "1px solid var(--synergy-border, #444)",
    borderRadius: "4px",
    color: "var(--synergy-text-primary, #e0e0e0)",
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    maxHeight: "320px",
    overflowY: "auto" as const,
  },
  previewCard: {
    padding: "12px",
    border: "1px solid var(--synergy-border, #444)",
    borderRadius: "4px",
    background: "var(--synergy-card-bg, #252525)",
    fontSize: "13px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  badge: {
    display: "inline-block",
    padding: "2px 8px",
    fontSize: "11px",
    fontWeight: 600,
    borderRadius: "3px",
    background: "var(--synergy-accent-dim, rgba(79, 195, 247, 0.15))",
    color: "var(--synergy-accent, #4fc3f7)",
  },
  settingsTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "13px",
  },
  settingsCell: {
    padding: "6px 10px",
    borderBottom: "1px solid var(--synergy-border, #333)",
  },
  notice: {
    padding: "10px 12px",
    fontSize: "12px",
    background: "var(--synergy-notice-bg, rgba(255, 193, 7, 0.12))",
    border: "1px solid var(--synergy-notice-border, rgba(255, 193, 7, 0.3))",
    borderRadius: "4px",
    color: "var(--synergy-notice-text, #ffc107)",
    lineHeight: 1.5,
  },
  errorNotice: {
    padding: "10px 12px",
    fontSize: "12px",
    background: "var(--synergy-error-bg, rgba(239, 83, 80, 0.12))",
    border: "1px solid var(--synergy-error-border, rgba(239, 83, 80, 0.3))",
    borderRadius: "4px",
    color: "var(--synergy-error-text, #ef5350)",
  },
  helpText: {
    fontSize: "11px",
    color: "var(--synergy-text-muted, #666)",
    marginTop: "2px",
  },
};

// ---------------------------------------------------------------------------
// DevFlowPanel — workspace panel
// ---------------------------------------------------------------------------

export const DevFlowPanel: Component<PluginPanelProps> = (_props) => {
  // Form state
  const [description, setDescription] = createSignal("");
  const [urgency, setUrgency] = createSignal<Urgency>("normal");
  const [taskType, setTaskType] = createSignal<TaskType>("feature");
  const [complexity, setComplexity] = createSignal<Complexity>("module");
  const [worktree, setWorktree] = createSignal<WorktreePolicy>("clean");
  const [codex, setCodex] = createSignal<CodexPolicy>("investigation_only");
  const [riskSurfaces, setRiskSurfaces] = createSignal<RiskSurface[]>([]);
  const [language, setLanguage] = createSignal("");

  // Derived route result
  const routeInput = createMemo<WorkflowRequest>(() => ({
    urgency: urgency(),
    type: taskType(),
    complexity: complexity(),
    scope: description() || undefined,
    language: language() || undefined,
    riskSurfaces: riskSurfaces(),
  }));

  const routeResult = createMemo<WorkflowRoute | null>(() => {
    try {
      if (typeof routeWorkflow !== "function") return null;
      return routeWorkflow(routeInput());
    } catch {
      return null;
    }
  });

  const promptText = createMemo<string>(() => {
    const route = routeResult();
    if (!route) return "";
    try {
      if (typeof generateWorkflowPrompt !== "function") return "";
      return generateWorkflowPrompt(route);
    } catch {
      return "";
    }
  });

  const routerAvailable = createMemo(() => routeResult() !== null);

  const toggleRisk = (surface: RiskSurface) => {
    setRiskSurfaces((prev) =>
      prev.includes(surface)
        ? prev.filter((s) => s !== surface)
        : [...prev, surface],
    );
  };

  const copyPrompt = async () => {
    const text = promptText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback: select the pre content so user can Ctrl+C
      const el = document.getElementById("wf-prompt-output");
      if (el) {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  return (
    <div style={styles.panel}>
      {/* ---- Task Description ---- */}
      <div>
        <label style={styles.label} for="wf-desc">
          Task Description
        </label>
        <textarea
          id="wf-desc"
          style={styles.textarea}
          placeholder="What needs to be done? (e.g., 'add dark mode toggle to settings', 'fix race condition in message queue')"
          value={description()}
          onInput={(e) => setDescription(e.currentTarget.value)}
        />
      </div>

      {/* ---- Urgency + Task Type row ---- */}
      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <label style={styles.label} for="wf-urgency">
            Urgency
          </label>
          <select
            id="wf-urgency"
            style={styles.select}
            value={urgency()}
            onChange={(e) => setUrgency(e.currentTarget.value as Urgency)}
          >
            <For each={URGENCY_OPTIONS}>
              {(opt) => <option value={opt.value}>{opt.label}</option>}
            </For>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label} for="wf-type">
            Task Type
          </label>
          <select
            id="wf-type"
            style={styles.select}
            value={taskType()}
            onChange={(e) => setTaskType(e.currentTarget.value as TaskType)}
          >
            <For each={TASK_TYPE_OPTIONS}>
              {(opt) => <option value={opt.value}>{opt.label}</option>}
            </For>
          </select>
        </div>
      </div>

      {/* ---- Complexity + Worktree row ---- */}
      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <label style={styles.label} for="wf-complexity">
            Complexity
          </label>
          <select
            id="wf-complexity"
            style={styles.select}
            value={complexity()}
            onChange={(e) =>
              setComplexity(e.currentTarget.value as Complexity)
            }
          >
            <For each={COMPLEXITY_OPTIONS}>
              {(opt) => <option value={opt.value}>{opt.label}</option>}
            </For>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label} for="wf-worktree">
            Worktree
          </label>
          <select
            id="wf-worktree"
            style={styles.select}
            value={worktree()}
            onChange={(e) =>
              setWorktree(e.currentTarget.value as WorktreePolicy)
            }
          >
            <For each={WORKTREE_OPTIONS}>
              {(opt) => <option value={opt.value}>{opt.label}</option>}
            </For>
          </select>
        </div>
      </div>

      {/* ---- Codex + Language row ---- */}
      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <label style={styles.label} for="wf-codex">
            Codex
          </label>
          <select
            id="wf-codex"
            style={styles.select}
            value={codex()}
            onChange={(e) => setCodex(e.currentTarget.value as CodexPolicy)}
          >
            <For each={CODEX_OPTIONS}>
              {(opt) => <option value={opt.value}>{opt.label}</option>}
            </For>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label} for="wf-language">
            Language (optional)
          </label>
          <select
            id="wf-language"
            style={styles.select}
            value={language()}
            onChange={(e) => setLanguage(e.currentTarget.value)}
          >
            <For each={LANGUAGE_OPTIONS}>
              {(opt) => <option value={opt.value}>{opt.label}</option>}
            </For>
          </select>
        </div>
      </div>

      {/* ---- Risk Surfaces ---- */}
      <div>
        <div style={styles.sectionTitle}>Risk Surfaces</div>
        <For each={RISK_SURFACES}>
          {(surface) => (
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={riskSurfaces().includes(surface.value)}
                onChange={() => toggleRisk(surface.value)}
              />
              {surface.label}
            </label>
          )}
        </For>
      </div>

      {/* ---- Workflow Preview ---- */}
      <div>
        <div style={styles.sectionTitle}>Workflow Preview</div>
        <Show
          when={routerAvailable()}
          fallback={
            <div style={styles.notice}>
              Router unavailable. Check the plugin console and verify the router
              modules are included in the built UI bundle.
            </div>
          }
        >
          <div style={styles.previewCard}>
            <div>
              <span style={{ "font-weight": 600 }}>Tier:</span>{" "}
              <span style={styles.badge}>{routeResult()!.tier}</span>
            </div>
            <div>
              <span style={{ "font-weight": 600 }}>TDD:</span>{" "}
              <span style={styles.badge}>{routeResult()!.tddPolicy.mode}</span>
              <div style={styles.helpText}>{routeResult()!.tddPolicy.description}</div>
            </div>
            <div>
              <span style={{ "font-weight": 600 }}>Stages:</span>{" "}
              {routeResult()!.stages.join(" → ")}
            </div>
            <div>
              <span style={{ "font-weight": 600 }}>Subagents (required):</span>{" "}
              {routeResult()!.subagentPlan.required.length > 0
                ? routeResult()!.subagentPlan.required.join(", ")
                : "none"}
            </div>
            <div>
              <span style={{ "font-weight": 600 }}>Reviewers:</span>{" "}
              {routeResult()!.reviewPolicy.reviewers.length > 0
                ? routeResult()!.reviewPolicy.reviewers.join(", ")
                : "none"}
            </div>
            <div>
              <span style={{ "font-weight": 600 }}>Loop:</span>{" "}
              <span style={styles.badge}>{routeResult()!.loopPolicy}</span>
            </div>
          </div>
        </Show>
      </div>

      {/* ---- Generated Prompt ---- */}
      <Show when={promptText()}>
        <div>
          <div
            style={{
              display: "flex",
              "justify-content": "space-between",
              "align-items": "center",
              "margin-bottom": "8px",
            }}
          >
            <div style={styles.sectionTitle}>Generated Workflow Prompt</div>
            <button style={styles.button} onClick={copyPrompt}>
              Copy
            </button>
          </div>
          <pre id="wf-prompt-output" style={styles.preBlock}>
            {promptText()}
          </pre>
        </div>
      </Show>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SettingsPanel — plugin settings
// ---------------------------------------------------------------------------

export const SettingsPanel: Component<PluginSettingsProps> = (props) => {
  return (
    <div style={styles.panel}>
      <div>
        <div style={styles.sectionTitle}>Default Workflow Preferences</div>
        <div style={styles.helpText}>
          These defaults are used when no explicit overrides are provided in the
          workflow panel.
        </div>
      </div>

      {/* ---- Defaults table ---- */}
      <table style={styles.settingsTable}>
        <tbody>
          <tr>
            <td style={{ ...styles.settingsCell, "font-weight": 600 }}>
              Default Codex Policy
            </td>
            <td style={styles.settingsCell}>{DEFAULTS.codex}</td>
          </tr>
          <tr>
            <td style={{ ...styles.settingsCell, "font-weight": 600 }}>
              Default Worktree Policy
            </td>
            <td style={styles.settingsCell}>{DEFAULTS.worktree}</td>
          </tr>
          <tr>
            <td style={{ ...styles.settingsCell, "font-weight": 600 }}>
              Default TDD Policy
            </td>
            <td style={styles.settingsCell}>{DEFAULTS.tddDefault}</td>
          </tr>
          <tr>
            <td style={{ ...styles.settingsCell, "font-weight": 600 }}>
              Auto-Review
            </td>
            <td style={styles.settingsCell}>
              {DEFAULTS.autoReview ? "enabled" : "disabled"}
            </td>
          </tr>
          <tr>
            <td style={{ ...styles.settingsCell, "font-weight": 600 }}>
              Max Subagents
            </td>
            <td style={styles.settingsCell}>{DEFAULTS.maxSubagents}</td>
          </tr>
        </tbody>
      </table>

      {/* ---- MVP notice ---- */}
      <div style={styles.notice}>
        <strong>MVP scope note:</strong> Editable persistence of these settings
        is out of scope for the initial release. Future versions will support
        saving preferences per scope with the Synergy plugin settings API.
      </div>

      {/* ---- Output current values so the settings surface is wired ---- */}
      <Show when={props.onChange}>
        <div style={styles.helpText}>
          Settings surface is connected ({props.pluginId}).
        </div>
      </Show>
    </div>
  );
};
