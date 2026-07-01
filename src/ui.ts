// ── no-framework DOM-based UI for synergy plugin sandbox ──
// The synergy-plugin build transforms .tsx to React.createElement.
// This file avoids JSX entirely — plain DOM construction with CSS vars.

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

// ── types ──

type WorktreePolicy = "clean" | "dirty" | "fresh";
type CodexPolicy = "none" | "investigation_only" | "full";

// ── data ──

const URGENCY: { value: Urgency; label: string }[] = [
  { value: "immediate", label: "Immediate" },
  { value: "normal", label: "Normal" },
  { value: "research", label: "Research" },
];
const TASK_TYPE: { value: TaskType; label: string }[] = [
  { value: "feature", label: "Feature" }, { value: "bug", label: "Bug Fix" },
  { value: "refactor", label: "Refactor" }, { value: "synergy_self_mod", label: "Synergy Self-Mod" },
  { value: "ui_polish", label: "UI Polish" }, { value: "research", label: "Research" },
  { value: "other", label: "Other" },
];
const COMPLEXITY: { value: Complexity; label: string }[] = [
  { value: "trivial", label: "Trivial" }, { value: "local", label: "Local" },
  { value: "module", label: "Module" }, { value: "cross_module", label: "Cross-Module" },
  { value: "system", label: "System" },
];
const WORKTREE: { value: WorktreePolicy; label: string }[] = [
  { value: "clean", label: "Clean" }, { value: "dirty", label: "Dirty" },
  { value: "fresh", label: "Fresh" },
];
const CODEX: { value: CodexPolicy; label: string }[] = [
  { value: "none", label: "Skip" }, { value: "investigation_only", label: "Investigate" },
  { value: "full", label: "Full" },
];
const RISK_ITEMS: { value: RiskSurface; label: string }[] = [
  { value: "api", label: "API" }, { value: "security", label: "Security" },
  { value: "performance", label: "Perf" }, { value: "docs", label: "Docs" },
  { value: "migration", label: "Migr" },
];
const LANGUAGES: { value: string; label: string }[] = [
  { value: "", label: "—" }, { value: "typescript", label: "TS" },
  { value: "python", label: "PY" }, { value: "rust", label: "RS" },
  { value: "go", label: "Go" }, { value: "java", label: "Java" },
  { value: "kotlin", label: "KT" }, { value: "swift", label: "Swift" },
  { value: "csharp", label: "C#" }, { value: "cpp", label: "C++" },
];

const DEFAULTS = {
  worktree: "clean" as WorktreePolicy,
  codex: "investigation_only" as CodexPolicy,
};

// ── style helpers ──

const V = (name: string, fallback: string) => `var(--${name}, ${fallback})`;

function setCss(el: HTMLElement, css: Record<string, string>) {
  for (const [k, v] of Object.entries(css)) el.style.setProperty(k, v);
}

function el(tag: string, css?: Record<string, string>, ...children: (string | Node)[]): HTMLElement {
  const e = document.createElement(tag);
  if (css) setCss(e, css);
  for (const c of children) {
    if (typeof c === "string") e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  }
  return e;
}

function select(css: Record<string, string>, options: { value: string; label: string }[], current: string, cb: (v: string) => void): HTMLSelectElement {
  const s = document.createElement("select");
  setCss(s, css);
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.value === current) opt.selected = true;
    s.appendChild(opt);
  }
  s.addEventListener("change", () => cb(s.value));
  return s;
}

// ── DevFlowPanel ──

