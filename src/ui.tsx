import { createSignal, createMemo, Show, For, Component } from "solid-js";
import type { PluginPanelProps, PluginSettingsProps } from "@ericsanchezok/synergy-plugin/ui";

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

type WorktreePolicy = "clean" | "dirty" | "fresh";
type CodexPolicy = "none" | "investigation_only" | "full";

// ── Option data ──

const URGENCY_OPTIONS = [
  { value: "immediate" as Urgency, label: "Immediate" },
  { value: "normal" as Urgency, label: "Normal" },
  { value: "research" as Urgency, label: "Research" },
];
const TASK_TYPE_OPTIONS = [
  { value: "feature" as TaskType, label: "Feature" },
  { value: "bug" as TaskType, label: "Bug Fix" },
  { value: "refactor" as TaskType, label: "Refactor" },
  { value: "synergy_self_mod" as TaskType, label: "Synergy Self-Mod" },
  { value: "ui_polish" as TaskType, label: "UI Polish" },
  { value: "research" as TaskType, label: "Research" },
  { value: "other" as TaskType, label: "Other" },
];
const COMPLEXITY_OPTIONS = [
  { value: "trivial" as Complexity, label: "Trivial" },
  { value: "local" as Complexity, label: "Local" },
  { value: "module" as Complexity, label: "Module" },
  { value: "cross_module" as Complexity, label: "Cross-Module" },
  { value: "system" as Complexity, label: "System" },
];
const WORKTREE_OPTIONS = [
  { value: "clean" as WorktreePolicy, label: "Clean" },
  { value: "dirty" as WorktreePolicy, label: "Dirty" },
  { value: "fresh" as WorktreePolicy, label: "Fresh" },
];
const CODEX_OPTIONS = [
  { value: "none" as CodexPolicy, label: "Skip" },
  { value: "investigation_only" as CodexPolicy, label: "Investigate" },
  { value: "full" as CodexPolicy, label: "Full" },
];
const RISK_SURFACES = [
  { value: "api" as RiskSurface, label: "API" },
  { value: "security" as RiskSurface, label: "Security" },
  { value: "performance" as RiskSurface, label: "Perf" },
  { value: "docs" as RiskSurface, label: "Docs" },
  { value: "migration" as RiskSurface, label: "Migrate" },
];
const LANGUAGE_OPTIONS = [
  { value: "", label: "—" },
  { value: "typescript", label: "TS" },
  { value: "python", label: "PY" },
  { value: "rust", label: "RS" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "kotlin", label: "KT" },
  { value: "swift", label: "Swift" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
];

const DEFAULTS = {
  codex: "investigation_only" as CodexPolicy,
  worktree: "clean" as WorktreePolicy,
  autoReview: true,
  tddDefault: "full_red_green",
  maxSubagents: 4,
};

// ── Sub-components ──

function Section(p: { title: string; defaultOpen?: boolean; children: any }) {
  const [open, setOpen] = createSignal(p.defaultOpen ?? true);
  return (
    <div style={{ "min-width": "0", "max-width": "100%", "box-sizing": "border-box" }}>
      <div
        style={{
          display: "flex", "align-items": "center", gap: "6px", padding: "5px 8px",
          cursor: "pointer", "border-radius": "4px",
          background: "var(--synergy-card-bg, #252525)",
          border: "1px solid var(--synergy-border, #333)",
          "user-select": "none", "font-size": "12px", "font-weight": "600",
          color: "var(--synergy-text-primary, #d4d4d4)",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{
          display: "inline-block", transition: "transform 0.15s",
          transform: open() ? "rotate(90deg)" : "rotate(0deg)",
          "font-size": "10px", color: "var(--synergy-text-muted, #666)",
          "flex-shrink": "0",
        }}>▸</span>
        <span>{p.title}</span>
      </div>
      <Show when={open()}>
        <div style={{
          padding: "5px 0", display: "flex", "flex-direction": "column", gap: "5px",
          "min-width": "0", "max-width": "100%", "box-sizing": "border-box",
        }}>
          {p.children}
        </div>
      </Show>
    </div>
  );
}

function Chips(p: { items: { value: RiskSurface; label: string }[]; selected: () => RiskSurface[]; onToggle: (v: RiskSurface) => void }) {
  return (
    <div style={{ display: "flex", "flex-wrap": "wrap", gap: "4px", "max-width": "100%", "min-width": "0" }}>
      <For each={p.items}>
        {(s) => {
          const active = () => p.selected().includes(s.value);
          return (
            <div
              style={{
                padding: "2px 7px", "font-size": "11px", "border-radius": "3px", cursor: "pointer",
                border: active() ? "1px solid var(--synergy-accent, #4fc3f7)" : "1px solid var(--synergy-border, #444)",
                background: active() ? "var(--synergy-accent-dim, rgba(79,195,247,0.12))" : "transparent",
                color: active() ? "var(--synergy-accent, #4fc3f7)" : "var(--synergy-text-secondary, #999)",
                "font-weight": active() ? "600" : "400", "user-select": "none", "flex-shrink": "0",
              }}
              onClick={() => p.onToggle(s.value)}
            >{s.label}</div>
          );
        }}
      </For>
    </div>
  );
}

function SelectField(p: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ "min-width": "0", "max-width": "100%", "box-sizing": "border-box" }}>
      <div style={{
        display: "block", "font-size": "10px", "font-weight": "500", "margin-bottom": "2px",
        color: "var(--synergy-text-secondary, #999)", "text-transform": "uppercase", "letter-spacing": "0.3px",
      }}>{p.label}</div>
      <select
        style={{
          display: "block", width: "100%", "max-width": "100%", "box-sizing": "border-box",
          padding: "3px 5px", "font-size": "12px", border: "1px solid var(--synergy-border, #444)",
          "border-radius": "4px", background: "var(--synergy-input-bg, #2a2a2a)",
          color: "var(--synergy-text-primary, #e0e0e0)", outline: "none", "min-width": "0",
        }}
        value={p.value}
        onChange={(e) => p.onChange(e.currentTarget.value)}
      >
        <For each={p.options}>{(o) => <option value={o.value}>{o.label}</option>}</For>
      </select>
    </div>
  );
}

