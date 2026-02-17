import { useState, useCallback, useMemo, useEffect } from "react";

const generateId = () => Math.random().toString(36).slice(2, 10);

const SECTIONS = [
  { id: "overview", label: "Overview", icon: "◉" },
  { id: "problem", label: "Problem & Purpose", icon: "◎" },
  { id: "context", label: "User Context", icon: "◈" },
  { id: "assumptions", label: "Assumptions", icon: "◇" },
  { id: "edges", label: "Edge Cases", icon: "◆" },
  { id: "scope", label: "Scope & Versions", icon: "◫" },
  { id: "questions", label: "Open Questions", icon: "◻" },
  { id: "notes", label: "Notes", icon: "◐" },
  { id: "summary", label: "Summary", icon: "◼" },
];

const ORIGIN_OPTIONS = [
  "User Research", "Business Metric", "Competitor Analysis",
  "Stakeholder Request", "Technical Debt", "Other",
];

const VERSION_PHASES = ["MVP", "V1", "V2", "V3", "Future", "Cut"];
const VERSION_COLORS = {
  MVP: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  V1: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  V2: { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-500" },
  V3: { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500" },
  Future: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400" },
  Cut: { bg: "bg-red-50", text: "text-red-500", border: "border-red-200", dot: "bg-red-400" },
};
const PRIORITY_LEVELS = ["Must", "Should", "Could", "Won't"];

const ASSUMPTION_STATUSES = ["Unvalidated", "Needs Research", "Validated", "Disproven"];
const QUESTION_TYPES = ["Stakeholder", "User Research", "Developer", "Designer", "Business Analyst"];
const QUESTION_STATUSES = ["Open", "Answered"];
const CONFIDENCE_LEVELS = ["Low", "Medium", "High"];

const EDGE_CASE_ITEMS = [
  { id: "empty", label: "Empty state", hint: "What does the user see when there's no data?" },
  { id: "error", label: "Error state", hint: "What happens when something fails?" },
  { id: "loading", label: "Loading state", hint: "What's shown during data fetch or processing?" },
  { id: "firstTime", label: "First-time experience", hint: "How does a new user encounter this?" },
  { id: "returning", label: "Returning user", hint: "Does behavior change for repeat use?" },
  { id: "permissions", label: "Permission / access variations", hint: "Different roles, restricted access?" },
  { id: "offline", label: "Offline / connectivity", hint: "What if the connection drops?" },
  { id: "dataLimits", label: "Data extremes", hint: "Too much data? Too little? Unexpected formats?" },
  { id: "mobile", label: "Responsive / mobile", hint: "Does this need to work across breakpoints?" },
  { id: "accessibility", label: "Accessibility", hint: "Keyboard nav, screen readers, contrast?" },
];

const createBlankAnalysis = (name = "Untitled Analysis") => ({
  id: generateId(),
  name,
  phase: "",
  gistId: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  overview: { featureName: "", date: "", requestor: "", description: "", origin: "" },
  problem: { problem: "", who: "", outcome: "", metrics: "", ifNotBuilt: "" },
  context: { segments: "", workflow: "", workarounds: "", triggers: "", beforeAfter: "" },
  assumptions: [],
  edges: EDGE_CASE_ITEMS.reduce((acc, item) => {
    acc[item.id] = { considered: false, notes: "" };
    return acc;
  }, {}),
  scope: {
    affected: "",
    newPatterns: "",
    technical: "",
    items: [],
  },
  questions: [],
  notes: "",
  summary: { confidence: "", concerns: "", nextSteps: "" },
});

// Migrate old analysis data to current structure
const migrateAnalysis = (analysis) => {
  const blank = createBlankAnalysis();
  return {
    ...blank,
    ...analysis,
    notes: analysis.notes ?? "",
    gistId: analysis.gistId ?? "",
  };
};

// GitHub Gist API functions
const saveToGist = async (analysis, token) => {
  const headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
  
  const gistData = {
    description: `Requirement Analysis: ${analysis.name}`,
    public: false,
    files: {
      "analysis.json": {
        content: JSON.stringify(analysis, null, 2)
      }
    }
  };

  try {
    if (analysis.gistId) {
      // Update existing gist
      const response = await fetch(`https://api.github.com/gists/${analysis.gistId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(gistData)
      });
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
      return await response.json();
    } else {
      // Create new gist
      const response = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers,
        body: JSON.stringify(gistData)
      });
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
      return await response.json();
    }
  } catch (error) {
    console.error("Failed to save gist:", error);
    throw error;
  }
};

const loadFromGist = async (gistId, token) => {
  const headers = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    const gist = await response.json();
    const file = gist.files["analysis.json"];
    if (!file) throw new Error("No analysis.json found in gist");
    return JSON.parse(file.content);
  } catch (error) {
    console.error("Failed to load gist:", error);
    throw error;
  }
};

function getCompletion(analysis) {
  let filled = 0, total = 0;
  const check = (val) => { total++; if (val && String(val).trim()) filled++; };
  Object.values(analysis.overview).forEach(check);
  check(analysis.phase);
  Object.values(analysis.problem).forEach(check);
  Object.values(analysis.context).forEach(check);
  total++; if (analysis.assumptions.length > 0) filled++;
  total++; if (Object.values(analysis.edges).filter((e) => e.considered).length > 0) filled++;
  check(analysis.scope.affected); check(analysis.scope.newPatterns); check(analysis.scope.technical);
  total++; if (analysis.scope.items.length > 0) filled++;
  total++; if (analysis.questions.length > 0) filled++;
  Object.values(analysis.summary).forEach(check);
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

function getSectionCompletion(analysis, sectionId) {
  let filled = 0, total = 0;
  const check = (val) => { total++; if (val && String(val).trim()) filled++; };
  switch (sectionId) {
    case "overview":
      Object.values(analysis.overview).forEach(check);
      check(analysis.phase);
      break;
    case "problem": Object.values(analysis.problem).forEach(check); break;
    case "context": Object.values(analysis.context).forEach(check); break;
    case "assumptions": total = 1; if (analysis.assumptions.length > 0) filled = 1; break;
    case "edges":
      total = EDGE_CASE_ITEMS.length;
      filled = Object.values(analysis.edges).filter((e) => e.considered).length;
      break;
    case "scope":
      check(analysis.scope.affected); check(analysis.scope.newPatterns); check(analysis.scope.technical);
      total++; if (analysis.scope.items.length > 0) filled++;
      break;
    case "questions": total = 1; if (analysis.questions.length > 0) filled = 1; break;
    case "notes": check(analysis.notes); break;
    case "summary": Object.values(analysis.summary).forEach(check); break;
  }
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

function exportToMarkdown(a) {
  const lines = [];
  const h = (t) => lines.push(`\n## ${t}`);
  const f = (label, val) => { if (val?.trim()) lines.push(`**${label}:** ${val}`); };
  lines.push(`# ${a.name || "Untitled Analysis"}`);
  lines.push(`*Created: ${new Date(a.createdAt).toLocaleDateString()}*`);
  if (a.phase) lines.push(`*Target Phase: ${a.phase}*`);

  h("Overview");
  f("Feature", a.overview.featureName); f("Date", a.overview.date);
  f("Stakeholders", a.overview.requestor); f("Origin", a.overview.origin);
  if (a.overview.description) lines.push(`\n${a.overview.description}`);

  h("Problem & Purpose");
  f("Problem", a.problem.problem); f("Who", a.problem.who);
  f("Business Outcome", a.problem.outcome); f("Success Metrics", a.problem.metrics);
  f("If Not Built", a.problem.ifNotBuilt);

  h("User Context");
  f("Target Segments", a.context.segments); f("Current Workflow", a.context.workflow);
  f("Workarounds", a.context.workarounds); f("Triggers", a.context.triggers);
  f("Before/After", a.context.beforeAfter);

  h("Assumptions");
  if (a.assumptions.length === 0) lines.push("*No assumptions logged yet.*");
  a.assumptions.forEach((item, i) => lines.push(`${i + 1}. [${item.status}] ${item.text}`));

  h("Edge Cases");
  EDGE_CASE_ITEMS.forEach((ec) => {
    const d = a.edges[ec.id];
    if (d?.considered) lines.push(`- [x] **${ec.label}**${d.notes ? `: ${d.notes}` : ""}`);
    else lines.push(`- [ ] ${ec.label}`);
  });

  h("Scope & Versions");
  f("Affected Features", a.scope.affected); f("New Patterns Needed", a.scope.newPatterns);
  f("Technical Constraints", a.scope.technical);
  if (a.scope.items.length > 0) {
    lines.push("\n### Scope Items by Version");
    const byVersion = {};
    a.scope.items.forEach((item) => {
      const v = item.version || "Unassigned";
      if (!byVersion[v]) byVersion[v] = [];
      byVersion[v].push(item);
    });
    Object.entries(byVersion).forEach(([version, items]) => {
      lines.push(`\n**${version}**`);
      items.forEach((item) => {
        const priority = item.priority ? ` [${item.priority}]` : "";
        lines.push(`- ${item.item}${priority}${item.description ? ` — ${item.description}` : ""}`);
      });
    });
  }

  h("Open Questions");
  if (a.questions.length === 0) lines.push("*No questions logged yet.*");
  a.questions.forEach((q, i) => {
    const status = q.status === "Answered" ? "✓" : "?";
    lines.push(`${i + 1}. [${status}] (${q.type}) ${q.text}`);
    if (q.answer?.trim()) lines.push(`   → ${q.answer}`);
  });

  h("Notes");
  if (a.notes?.trim()) lines.push(a.notes);
  else lines.push("*No notes.*");

  h("Summary");
  f("Confidence", a.summary.confidence); f("Key Concerns", a.summary.concerns);
  f("Next Steps", a.summary.nextSteps);
  return lines.join("\n");
}

// --- UI Components ---

const Field = ({ label, hint, value, onChange, multiline = false, rows = 3 }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
    {multiline ? (
      <textarea
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 resize-y bg-white"
        rows={rows} value={value || ""} onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        type="text"
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 bg-white"
        value={value || ""} onChange={(e) => onChange(e.target.value)}
      />
    )}
  </div>
);

const Select = ({ label, hint, value, options, onChange, allowEmpty = true }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
    <select
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 bg-white"
      value={value || ""} onChange={(e) => onChange(e.target.value)}
    >
      {allowEmpty && <option value="">Select...</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const VersionBadge = ({ version, size = "sm" }) => {
  if (!version) return null;
  const colors = VERSION_COLORS[version] || VERSION_COLORS.Future;
  const sizeClass = size === "xs" ? "text-xs px-1.5 py-0" : "text-xs px-2 py-0.5";
  return (
    <span className={`${sizeClass} rounded-full font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
      {version}
    </span>
  );
};

const Pill = ({ active, onClick, children, completion, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
      active ? "bg-slate-800 text-white font-medium" : "text-slate-600 hover:bg-slate-100"
    }`}
  >
    <span>{children}</span>
    {count !== undefined ? (
      count && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          active ? "bg-slate-600 text-slate-200" : "bg-slate-100 text-slate-500"
        }`}>
          {count}
        </span>
      )
    ) : (
      completion > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          active ? "bg-slate-600 text-slate-200" : completion === 100 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}>
          {completion}%
        </span>
      )
    )}
  </button>
);

const SectionHeader = ({ title, description }) => (
  <div className="mb-6 pb-4 border-b border-slate-100">
    <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
    {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
  </div>
);

// --- Section Components ---

const OverviewSection = ({ data, phase, onChange, onPhaseChange }) => (
  <div>
    <SectionHeader title="Overview" description="Basic information about the feature requirement." />
    <div className="grid grid-cols-2 gap-4">
      <Field label="Feature Name" value={data.featureName} onChange={(v) => onChange({ ...data, featureName: v })} />
      <Field label="Date" value={data.date} onChange={(v) => onChange({ ...data, date: v })} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Field label="Stakeholders / Source" value={data.requestor} onChange={(v) => onChange({ ...data, requestor: v })} />
      <Select label="Requirement Origin" value={data.origin} options={ORIGIN_OPTIONS} onChange={(v) => onChange({ ...data, origin: v })} />
    </div>
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">Target Version</label>
      <p className="text-xs text-slate-400 mb-2">Which release phase is this analysis targeting?</p>
      <div className="flex gap-2 flex-wrap">
        {VERSION_PHASES.filter((v) => v !== "Cut").map((v) => {
          const colors = VERSION_COLORS[v];
          const isActive = phase === v;
          return (
            <button
              key={v}
              onClick={() => onPhaseChange(isActive ? "" : v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                isActive
                  ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-1 ring-slate-300`
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
    <Field label="Brief Description" hint="What is this feature in one or two sentences?" multiline value={data.description} onChange={(v) => onChange({ ...data, description: v })} />
  </div>
);

const ProblemSection = ({ data, onChange }) => (
  <div>
    <SectionHeader title="Problem & Purpose" description="Understand the why before the what." />
    <Field label="What problem does this solve?" multiline hint="Be specific. Vague problems lead to vague solutions." value={data.problem} onChange={(v) => onChange({ ...data, problem: v })} />
    <Field label="Who experiences this problem?" multiline hint="Which users, how often, and in what circumstances?" value={data.who} onChange={(v) => onChange({ ...data, who: v })} />
    <Field label="What's the desired business outcome?" multiline value={data.outcome} onChange={(v) => onChange({ ...data, outcome: v })} />
    <Field label="How will we measure success?" multiline hint="If stakeholders can't define this, the requirement isn't ready." value={data.metrics} onChange={(v) => onChange({ ...data, metrics: v })} />
    <Field label="What happens if we don't build this?" multiline hint="Helps gauge urgency and priority." value={data.ifNotBuilt} onChange={(v) => onChange({ ...data, ifNotBuilt: v })} />
  </div>
);

const UserContextSection = ({ data, onChange }) => (
  <div>
    <SectionHeader title="User Context" description="Map the who, when, and current reality." />
    <Field label="Target user segment(s)" multiline value={data.segments} onChange={(v) => onChange({ ...data, segments: v })} />
    <Field label="Current workflow" multiline hint="What does the user do today without this feature?" value={data.workflow} onChange={(v) => onChange({ ...data, workflow: v })} />
    <Field label="Existing workarounds" multiline hint="If there's no workaround, question whether the problem is real. If there is, study it — your solution must beat it." value={data.workarounds} onChange={(v) => onChange({ ...data, workarounds: v })} />
    <Field label="What triggers the need?" multiline hint="What moment or event causes the user to want this?" value={data.triggers} onChange={(v) => onChange({ ...data, triggers: v })} />
    <Field label="What happens before and after?" multiline hint="The surrounding flow shapes constraints on your design." value={data.beforeAfter} onChange={(v) => onChange({ ...data, beforeAfter: v })} />
  </div>
);

const AssumptionsSection = ({ data, onChange }) => {
  const [statusFilter, setStatusFilter] = useState("Open");
  const addItem = () => onChange([...data, { id: generateId(), text: "", status: "Unvalidated", tags: [] }]);
  const updateItem = (id, field, val) =>
    onChange(data.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  const removeItem = (id) => onChange(data.filter((item) => item.id !== id));

  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const textareaRef = (el) => {
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  };

  // Filter by status: Open = Unvalidated/Needs Research, Answered = Validated/Disproven
  const filteredData = statusFilter === "Open" 
    ? data.filter(item => item.status === "Unvalidated" || item.status === "Needs Research")
    : data.filter(item => item.status === "Validated" || item.status === "Disproven");

  return (
    <div>
      <SectionHeader title="Assumptions" description="Every requirement carries hidden assumptions. Name them so you can validate or flag them." />
      {data.length > 0 && (
        <div className="flex items-center justify-end mb-4">
          <div className="flex gap-1">
            <button
              onClick={() => setStatusFilter("Open")}
              className={`px-2 py-1 text-xs rounded ${
                statusFilter === "Open" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter("Answered")}
              className={`px-2 py-1 text-xs rounded ${
                statusFilter === "Answered" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Answered
            </button>
          </div>
        </div>
      )}
      {data.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg mb-4">
          No assumptions logged yet. Start adding them below.
        </div>
      )}
      <div className="space-y-3 mb-4">
        {filteredData.map((item, i) => (
          <div key={item.id} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-400 mt-2.5 font-mono w-5 shrink-0">{i + 1}</span>
            <div className="flex-1 space-y-2">
              <textarea
                ref={textareaRef}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-300 resize-none overflow-hidden"
                style={{ minHeight: "36px" }}
                placeholder="Describe the assumption..."
                value={item.text}
                onChange={(e) => {
                  updateItem(item.id, "text", e.target.value);
                  autoResize(e);
                }}
                onInput={autoResize}
                rows={1}
              />
              <div className="flex gap-2 flex-wrap items-center">
                <select
                  className="px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                  value={item.status} onChange={(e) => updateItem(item.id, "status", e.target.value)}
                >
                  {ASSUMPTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(item.tags || []).includes("B2B")}
                    onChange={(e) => {
                      const tags = item.tags || [];
                      updateItem(item.id, "tags", e.target.checked ? [...tags.filter(t => t !== "B2B"), "B2B"] : tags.filter(t => t !== "B2B"));
                    }}
                    className="rounded border-slate-300 text-slate-600 focus:ring-slate-300"
                  />
                  B2B
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(item.tags || []).includes("B2C")}
                    onChange={(e) => {
                      const tags = item.tags || [];
                      updateItem(item.id, "tags", e.target.checked ? [...tags.filter(t => t !== "B2C"), "B2C"] : tags.filter(t => t !== "B2C"));
                    }}
                    className="rounded border-slate-300 text-slate-600 focus:ring-slate-300"
                  />
                  B2C
                </label>
              </div>
            </div>
            <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-400 text-lg mt-1.5 px-1">×</button>
          </div>
        ))}
      </div>
      <button onClick={addItem} className="text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-lg px-4 py-2 hover:border-slate-400 transition-colors">
        + Add assumption
      </button>
    </div>
  );
};

const EdgeCasesSection = ({ data, onChange }) => {
  const toggle = (id) => onChange({ ...data, [id]: { ...data[id], considered: !data[id].considered } });
  const setNotes = (id, notes) => onChange({ ...data, [id]: { ...data[id], notes } });
  const consideredCount = Object.values(data).filter((e) => e.considered).length;

  return (
    <div>
      <SectionHeader title="Edge Cases & States" description="Requirements almost never cover these. They're where most design complexity lives." />
      <p className="text-xs text-slate-500 mb-4">{consideredCount} of {EDGE_CASE_ITEMS.length} considered</p>
      <div className="space-y-2">
        {EDGE_CASE_ITEMS.map((ec) => {
          const d = data[ec.id] || { considered: false, notes: "" };
          return (
            <div key={ec.id} className={`border rounded-lg transition-colors ${d.considered ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-white"}`}>
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => toggle(ec.id)}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  d.considered ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                }`}>
                  {d.considered && <span className="text-white text-xs">✓</span>}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700">{ec.label}</span>
                  <span className="text-xs text-slate-400 ml-2">{ec.hint}</span>
                </div>
              </div>
              {d.considered && (
                <div className="px-4 pb-3 pl-12">
                  <textarea
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-300 resize-y"
                    rows={2} placeholder="Notes on how you'll handle this..."
                    value={d.notes} onChange={(e) => setNotes(ec.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ScopeSection = ({ data, onChange }) => {
  const items = data.items || [];
  const setField = (field, val) => onChange({ ...data, [field]: val });
  const setItems = (newItems) => onChange({ ...data, items: newItems });

  const addItem = () =>
    setItems([...items, { id: generateId(), item: "", description: "", version: "MVP", priority: "Must" }]);
  const updateItem = (id, field, val) =>
    setItems(items.map((it) => (it.id === id ? { ...it, [field]: val } : it)));
  const removeItem = (id) => setItems(items.filter((it) => it.id !== id));

  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const textareaRef = (el) => {
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  };

  // Group items by version for the summary view
  const byVersion = useMemo(() => {
    const grouped = {};
    VERSION_PHASES.forEach((v) => { grouped[v] = []; });
    grouped["Unassigned"] = [];
    items.forEach((it) => {
      const v = it.version || "Unassigned";
      if (!grouped[v]) grouped[v] = [];
      grouped[v].push(it);
    });
    return grouped;
  }, [items]);

  const [viewMode, setViewMode] = useState("list"); // "list" or "versions"

  return (
    <div>
      <SectionHeader title="Scope & Versions" description="Break the feature into scope items and assign each to a release version." />

      {/* Dependencies */}
      <Field label="Affected existing features" multiline hint="What current functionality does this change or interact with?" value={data.affected} onChange={(v) => setField("affected", v)} />
      <Field label="New components or patterns needed" multiline hint="Can you reuse existing patterns, or does this require new ones?" value={data.newPatterns} onChange={(v) => setField("newPatterns", v)} />
      <Field label="Technical dependencies or constraints" multiline value={data.technical} onChange={(v) => setField("technical", v)} />

      {/* Scope items */}
      <div className="border-t border-slate-100 pt-5 mt-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Scope Items</p>
            <p className="text-xs text-slate-400 mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""} across {Object.values(byVersion).filter((arr) => arr.length > 0).length} version{Object.values(byVersion).filter((arr) => arr.length > 0).length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === "list" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500"}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("versions")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === "versions" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500"}`}
            >
              By Version
            </button>
          </div>
        </div>

        {items.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg mb-4">
            No scope items yet. Add items and assign them to versions.
          </div>
        )}

        {/* List view */}
        {viewMode === "list" && items.length > 0 && (
          <div className="space-y-2 mb-4">
            {items.map((item, i) => {
              const colors = VERSION_COLORS[item.version] || VERSION_COLORS.Future;
              return (
                <div key={item.id} className={`p-3 rounded-lg border ${colors.border} bg-white`}>
                  <div className="flex gap-2 items-start">
                    <div className={`w-1 self-stretch rounded-full shrink-0 ${colors.dot}`} />
                    <div className="flex-1 space-y-2">
                      <textarea
                        ref={textareaRef}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-300 font-medium resize-none overflow-hidden"
                        style={{ minHeight: "36px" }}
                        placeholder="Scope item name..."
                        value={item.item}
                        onChange={(e) => {
                          updateItem(item.id, "item", e.target.value);
                          autoResize(e);
                        }}
                        onInput={autoResize}
                        rows={1}
                      />
                      <textarea
                        ref={textareaRef}
                        className="w-full px-2 py-1.5 text-xs border border-slate-100 rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 resize-none overflow-hidden"
                        style={{ minHeight: "32px" }}
                        placeholder="Brief description (optional)..."
                        value={item.description}
                        onChange={(e) => {
                          updateItem(item.id, "description", e.target.value);
                          autoResize(e);
                        }}
                        onInput={autoResize}
                        rows={1}
                      />
                      <div className="flex gap-2 flex-wrap items-center">
                        <select
                          className={`px-2 py-1 text-xs rounded-full font-medium border ${colors.bg} ${colors.text} ${colors.border} focus:outline-none`}
                          value={item.version} onChange={(e) => updateItem(item.id, "version", e.target.value)}
                        >
                          {VERSION_PHASES.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <select
                          className="px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none"
                          value={item.priority} onChange={(e) => updateItem(item.id, "priority", e.target.value)}
                        >
                          {PRIORITY_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-400 text-lg mt-1 px-1">×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Version grouped view */}
        {viewMode === "versions" && items.length > 0 && (
          <div className="space-y-4 mb-4">
            {VERSION_PHASES.map((version) => {
              const versionItems = byVersion[version] || [];
              if (versionItems.length === 0) return null;
              const colors = VERSION_COLORS[version];
              return (
                <div key={version} className={`rounded-lg border ${colors.border} overflow-hidden`}>
                  <div className={`px-4 py-2 ${colors.bg} flex items-center justify-between`}>
                    <span className={`text-sm font-semibold ${colors.text}`}>{version}</span>
                    <span className={`text-xs ${colors.text} opacity-70`}>{versionItems.length} item{versionItems.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {versionItems.map((item) => (
                      <div key={item.id} className="px-4 py-2.5 flex items-center gap-3 bg-white">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${
                          item.priority === "Must" ? "bg-red-50 text-red-600 border-red-200" :
                          item.priority === "Should" ? "bg-amber-50 text-amber-600 border-amber-200" :
                          item.priority === "Could" ? "bg-blue-50 text-blue-600 border-blue-200" :
                          "bg-slate-50 text-slate-500 border-slate-200"
                        }`}>
                          {item.priority}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{item.item || "Unnamed item"}</p>
                          {item.description && <p className="text-xs text-slate-400 truncate">{item.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={addItem} className="text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-lg px-4 py-2 hover:border-slate-400 transition-colors">
          + Add scope item
        </button>

        {/* Version summary bar */}
        {items.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Version distribution</p>
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
              {VERSION_PHASES.map((v) => {
                const count = (byVersion[v] || []).length;
                if (count === 0) return null;
                const pct = (count / items.length) * 100;
                return (
                  <div
                    key={v}
                    className={`${VERSION_COLORS[v].dot} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${v}: ${count} item${count !== 1 ? "s" : ""}`}
                  />
                );
              })}
            </div>
            <div className="flex gap-3 mt-2 flex-wrap">
              {VERSION_PHASES.map((v) => {
                const count = (byVersion[v] || []).length;
                if (count === 0) return null;
                return (
                  <span key={v} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className={`w-2 h-2 rounded-full ${VERSION_COLORS[v].dot}`} />
                    {v}: {count}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const QuestionsSection = ({ data, onChange }) => {
  const [statusFilter, setStatusFilter] = useState("Open");
  const addItem = () =>
    onChange([...data, { id: generateId(), text: "", type: "Stakeholder", status: "Open", answer: "", dependency: false, tags: [] }]);
  const updateItem = (id, field, val) =>
    onChange(data.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  const removeItem = (id) => onChange(data.filter((item) => item.id !== id));
  const openCount = data.filter((q) => q.status === "Open").length;

  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const textareaRef = (el) => {
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  };

  // Filter by status first
  const filteredData = data.filter(item => item.status === statusFilter);
  
  // Group questions: non-dependencies first, then by type for dependencies
  // Keep questions in main section if dependency is checked but no valid type selected yet
  const nonDependencies = filteredData.filter(item => !item.dependency || (item.dependency && !QUESTION_TYPES.includes(item.type)));
  const dependencies = filteredData.filter(item => item.dependency && QUESTION_TYPES.includes(item.type));
  const groupedDependencies = QUESTION_TYPES.reduce((acc, type) => {
    acc[type] = dependencies.filter(item => item.type === type);
    return acc;
  }, {});

  const renderQuestion = (item, index, showNumber = true) => (
    <div key={item.id} className={`p-3 rounded-lg border ${item.status === "Answered" ? "bg-slate-50 border-slate-100" : "bg-amber-50/30 border-amber-200/60"}`}>
      <div className="flex gap-2 items-start">
        {showNumber && <span className="text-xs text-slate-400 mt-2 font-mono w-5 shrink-0">{index + 1}</span>}
        <div className="flex-1 space-y-2">
          <textarea
            ref={textareaRef}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-300 resize-none overflow-hidden"
            style={{ minHeight: "36px" }}
            placeholder="What do you need to find out?"
            value={item.text}
            onChange={(e) => {
              updateItem(item.id, "text", e.target.value);
              autoResize(e);
            }}
            onInput={autoResize}
            rows={1}
          />
          <div className="flex gap-2 flex-wrap items-center">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={item.dependency || false}
                onChange={(e) => updateItem(item.id, "dependency", e.target.checked)}
                className="rounded border-slate-300 text-slate-600 focus:ring-slate-300"
              />
              Dependency
            </label>
            {item.dependency && (
              <select
                className="px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                value={QUESTION_TYPES.includes(item.type) ? item.type : ""}
                onChange={(e) => updateItem(item.id, "type", e.target.value)}
              >
                {!QUESTION_TYPES.includes(item.type) && <option value="">Select type...</option>}
                {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <select
              className="px-2 py-1 text-xs border border-slate-200 rounded bg-white"
              value={item.status} onChange={(e) => updateItem(item.id, "status", e.target.value)}
            >
              {QUESTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={(item.tags || []).includes("B2B")}
                onChange={(e) => {
                  const tags = item.tags || [];
                  updateItem(item.id, "tags", e.target.checked ? [...tags.filter(t => t !== "B2B"), "B2B"] : tags.filter(t => t !== "B2B"));
                }}
                className="rounded border-slate-300 text-slate-600 focus:ring-slate-300"
              />
              B2B
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={(item.tags || []).includes("B2C")}
                onChange={(e) => {
                  const tags = item.tags || [];
                  updateItem(item.id, "tags", e.target.checked ? [...tags.filter(t => t !== "B2C"), "B2C"] : tags.filter(t => t !== "B2C"));
                }}
                className="rounded border-slate-300 text-slate-600 focus:ring-slate-300"
              />
              B2C
            </label>
          </div>
          {item.status === "Answered" && (
            <textarea
              ref={textareaRef}
              className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded bg-emerald-50 focus:outline-none focus:ring-1 focus:ring-emerald-300 resize-none overflow-hidden"
              style={{ minHeight: "36px" }}
              placeholder="Answer..."
              value={item.answer}
              onChange={(e) => {
                updateItem(item.id, "answer", e.target.value);
                autoResize(e);
              }}
              onInput={autoResize}
              rows={1}
            />
          )}
        </div>
        <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-400 text-lg mt-1 px-1">×</button>
      </div>
    </div>
  );

  return (
    <div>
      <SectionHeader title="Open Questions" description="What you don't know. Surface these early — they're your blocker list." />
      {data.length > 0 && (
        <div className="flex items-center justify-end mb-4">
          <div className="flex gap-1">
            <button
              onClick={() => setStatusFilter("Open")}
              className={`px-2 py-1 text-xs rounded ${
                statusFilter === "Open" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter("Answered")}
              className={`px-2 py-1 text-xs rounded ${
                statusFilter === "Answered" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Answered
            </button>
          </div>
        </div>
      )}
      {data.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg mb-4">
          No questions logged yet.
        </div>
      )}
      <div className="space-y-4 mb-4">
        {nonDependencies.length > 0 && (
          <div className="space-y-3">
            {nonDependencies.map((item, i) => renderQuestion(item, i))}
          </div>
        )}
        {QUESTION_TYPES.map(type => {
          const items = groupedDependencies[type];
          if (!items || items.length === 0) return null;
          return (
            <div key={type} className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-6">{type}</h3>
              {items.map((item) => renderQuestion(item, 0, false))}
            </div>
          );
        })}
      </div>
      <button onClick={addItem} className="text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-lg px-4 py-2 hover:border-slate-400 transition-colors">
        + Add question
      </button>
    </div>
  );
};

const NotesSection = ({ data, onChange }) => (
  <div>
    <SectionHeader title="Notes" description="Additional notes, observations, or reminders about this requirement." />
    <Field label="Notes" multiline hint="Use this space for any additional information that doesn't fit elsewhere." rows={10} value={data} onChange={onChange} />
  </div>
);

const SummarySection = ({ data, onChange }) => (
  <div>
    <SectionHeader title="Summary & Next Steps" description="Your overall assessment and what needs to happen next." />
    <Select label="Overall Confidence" hint="How ready is this requirement for design?" value={data.confidence} options={CONFIDENCE_LEVELS} onChange={(v) => onChange({ ...data, confidence: v })} />
    <Field label="Key Concerns" multiline hint="What worries you most about this requirement?" value={data.concerns} onChange={(v) => onChange({ ...data, concerns: v })} />
    <Field label="Recommended Next Steps" multiline hint="What actions should happen before design work begins?" rows={4} value={data.nextSteps} onChange={(v) => onChange({ ...data, nextSteps: v })} />
  </div>
);

// --- Main App ---

export default function RequirementAnalyzer() {
  const [analyses, setAnalyses] = useState(() => {
    const saved = localStorage.getItem("requirementAnalyses");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migrated = Array.isArray(parsed) ? parsed.map(migrateAnalysis) : [];
        return migrated.length > 0 ? migrated : [createBlankAnalysis("Sample: Dark Mode Toggle")];
      } catch {
        return [createBlankAnalysis("Sample: Dark Mode Toggle")];
      }
    }
    return [createBlankAnalysis("Sample: Dark Mode Toggle")];
  });
  const [activeId, setActiveId] = useState(() => analyses[0]?.id);
  const [activeSection, setActiveSection] = useState(() => {
    const saved = localStorage.getItem("activeSection");
    return saved || "overview";
  });
  const [showExport, setShowExport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [phaseFilter, setPhaseFilter] = useState("All");
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem("githubToken") || "");
  const [loadGistId, setLoadGistId] = useState("");
  const [gistLoading, setGistLoading] = useState(false);
  const [gistExpanded, setGistExpanded] = useState(false);

  // Load from URL share link on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get("data");
    if (sharedData) {
      try {
        const decoded = JSON.parse(atob(sharedData));
        const migrated = migrateAnalysis(decoded);
        setAnalyses([migrated]);
        setActiveId(migrated.id);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error("Failed to decode shared link:", err);
      }
    }
  }, []);

  // Save to localStorage whenever analyses change
  useEffect(() => {
    localStorage.setItem("requirementAnalyses", JSON.stringify(analyses));
  }, [analyses]);

  // Save active section to localStorage
  useEffect(() => {
    localStorage.setItem("activeSection", activeSection);
  }, [activeSection]);

  // Save GitHub token to localStorage
  useEffect(() => {
    if (githubToken) {
      localStorage.setItem("githubToken", githubToken);
    } else {
      localStorage.removeItem("githubToken");
    }
  }, [githubToken]);

  const active = useMemo(() => analyses.find((a) => a.id === activeId), [analyses, activeId]);

  const filteredAnalyses = useMemo(() => {
    if (phaseFilter === "All") return analyses;
    if (phaseFilter === "Untagged") return analyses.filter((a) => !a.phase);
    return analyses.filter((a) => a.phase === phaseFilter);
  }, [analyses, phaseFilter]);

  const updateActive = useCallback(
    (sectionKey, value) => {
      setAnalyses((prev) =>
        prev.map((a) =>
          a.id === activeId ? { ...a, [sectionKey]: value, updatedAt: new Date().toISOString() } : a
        )
      );
    },
    [activeId]
  );

  const updatePhase = useCallback(
    (phase) => {
      setAnalyses((prev) =>
        prev.map((a) =>
          a.id === activeId ? { ...a, phase, updatedAt: new Date().toISOString() } : a
        )
      );
    },
    [activeId]
  );

  const createNew = () => {
    const newA = createBlankAnalysis();
    setAnalyses((prev) => [newA, ...prev]);
    setActiveId(newA.id);
    setActiveSection("overview");
    setPhaseFilter("All");
  };

  const deleteAnalysis = (id) => {
    setAnalyses((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (next.length === 0) {
        const blank = createBlankAnalysis();
        setActiveId(blank.id);
        return [blank];
      }
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
  };

  const updateName = (name) => {
    setAnalyses((prev) => prev.map((a) => (a.id === activeId ? { ...a, name } : a)));
  };

  const handleExportMd = () => { if (active) setShowExport(true); };

  const handleExportJson = () => {
    if (!active) return;
    const encoded = btoa(JSON.stringify(active));
    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("Share link copied to clipboard! Anyone with this link can view this analysis.");
    }).catch(() => {
      // Fallback: download as JSON if clipboard fails
      const json = JSON.stringify(active, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = `${active.name.replace(/\s+/g, "-").toLowerCase()}.json`;
      a.click(); URL.revokeObjectURL(blobUrl);
    });
  };

  const handleSaveToGist = async () => {
    if (!active || !githubToken) {
      alert("Please enter your GitHub token first.");
      return;
    }
    
    setGistLoading(true);
    try {
      const gist = await saveToGist(active, githubToken);
      // Update analysis with gist ID
      setAnalyses(prev => prev.map(a => 
        a.id === activeId ? { ...a, gistId: gist.id } : a
      ));
      navigator.clipboard.writeText(gist.html_url);
      alert(`Saved to GitHub Gist!\n\nGist URL copied to clipboard:\n${gist.html_url}\n\nGist ID (for loading): ${gist.id}`);
    } catch (error) {
      alert(`Failed to save to GitHub Gist:\n${error.message}\n\nMake sure your token has 'gist' scope.`);
    } finally {
      setGistLoading(false);
    }
  };

  const handleLoadFromGist = async () => {
    if (!loadGistId.trim()) {
      alert("Please enter a Gist ID.");
      return;
    }
    
    setGistLoading(true);
    try {
      const data = await loadFromGist(loadGistId.trim(), githubToken);
      const migrated = migrateAnalysis(data);
      setAnalyses(prev => [...prev, migrated]);
      setActiveId(migrated.id);
      setLoadGistId("");
      alert(`Loaded analysis: ${migrated.name}`);
    } catch (error) {
      alert(`Failed to load from GitHub Gist:\n${error.message}\n\nMake sure the Gist ID is correct and the gist is accessible.`);
    } finally {
      setGistLoading(false);
    }
  };

  if (!active) return null;
  const completion = getCompletion(active);

  // Count analyses per phase for the filter
  const phaseCounts = useMemo(() => {
    const counts = { All: analyses.length, Untagged: 0 };
    VERSION_PHASES.forEach((v) => { counts[v] = 0; });
    analyses.forEach((a) => {
      if (!a.phase) counts.Untagged++;
      else if (counts[a.phase] !== undefined) counts[a.phase]++;
    });
    return counts;
  }, [analyses]);

  const renderSection = () => {
    switch (activeSection) {
      case "overview": return <OverviewSection data={active.overview} phase={active.phase} onChange={(v) => updateActive("overview", v)} onPhaseChange={updatePhase} />;
      case "problem": return <ProblemSection data={active.problem} onChange={(v) => updateActive("problem", v)} />;
      case "context": return <UserContextSection data={active.context} onChange={(v) => updateActive("context", v)} />;
      case "assumptions": return <AssumptionsSection data={active.assumptions} onChange={(v) => updateActive("assumptions", v)} />;
      case "edges": return <EdgeCasesSection data={active.edges} onChange={(v) => updateActive("edges", v)} />;
      case "scope": return <ScopeSection data={active.scope} onChange={(v) => updateActive("scope", v)} />;
      case "questions": return <QuestionsSection data={active.questions} onChange={(v) => updateActive("questions", v)} />;
      case "notes": return <NotesSection data={active.notes} onChange={(v) => updateActive("notes", v)} />;
      case "summary": return <SummarySection data={active.summary} onChange={(v) => updateActive("summary", v)} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="px-4 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">Product design requirement analyzer</h1>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">◀</button>
            </div>
            <button
              onClick={createNew}
              className="w-full py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              + New Analysis
            </button>
          </div>

          {/* Phase filter */}
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="flex gap-1 flex-wrap">
              {["All", ...VERSION_PHASES.filter((v) => v !== "Cut"), "Untagged"].map((f) => {
                const count = phaseCounts[f] || 0;
                if (f !== "All" && count === 0) return null;
                const isActive = phaseFilter === f;
                const colors = VERSION_COLORS[f];
                return (
                  <button
                    key={f}
                    onClick={() => setPhaseFilter(f)}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                      isActive
                        ? colors
                          ? `${colors.bg} ${colors.text} font-medium`
                          : "bg-slate-800 text-white font-medium"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {f} {count > 0 && <span className="opacity-60">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {filteredAnalyses.map((a) => {
              const comp = getCompletion(a);
              return (
                <div
                  key={a.id}
                  onClick={() => { setActiveId(a.id); setActiveSection("overview"); }}
                  className={`mx-2 mb-1 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors ${
                    a.id === activeId ? "bg-slate-100" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium text-slate-700 truncate flex-1">{a.name || "Untitled"}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {a.phase && <VersionBadge version={a.phase} size="xs" />}
                      {analyses.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteAnalysis(a.id); }}
                          className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 text-sm ml-1"
                        >×</button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full transition-all" style={{ width: `${comp}%` }} />
                    </div>
                    <span className="text-xs text-slate-400">{comp}%</span>
                  </div>
                </div>
              );
            })}
            {filteredAnalyses.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                No analyses in this phase.
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 space-y-2">
            {/* Collapsible GitHub Gist Section */}
            {gistExpanded && (
              <div className="space-y-2 mb-2">
                {/* GitHub Token */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">GitHub Token (for Gist sync)</label>
                  <input
                    type="password"
                    placeholder="ghp_..."
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                  <a
                    href="https://github.com/settings/tokens/new?description=Requirement%20Analyzer&scopes=gist"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-600 mt-0.5 inline-block"
                  >
                    Create token →
                  </a>
                </div>
                
                {/* Save to Gist */}
                <button
                  onClick={handleSaveToGist}
                  disabled={gistLoading || !githubToken}
                  className="w-full py-1.5 text-xs text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {gistLoading ? "Saving..." : active?.gistId ? "Update Gist" : "Save to Gist"}
                </button>
                
                {/* Load from Gist */}
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Gist ID to load"
                    value={loadGistId}
                    onChange={(e) => setLoadGistId(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                  <button
                    onClick={handleLoadFromGist}
                    disabled={gistLoading || !loadGistId.trim()}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 border border-slate-200 rounded hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Load
                  </button>
                </div>
                
                <div className="border-t border-slate-100 pt-2"></div>
              </div>
            )}
            
            {/* Toggle Button */}
            <button
              onClick={() => setGistExpanded(!gistExpanded)}
              className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors flex items-center justify-center gap-1"
            >
              GitHub Gist Sync {gistExpanded ? "▼" : "▲"}
            </button>
            
            <div className="space-y-2">
              <button onClick={handleExportMd} className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                Export as Markdown
              </button>
              <button onClick={handleExportJson} className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                Share Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <div className="flex items-center gap-3 mb-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-slate-600 text-sm mr-1">▶</button>
            )}
            <input
              className="text-lg font-semibold text-slate-800 bg-transparent border-none outline-none focus:ring-0 flex-1 px-0"
              value={active.name} onChange={(e) => updateName(e.target.value)}
              placeholder="Analysis name..."
            />
            <div className="flex items-center gap-2 shrink-0">
              {active.phase && <VersionBadge version={active.phase} />}
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${completion === 100 ? "bg-emerald-500" : "bg-slate-400"}`}
                  style={{ width: `${completion}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-8">{completion}%</span>
            </div>
          </div>
          {/* Section nav */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {SECTIONS.map((s) => {
              const getCountText = () => {
                if (s.id === "assumptions") {
                  const open = active.assumptions.filter(a => a.status === "Unvalidated" || a.status === "Needs Research").length;
                  return `${open}`;
                }
                if (s.id === "questions") {
                  const open = active.questions.filter(q => q.status === "Open").length;
                  return `${open}`;
                }
                return undefined;
              };
              return (
                <Pill
                  key={s.id}
                  active={activeSection === s.id}
                  onClick={() => setActiveSection(s.id)}
                  completion={s.id !== "assumptions" && s.id !== "questions" ? getSectionCompletion(active, s.id) : undefined}
                  count={getCountText()}
                >
                  <span className="mr-1 opacity-60">{s.icon}</span>
                  {s.label}
                </Pill>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">
            {renderSection()}
          </div>
        </div>
      </div>

      {/* Markdown Export Modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-8" onClick={() => setShowExport(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Markdown Export</h3>
              <button onClick={() => setShowExport(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-lg border border-slate-100">
                {exportToMarkdown(active)}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(exportToMarkdown(active)); }}
                className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}