export function DevFlowPanel(_props: PluginPanelProps): HTMLElement {
  // ── state (plain JS, no framework) ──
  let description = "";
  let urgency: Urgency = "normal";
  let taskType: TaskType = "feature";
  let complexity: Complexity = "module";
  let worktree: WorktreePolicy = DEFAULTS.worktree;
  let codex: CodexPolicy = DEFAULTS.codex;
  let language = "";
  const riskSurfaces: Set<RiskSurface> = new Set();
  let showPrompt = false;

  // ── refs to DOM nodes that need updating ──
  let previewCard: HTMLElement;
  let promptSection: HTMLElement;
  let copyBtn: HTMLElement;
  let promptPre: HTMLPreElement|null = null;
  const sectionContents: Map<string, HTMLElement> = new Map();

  // ── compute route ──
  function computeRoute(): WorkflowRoute | null {
    try {
      const req: WorkflowRequest = {
        urgency, type: taskType, complexity,
        scope: description || undefined,
        language: language || undefined,
        riskSurfaces: [...riskSurfaces],
      };
      return routeWorkflow(req);
    } catch { return null; }
  }

  function computePrompt(): string {
    const r = computeRoute();
    if (!r) return "";
    try { return generateWorkflowPrompt(r); } catch { return ""; }
  }

  // ── risk chip render ──
  function renderRiskChips(): HTMLElement {
    const row = el("div", { display: "flex", "flex-wrap": "wrap", gap: "4px" });
    for (const item of RISK_ITEMS) {
      const active = riskSurfaces.has(item.value);
      const chip = el("div", {
        padding: "2px 7px", "font-size": "11px", "border-radius": "3px",
        cursor: "pointer", "user-select": "none",
        border: active
          ? `1px solid ${V("synergy-accent", "#4fc3f7")}`
          : `1px solid ${V("synergy-border", "#444")}`,
        background: active
          ? V("synergy-accent-dim", "rgba(79,195,247,0.12)")
          : "transparent",
        color: active
          ? V("synergy-accent", "#4fc3f7")
          : V("synergy-text-secondary", "#999"),
        "font-weight": active ? "600" : "400",
      }, item.label);
      chip.addEventListener("click", () => {
        if (active) riskSurfaces.delete(item.value); else riskSurfaces.add(item.value);
        row.replaceWith(renderRiskChips());
        refreshPreview();
      });
      row.appendChild(chip);
    }
    return row;
  }

  // ── preview card ──
  function buildPreviewCard(): HTMLElement {
    const card = el("div", {
      display: "flex", "flex-direction": "column", gap: "4px", padding: "8px",
      "border-radius": "4px", background: V("synergy-card-bg", "#252525"),
      border: `1px solid ${V("synergy-border", "#333")}`,
      "font-size": "11px", "line-height": "1.45",
    });

    const route = computeRoute();

    function prow(label: string, ...children: (string | HTMLElement)[]): HTMLElement {
      const r = el("div", { display: "flex", "align-items": "baseline", gap: "4px", "flex-wrap": "wrap" });
      r.appendChild(el("span", {
        "font-weight": "600", color: V("synergy-text-secondary", "#999"),
        "font-size": "10px", "text-transform": "uppercase",
      }, label));
      for (const c of children) {
        if (typeof c === "string") r.appendChild(el("span", { "font-size": "11px", color: V("synergy-text-primary", "#d4d4d4") }, c));
        else r.appendChild(c);
      }
      return r;
    }

    function badge(text: string, color?: string): HTMLElement {
      return el("span", {
        display: "inline-block", padding: "1px 6px", "font-size": "10px",
        "font-weight": "600", "border-radius": "3px",
        background: color ? "rgba(255,255,255,0.06)" : V("synergy-accent-dim", "rgba(79,195,247,0.12))"),
        color: color || V("synergy-accent", "#4fc3f7"),
      }, text);
    }

    if (!route) {
      card.appendChild(el("span", { color: V("synergy-text-muted", "#666") }, "No route — fill the form above"));
      return card;
    }

    card.appendChild(prow("TIER", badge(route.tier)));
    card.appendChild(prow("TDD", badge(route.tddPolicy.mode, V("synergy-text-muted", "#888")),
      el("span", { color: V("synergy-text-muted", "#666"), "font-size": "10px" }, route.tddPolicy.description)));
    card.appendChild(prow("STAGES", route.stages.join(" → ")));
    if (route.subagentPlan.required.length > 0)
      card.appendChild(prow("AGENTS", route.subagentPlan.required.join(", ")));
    if (route.reviewPolicy.reviewers.length > 0)
      card.appendChild(prow("REVIEW", route.reviewPolicy.reviewers.join(", ")));
    card.appendChild(prow("LOOP", badge(route.loopPolicy, V("synergy-text-muted", "#888"))));

    return card;
  }

  function refreshPreview() {
    const newCard = buildPreviewCard();
    previewCard.replaceWith(newCard);
    previewCard = newCard;
    refreshCopyBtn();
  }

  function refreshCopyBtn() {
    const prompt = computePrompt();
    copyBtn.style.display = prompt ? "block" : "none";
  }

  // ── collapsible section ──
  function section(title: string, body: HTMLElement, defaultOpen = true): HTMLElement {
    const wrapper = el("div", { "min-width": "0", "max-width": "100%", "box-sizing": "border-box" });
    let open = defaultOpen;
    const header = el("div", {
      display: "flex", "align-items": "center", gap: "6px", padding: "6px 8px",
      cursor: "pointer", "border-radius": "4px",
      background: V("synergy-card-bg", "#252525"),
      border: `1px solid ${V("synergy-border", "#333")}`,
      "font-size": "12px", "font-weight": "600",
      color: V("synergy-text-primary", "#d4d4d4"),
    });
    const chev = el("span", {
      display: "inline-block", "font-size": "10px",
      color: V("synergy-text-muted", "#666"), "flex-shrink": "0",
    }, "▸");
    header.appendChild(chev);
    header.appendChild(el("span", {}, title));
    const contentDiv = el("div", {
      padding: "5px 0", display: "flex", "flex-direction": "column", gap: "5px",
      "min-width": "0", "max-width": "100%", "box-sizing": "border-box",
    });
    contentDiv.appendChild(body);
    const updateChev = () => {
      chev.style.transform = open ? "rotate(90deg)" : "rotate(0deg)";
      contentDiv.style.display = open ? "flex" : "none";
    };
    updateChev();
    header.addEventListener("click", () => { open = !open; updateChev(); });
    wrapper.appendChild(header);
    wrapper.appendChild(contentDiv);
    return wrapper;
  }

  // ── select field ──
  function selectField(
    label: string, options: { value: string; label: string }[],
    current: string, cb: (v: string) => void,
  ): HTMLElement {
    const div = el("div", { "min-width": "0", "max-width": "100%", "box-sizing": "border-box" });
    div.appendChild(el("div", {
      "font-size": "10px", "font-weight": "500", "margin-bottom": "2px",
      color: V("synergy-text-secondary", "#999"), "text-transform": "uppercase",
    }, label));
    div.appendChild(select({
      display: "block", width: "100%", "max-width": "100%", "box-sizing": "border-box",
      padding: "4px 5px", "font-size": "12px",
      border: `1px solid ${V("synergy-border", "#444")}`,
      "border-radius": "4px", background: V("synergy-input-bg", "#2a2a2a"),
      color: V("synergy-text-primary", "#e0e0e0"), outline: "none",
    }, options, current, cb));
    return div;
  }

  // ── textarea ──
  function textArea(placeholder: string, init: string, cb: (v: string) => void): HTMLTextAreaElement {
    const ta = document.createElement("textarea");
    setCss(ta, {
      display: "block", width: "100%", "max-width": "100%", "box-sizing": "border-box",
      "min-height": "52px", padding: "6px 8px", "font-size": "12px", "font-family": "inherit",
      border: `1px solid ${V("synergy-border", "#444")}`, "border-radius": "4px",
      background: V("synergy-input-bg", "#2a2a2a"),
      color: V("synergy-text-primary", "#e0e0e0"), resize: "vertical", outline: "none",
    });
    ta.placeholder = placeholder;
    ta.value = init;
    ta.addEventListener("input", () => cb(ta.value));
    return ta;
  }

  // ── button ──
  function button(label: string, cssExtra: Record<string, string> = {}): HTMLButtonElement {
    const btn = document.createElement("button");
    setCss(btn, {
      display: "block", width: "100%", "max-width": "100%", "box-sizing": "border-box",
      padding: "6px 0", "font-size": "12px", "font-weight": "500",
      border: `1px solid ${V("synergy-accent", "#4fc3f7")}`, "border-radius": "4px",
      background: V("synergy-accent-dim", "rgba(79,195,247,0.10)"),
      color: V("synergy-accent", "#4fc3f7"), cursor: "pointer", "text-align": "center",
      ...cssExtra,
    });
    btn.textContent = label;
    return btn;
  }

  // ── build the whole panel ──

  const root = el("div", {
    display: "flex", "flex-direction": "column", height: "100%",
    "font-size": "12px", color: V("synergy-text-primary", "#d4d4d4"),
    background: V("synergy-bg-primary", "#1e1e1e"),
    "font-family": V("synergy-font-family", "system-ui, sans-serif"),
    "box-sizing": "border-box", "min-width": "0", "max-width": "100%",
  });

  // header
  const header = el("div", {
    display: "flex", "align-items": "center", gap: "6px", padding: "8px 10px",
    "border-bottom": `1px solid ${V("synergy-border", "#333")}`,
    "font-size": "13px", "font-weight": "600",
    color: V("synergy-text-primary", "#e0e0e0"),
    background: V("synergy-bg-secondary", "#252525"),
  });
  header.textContent = "⚡ Workflow Router";
  root.appendChild(header);

  // scrollable body
  const body = el("div", {
    flex: "1", "overflow-y": "auto", "overflow-x": "hidden",
    padding: "8px 10px", display: "flex", "flex-direction": "column", gap: "5px",
    "min-width": "0", "max-width": "100%", "box-sizing": "border-box",
  });

  // Task
  const descTa = textArea('e.g., "add dark mode toggle"', description, (v) => {
    description = v; refreshPreview();
  });
  body.appendChild(section("Task", descTa));

  // Route
  const routeBody = el("div", { display: "flex", "flex-direction": "column", gap: "5px" });
  routeBody.appendChild(selectField("Urgency", URGENCY, urgency, (v) => { urgency = v as Urgency; refreshPreview(); }));
  routeBody.appendChild(selectField("Type", TASK_TYPE, taskType, (v) => { taskType = v as TaskType; refreshPreview(); }));
  routeBody.appendChild(selectField("Complexity", COMPLEXITY, complexity, (v) => { complexity = v as Complexity; refreshPreview(); }));
  routeBody.appendChild(selectField("Language", LANGUAGES, language, (v) => { language = v; refreshPreview(); }));
  body.appendChild(section("Route", routeBody));

  // Risk & Policy
  const riskBody = el("div", { display: "flex", "flex-direction": "column", gap: "5px" });
  riskBody.appendChild(el("div", {
    "font-size": "10px", "font-weight": "500", "margin-bottom": "2px",
    color: V("synergy-text-secondary", "#999"), "text-transform": "uppercase",
  }, "Risk Surfaces"));
  const riskRow = renderRiskChips();
  riskBody.appendChild(riskRow);
  riskBody.appendChild(selectField("Worktree", WORKTREE, worktree, (v) => { worktree = v as WorktreePolicy; }));
  riskBody.appendChild(selectField("Codex", CODEX, codex, (v) => { codex = v as CodexPolicy; }));
  body.appendChild(section("Risk & Policy", riskBody));

  // Preview
  previewCard = buildPreviewCard();
  body.appendChild(section("Preview", previewCard));

  // Copy button
  copyBtn = button("📋 Copy Prompt");
  copyBtn.style.display = "none";
  copyBtn.addEventListener("click", () => {
    const prompt = computePrompt();
    if (!prompt) return;
    showPrompt = true;
    promptSection.style.display = "block";
    if (promptPre) promptPre.textContent = prompt;
    try { navigator.clipboard.writeText(prompt); } catch { /* noop */ }
  });
  body.appendChild(copyBtn);

  // Prompt section (hidden)
  promptSection = el("div", { display: "none" });
  promptPre = document.createElement("pre");
  setCss(promptPre, {
    padding: "8px", "font-size": "11px", "font-family": V("synergy-mono-font", "monospace"),
    background: V("synergy-code-bg", "#0d0d0d"),
    border: `1px solid ${V("synergy-border", "#444")}`, "border-radius": "4px",
    color: V("synergy-text-primary", "#e0e0e0"),
    "white-space": "pre-wrap", "word-break": "break-word",
    "max-height": "240px", "overflow-y": "auto", "overflow-x": "hidden",
    "line-height": "1.4", margin: "0", "max-width": "100%", "box-sizing": "border-box",
  });
  promptSection.appendChild(section("Prompt", promptPre, true));
  body.appendChild(promptSection);

  root.appendChild(body);

  // initial refresh
  refreshPreview();

  return root;
}