function Badge(p: { color?: string; children: any }) {
  return (
    <span style={{
      display: "inline-block", padding: "1px 6px", "font-size": "10px", "font-weight": "600",
      "border-radius": "3px", "flex-shrink": "0",
      background: p.color ? "rgba(255,255,255,0.06)" : "var(--synergy-accent-dim, rgba(79,195,247,0.12))",
      color: p.color || "var(--synergy-accent, #4fc3f7)",
    }}>{p.children}</span>
  );
}

function PRow(p: { label: string; children: any }) {
  return (
    <div style={{
      display: "flex", "align-items": "baseline", gap: "4px", "flex-wrap": "wrap",
      "min-width": "0", "max-width": "100%",
    }}>
      <span style={{
        "font-weight": "600", color: "var(--synergy-text-secondary, #999)", "flex-shrink": "0",
        "font-size": "10px", "text-transform": "uppercase", "letter-spacing": "0.2px",
      }}>{p.label}</span>
      <span style={{
        color: "var(--synergy-text-primary, #d4d4d4)", "word-break": "break-all",
        "min-width": "0", "font-size": "11px",
      }}>{p.children}</span>
    </div>
  );
}

// ── DevFlowPanel ──

export const DevFlowPanel: Component<PluginPanelProps> = (_props) => {
  const [description, setDescription] = createSignal("");
  const [urgency, setUrgency] = createSignal<Urgency>("normal");
  const [taskType, setTaskType] = createSignal<TaskType>("feature");
  const [complexity, setComplexity] = createSignal<Complexity>("module");
  const [worktree, setWorktree] = createSignal<WorktreePolicy>("clean");
  const [codex, setCodex] = createSignal<CodexPolicy>("investigation_only");
  const [riskSurfaces, setRiskSurfaces] = createSignal<RiskSurface[]>([]);
  const [language, setLanguage] = createSignal("");
  const [showPrompt, setShowPrompt] = createSignal(false);

  const routeInput = createMemo<WorkflowRequest>(() => ({
    urgency: urgency(), type: taskType(), complexity: complexity(),
    scope: description() || undefined,
    language: language() || undefined,
    riskSurfaces: riskSurfaces(),
  }));

  const routeResult = createMemo<WorkflowRoute | null>(() => {
    try {
      if (typeof routeWorkflow !== "function") return null;
      return routeWorkflow(routeInput());
    } catch { return null; }
  });

  const promptText = createMemo<string>(() => {
    const route = routeResult();
    if (!route) return "";
    try {
      if (typeof generateWorkflowPrompt !== "function") return "";
      return generateWorkflowPrompt(route);
    } catch { return ""; }
  });

  const routerAvailable = createMemo(() => routeResult() !== null);

  const toggleRisk = (s: RiskSurface) =>
    setRiskSurfaces((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const copyPrompt = async () => {
    setShowPrompt(true);
    try { await navigator.clipboard.writeText(promptText()); } catch {
      const el = document.getElementById("wf-prompt-output");
      if (el) {
        const sel = window.getSelection();
        const r = document.createRange();
        r.selectNodeContents(el);
        sel?.removeAllRanges();
        sel?.addRange(r);
      }
    }
  };

  return (
    <div style={{
      display: "flex", "flex-direction": "column", height: "100%", overflow: "hidden",
      "font-size": "12px", color: "var(--synergy-text-primary, #d4d4d4)",
      background: "var(--synergy-bg-primary, #1e1e1e)",
      "font-family": "var(--synergy-font-family, system-ui, sans-serif)",
      "box-sizing": "border-box", "min-width": "0", "max-width": "100%",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", "align-items": "center", gap: "6px", padding: "7px 10px",
        "border-bottom": "1px solid var(--synergy-border, #333)", "font-size": "12px",
        "font-weight": "600", color: "var(--synergy-text-primary, #e0e0e0)", "flex-shrink": "0",
        background: "var(--synergy-bg-secondary, #252525)",
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        Workflow Router
        <Show when={routerAvailable() && routeResult()}>
          <Badge>{routeResult()!.tier}</Badge>
        </Show>
      </div>

      {/* Scrollable body */}
      <div style={{
        flex: "1", "overflow-y": "auto", "overflow-x": "hidden", padding: "8px 10px",
        display: "flex", "flex-direction": "column", gap: "4px", "min-width": "0",
        "max-width": "100%", "box-sizing": "border-box",
      }}>
        {/* Task */}
        <Section title="Task">
          <textarea
            style={{
              display: "block", width: "100%", "max-width": "100%", "box-sizing": "border-box",
              "min-height": "52px", padding: "6px 8px", "font-size": "12px", "font-family": "inherit",
              border: "1px solid var(--synergy-border, #444)", "border-radius": "4px",
              background: "var(--synergy-input-bg, #2a2a2a)",
              color: "var(--synergy-text-primary, #e0e0e0)", resize: "vertical", outline: "none",
              "min-width": "0",
            }}
            placeholder='e.g., "add dark mode toggle"'
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
          />
        </Section>

        {/* Route Config */}
        <Section title="Route">
          <SelectField label="Urgency" value={urgency()} onChange={(v) => setUrgency(v as Urgency)} options={URGENCY_OPTIONS} />
          <SelectField label="Type" value={taskType()} onChange={(v) => setTaskType(v as TaskType)} options={TASK_TYPE_OPTIONS} />
          <SelectField label="Complexity" value={complexity()} onChange={(v) => setComplexity(v as Complexity)} options={COMPLEXITY_OPTIONS} />
          <SelectField label="Language" value={language()} onChange={setLanguage} options={LANGUAGE_OPTIONS} />
        </Section>

        {/* Risk & Policy */}
        <Section title="Risk &amp; Policy">
          <div style={{
            "font-size": "10px", "font-weight": "500", "margin-bottom": "2px",
            color: "var(--synergy-text-secondary, #999)", "text-transform": "uppercase",
            "letter-spacing": "0.3px",
          }}>Risk Surfaces</div>
          <Chips items={RISK_SURFACES} selected={riskSurfaces} onToggle={toggleRisk} />
          <SelectField label="Worktree" value={worktree()} onChange={(v) => setWorktree(v as WorktreePolicy)} options={WORKTREE_OPTIONS} />
          <SelectField label="Codex" value={codex()} onChange={(v) => setCodex(v as CodexPolicy)} options={CODEX_OPTIONS} />
        </Section>

        {/* Preview */}
        <Section title="Preview">
          <Show
            when={routerAvailable()}
            fallback={
              <div style={{
                padding: "6px 8px", "font-size": "11px",
                background: "var(--synergy-notice-bg, rgba(255,193,7,0.10))",
                border: "1px solid var(--synergy-notice-border, rgba(255,193,7,0.25))",
                "border-radius": "4px", color: "var(--synergy-notice-text, #e2b714)",
              }}>Router unavailable — check plugin console.</div>
            }
          >
            <div style={{
              display: "flex", "flex-direction": "column", gap: "4px", padding: "7px",
              "border-radius": "4px", background: "var(--synergy-card-bg, #252525)",
              border: "1px solid var(--synergy-border, #333)", "font-size": "11px",
              "line-height": "1.45", "min-width": "0", "max-width": "100%", "box-sizing": "border-box",
            }}>
              <PRow label="Tier"><Badge>{routeResult()!.tier}</Badge></PRow>
              <PRow label="TDD">
                <Badge color="var(--synergy-text-muted, #888)">{routeResult()!.tddPolicy.mode}</Badge>{' '}
                <span style={{ color: "var(--synergy-text-muted, #666)", "font-size": "10px" }}>
                  {routeResult()!.tddPolicy.description}
                </span>
              </PRow>
              <PRow label="Stages">{routeResult()!.stages.join(" → ")}</PRow>
              <Show when={routeResult()!.subagentPlan.required.length > 0}>
                <PRow label="Agents">{routeResult()!.subagentPlan.required.join(", ")}</PRow>
              </Show>
              <Show when={routeResult()!.reviewPolicy.reviewers.length > 0}>
                <PRow label="Review">{routeResult()!.reviewPolicy.reviewers.join(", ")}</PRow>
              </Show>
              <PRow label="Loop">
                <Badge color="var(--synergy-text-muted, #888)">{routeResult()!.loopPolicy}</Badge>
              </PRow>
            </div>
          </Show>
        </Section>

        {/* Copy button */}
        <Show when={promptText()}>
          <button
            style={{
              display: "block", width: "100%", "max-width": "100%", "box-sizing": "border-box",
              padding: "5px 0", "font-size": "12px", "font-weight": "500",
              border: "1px solid var(--synergy-accent, #4fc3f7)", "border-radius": "4px",
              background: "var(--synergy-accent-dim, rgba(79,195,247,0.10))",
              color: "var(--synergy-accent, #4fc3f7)", cursor: "pointer", "text-align": "center",
              "min-width": "0",
            }}
            onClick={copyPrompt}
          >📋 Copy Prompt</button>
        </Show>

        {/* Prompt output */}
        <Show when={showPrompt() && promptText()}>
          <Section title="Prompt" defaultOpen={true}>
            <pre
              id="wf-prompt-output"
              style={{
                padding: "8px", "font-size": "11px", "font-family": "var(--synergy-mono-font, monospace)",
                background: "var(--synergy-code-bg, #0d0d0d)", border: "1px solid var(--synergy-border, #444)",
                "border-radius": "4px", color: "var(--synergy-text-primary, #e0e0e0)",
                "white-space": "pre-wrap", "word-break": "break-word", "overflow-wrap": "break-word",
                "max-height": "240px", "overflow-y": "auto", "overflow-x": "hidden",
                "max-width": "100%", "box-sizing": "border-box", "min-width": "0", "line-height": "1.4",
                margin: "0",
              }}
            >{promptText()}</pre>
          </Section>
        </Show>

        {/* No router fallback (hidden when sections above cover it) */}
        <Show when={!routerAvailable() && !promptText()}>
          <div style={{
            padding: "6px 8px", "font-size": "11px",
            background: "var(--synergy-notice-bg, rgba(255,193,7,0.10))",
            border: "1px solid var(--synergy-notice-border, rgba(255,193,7,0.25))",
            "border-radius": "4px", color: "var(--synergy-notice-text, #e2b714)",
          }}>Router unavailable — check plugin console.</div>
        </Show>
      </div>
    </div>
  );
};

// ── SettingsPanel ──

export const SettingsPanel: Component<PluginSettingsProps> = (props) => {
  const rows = [
    ["Codex", DEFAULTS.codex],
    ["Worktree", DEFAULTS.worktree],
    ["TDD", DEFAULTS.tddDefault],
    ["Auto-Review", DEFAULTS.autoReview ? "Yes" : "No"],
    ["Max Subagents", String(DEFAULTS.maxSubagents)],
  ] as const;
  return (
    <div style={{
      display: "flex", "flex-direction": "column", height: "100%",
      "font-size": "12px", color: "var(--synergy-text-primary, #d4d4d4)",
      background: "var(--synergy-bg-primary, #1e1e1e)",
      "font-family": "var(--synergy-font-family, system-ui, sans-serif)",
    }}>
      <div style={{
        padding: "7px 10px", "font-weight": "600",
        "border-bottom": "1px solid var(--synergy-border, #333)",
      }}>Settings</div>
      <div style={{ padding: "10px", display: "flex", "flex-direction": "column", gap: "6px" }}>
        <div style={{
          padding: "8px", "border-radius": "4px",
          background: "var(--synergy-card-bg, #252525)",
          border: "1px solid var(--synergy-border, #333)",
        }}>
          <table style={{ width: "100%", "font-size": "12px" }}>
            <tbody>
              <For each={rows}>{(row) => (
                <tr>
                  <td style={{ padding: "4px 6px", "font-weight": "600", "border-bottom": "1px solid var(--synergy-border, #333)" }}>{row[0]}</td>
                  <td style={{ padding: "4px 6px", "border-bottom": "1px solid var(--synergy-border, #333)" }}>{row[1]}</td>
                </tr>
              )}</For>
            </tbody>
          </table>
        </div>
        <div style={{
          padding: "6px 8px", "font-size": "11px",
          background: "var(--synergy-notice-bg, rgba(255,193,7,0.10))",
          border: "1px solid var(--synergy-notice-border, rgba(255,193,7,0.25))",
          "border-radius": "4px", color: "var(--synergy-notice-text, #e2b714)",
        }}>MVP — editable persistence coming in a future release.</div>
        <Show when={props.onChange}>
          <div style={{ "font-size": "10px", color: "var(--synergy-text-muted, #666)" }}>
            Connected ({props.pluginId})
          </div>
        </Show>
      </div>
    </div>
  );
};