// ── SettingsPanel ──

export function SettingsPanel(_props: PluginSettingsProps): HTMLElement {
  const root = el("div", {
    display: "flex", "flex-direction": "column", height: "100%",
    "font-size": "12px", color: V("synergy-text-primary", "#d4d4d4"),
    background: V("synergy-bg-primary", "#1e1e1e"),
    "font-family": V("synergy-font-family", "system-ui, sans-serif"),
  });
  root.appendChild(el("div", {
    padding: "8px 10px", "font-weight": "600",
    "border-bottom": `1px solid ${V("synergy-border", "#333")}`,
  }, "Settings"));

  const body = el("div", { padding: "10px", display: "flex", "flex-direction": "column", gap: "6px" });

  const card = el("div", {
    padding: "8px", "border-radius": "4px",
    background: V("synergy-card-bg", "#252525"),
    border: `1px solid ${V("synergy-border", "#333")}`,
  });
  const table = el("table", { width: "100%", "font-size": "12px" });
  const tbody = document.createElement("tbody");
  const rows: [string, string][] = [
    ["Codex", DEFAULTS.codex], ["Worktree", DEFAULTS.worktree],
    ["TDD", "full_red_green"], ["Auto-Review", "Yes"],
    ["Max Subagents", "4"],
  ];
  for (const [k, v] of rows) {
    const tr = document.createElement("tr");
    tr.appendChild(el("td", {
      padding: "4px 6px", "font-weight": "600",
      "border-bottom": `1px solid ${V("synergy-border", "#333")}`,
    }, k));
    tr.appendChild(el("td", {
      padding: "4px 6px",
      "border-bottom": `1px solid ${V("synergy-border", "#333")}`,
    }, v));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  card.appendChild(table);
  body.appendChild(card);

  body.appendChild(el("div", {
    padding: "6px 8px", "font-size": "11px",
    background: V("synergy-notice-bg", "rgba(255,193,7,0.10)"),
    border: `1px solid ${V("synergy-notice-border", "rgba(255,193,7,0.25)")}`,
    "border-radius": "4px", color: V("synergy-notice-text", "#e2b714"),
  }, "MVP — editable persistence coming later."));

  root.appendChild(body);
  return root;
}
