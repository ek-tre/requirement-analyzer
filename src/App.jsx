import { useState, useCallback, useMemo } from "react";

const generateId = () => Math.random().toString(36).slice(2, 10);

const SECTIONS = [
  { id: "overview", label: "Overview", icon: "◉" },
  { id: "problem", label: "Problem & Purpose", icon: "◎" },
  { id: "context", label: "User Context", icon: "◈" },
  { id: "assumptions", label: "Assumptions", icon: "◇" },
  { id: "edges", label: "Edge Cases", icon: "◆" },
  { id: "scope", label: "Dependencies & Scope", icon: "◫" },
  { id: "questions", label: "Open Questions", icon: "◻" },
  { id: "summary", label: "Summary", icon: "◼" },
];

const ORIGIN_OPTIONS = [
  "User Research",
  "Business Metric",
  "Competitor Analysis",
  "Stakeholder Request",
  "Technical Debt",
  "Other",
];

const ASSUMPTION_STATUSES = ["Unvalidated", "Needs Research", "Validated", "Disproven"];
const QUESTION_TYPES = ["Can Answer Now", "Needs Stakeholder Decision", "Needs User Research"];
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
  scope: { affected: "", newPatterns: "", technical: "", core: "", niceToHave: "", mvp: "" },
  questions: [],
  summary: { confidence: "", concerns: "", nextSteps: "" },
});

function getCompletion(analysis) {
  let filled = 0, total = 0;
  const check = (val) => { total++; if (val && val.trim()) filled++; };
  Object.values(analysis.overview).forEach(check);
  Object.values(analysis.problem).forEach(check);
  Object.values(analysis.context).forEach(check);
  if (analysis.assumptions.length > 0) filled++;
  total++;
  const edgeCount = Object.values(analysis.edges).filter((e) => e.considered).length;
  if (edgeCount > 0) filled++;
  total++;
  Object.values(analysis.scope).forEach(check);
  if (analysis.questions.length > 0) filled++;
  total++;
  Object.values(analysis.summary).forEach(check);
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

function getSectionCompletion(analysis, sectionId) {
  let filled = 0, total = 0;
  const check = (val) => { total++; if (val && val.trim()) filled++; };
  switch (sectionId) {
    case "overview": Object.values(analysis.overview).forEach(check); break;
    case "problem": Object.values(analysis.problem).forEach(check); break;
    case "context": Object.values(analysis.context).forEach(check); break;
    case "assumptions": return { isCount: true, value: analysis.assumptions.length };
    case "edges":
      total = EDGE_CASE_ITEMS.length;
      filled = Object.values(analysis.edges).filter((e) => e.considered).length;
      break;
    case "scope": Object.values(analysis.scope).forEach(check); break;
    case "questions": return { isCount: true, value: analysis.questions.length };
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
  h("Overview");
  f("Feature", a.overview.featureName); f("Date", a.overview.date);
  f("Requestor", a.overview.requestor); f("Origin", a.overview.origin);
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
  h("Dependencies & Scope");
  f("Affected Features", a.scope.affected); f("New Patterns Needed", a.scope.newPatterns);
  f("Technical Constraints", a.scope.technical); f("Core (Must-Have)", a.scope.core);
  f("Nice-to-Have", a.scope.niceToHave); f("MVP Definition", a.scope.mvp);
  h("Open Questions");
  if (a.questions.length === 0) lines.push("*No questions logged yet.*");
  a.questions.forEach((q, i) => {
    const status = q.status === "Answered" ? "✓" : "?";
    lines.push(`${i + 1}. [${status}] (${q.type}) ${q.text}`);
    if (q.answer?.trim()) lines.push(`   → ${q.answer}`);
  });
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

const Select = ({ label, hint, value, options, onChange }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
    <select
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 bg-white"
      value={value || ""} onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select...</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Pill = ({ active, onClick, children, completion }) => {
  const isCount = typeof completion === 'object' && completion.isCount;
  const value = isCount ? completion.value : completion;
  const displayValue = isCount ? value : `${value}%`;
  const showBadge = isCount ? value > 0 : value > 0;
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
        active
          ? "bg-slate-800 text-white font-medium"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <span>{children}</span>
      {showBadge && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          active ? "bg-slate-600 text-slate-200" : (!isCount && value === 100) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}>
          {displayValue}
        </span>
      )}
    </button>
  );
};

const SectionHeader = ({ title, description }) => (
  <div className="mb-6 pb-4 border-b border-slate-100">
    <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
    {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
  </div>
);

// --- Section Components ---

const OverviewSection = ({ data, onChange }) => (
  <div>
    <SectionHeader title="Overview" description="Basic information about the feature requirement." />
    <div className="grid grid-cols-2 gap-4">
      <Field label="Feature Name" value={data.featureName} onChange={(v) => onChange({ ...data, featureName: v })} />
      <Field label="Date" value={data.date} onChange={(v) => onChange({ ...data, date: v })} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Field label="Requestor / Source" value={data.requestor} onChange={(v) => onChange({ ...data, requestor: v })} />
      <Select label="Requirement Origin" value={data.origin} options={ORIGIN_OPTIONS} onChange={(v) => onChange({ ...data, origin: v })} />
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
  const addItem = () => onChange([...data, { id: generateId(), text: "", status: "Unvalidated" }]);
  const updateItem = (id, field, val) =>
    onChange(data.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  const removeItem = (id) => onChange(data.filter((item) => item.id !== id));

  return (
    <div>
      <SectionHeader title="Assumptions" description="Every requirement carries hidden assumptions. Name them so you can validate or flag them." />
      {data.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg mb-4">
          No assumptions logged yet. Start adding them below.
        </div>
      )}
      <div className="space-y-3 mb-4">
        {data.map((item, i) => (
          <div key={item.id} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-400 mt-2.5 font-mono w-5 shrink-0">{i + 1}</span>
            <div className="flex-1 space-y-2">
              <input
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                placeholder="Describe the assumption..."
                value={item.text} onChange={(e) => updateItem(item.id, "text", e.target.value)}
              />
              <select
                className="px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                value={item.status} onChange={(e) => updateItem(item.id, "status", e.target.value)}
              >
                {ASSUMPTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
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

const ScopeSection = ({ data, onChange }) => (
  <div>
    <SectionHeader title="Dependencies & Scope" description="Understand what this touches and where to draw the line." />
    <Field label="Affected existing features" multiline hint="What current functionality does this change or interact with?" value={data.affected} onChange={(v) => onChange({ ...data, affected: v })} />
    <Field label="New components or patterns needed" multiline hint="Can you reuse existing patterns, or does this require new ones?" value={data.newPatterns} onChange={(v) => onChange({ ...data, newPatterns: v })} />
    <Field label="Technical dependencies or constraints" multiline value={data.technical} onChange={(v) => onChange({ ...data, technical: v })} />
    <div className="border-t border-slate-100 pt-4 mt-4">
      <p className="text-sm font-medium text-slate-600 mb-3">Scope Definition</p>
      <Field label="Core (must-have)" multiline hint="What's absolutely required for this to work?" value={data.core} onChange={(v) => onChange({ ...data, core: v })} />
      <Field label="Nice-to-have" multiline value={data.niceToHave} onChange={(v) => onChange({ ...data, niceToHave: v })} />
      <Field label="Smallest viable version (MVP)" multiline hint="What's the thinnest slice that still solves the problem?" value={data.mvp} onChange={(v) => onChange({ ...data, mvp: v })} />
    </div>
  </div>
);

const QuestionsSection = ({ data, onChange }) => {
  const addItem = () =>
    onChange([...data, { id: generateId(), text: "", type: "Can Answer Now", status: "Open", answer: "" }]);
  const updateItem = (id, field, val) =>
    onChange(data.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  const removeItem = (id) => onChange(data.filter((item) => item.id !== id));
  const openCount = data.filter((q) => q.status === "Open").length;

  return (
    <div>
      <SectionHeader title="Open Questions" description="What you don't know. Surface these early — they're your blocker list." />
      {data.length > 0 && (
        <p className="text-xs text-slate-500 mb-4">
          {openCount} open · {data.length - openCount} answered
        </p>
      )}
      {data.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg mb-4">
          No questions logged yet.
        </div>
      )}
      <div className="space-y-3 mb-4">
        {data.map((item, i) => (
          <div key={item.id} className={`p-3 rounded-lg border ${item.status === "Answered" ? "bg-slate-50 border-slate-100" : "bg-amber-50/30 border-amber-200/60"}`}>
            <div className="flex gap-2 items-start">
              <span className="text-xs text-slate-400 mt-2 font-mono w-5 shrink-0">{i + 1}</span>
              <div className="flex-1 space-y-2">
                <input
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                  placeholder="What do you need to find out?"
                  value={item.text} onChange={(e) => updateItem(item.id, "text", e.target.value)}
                />
                <div className="flex gap-2 flex-wrap">
                  <select
                    className="px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                    value={item.type} onChange={(e) => updateItem(item.id, "type", e.target.value)}
                  >
                    {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select
                    className="px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                    value={item.status} onChange={(e) => updateItem(item.id, "status", e.target.value)}
                  >
                    {QUESTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {item.status === "Answered" && (
                  <input
                    className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded bg-emerald-50 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                    placeholder="Answer..." value={item.answer}
                    onChange={(e) => updateItem(item.id, "answer", e.target.value)}
                  />
                )}
              </div>
              <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-400 text-lg mt-1 px-1">×</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addItem} className="text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-lg px-4 py-2 hover:border-slate-400 transition-colors">
        + Add question
      </button>
    </div>
  );
};

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
  const [analyses, setAnalyses] = useState([createBlankAnalysis("Sample: Dark Mode Toggle")]);
  const [activeId, setActiveId] = useState(analyses[0].id);
  const [activeSection, setActiveSection] = useState("overview");
  const [showExport, setShowExport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const active = useMemo(() => analyses.find((a) => a.id === activeId), [analyses, activeId]);

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

  const createNew = () => {
    const newA = createBlankAnalysis();
    setAnalyses((prev) => [newA, ...prev]);
    setActiveId(newA.id);
    setActiveSection("overview");
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

  const handleExportMd = () => {
    if (!active) return;
    setShowExport(true);
  };

  const handleImport = (e) => {
    const text = e.target.value;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        setAnalyses(parsed);
        setActiveId(parsed[0]?.id);
      } else if (parsed.id) {
        setAnalyses((prev) => [parsed, ...prev]);
        setActiveId(parsed.id);
      }
    } catch {}
  };

  const handleExportJson = () => {
    if (!active) return;
    const json = JSON.stringify(active, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!active) return null;

  const completion = getCompletion(active);

  const renderSection = () => {
    switch (activeSection) {
      case "overview": return <OverviewSection data={active.overview} onChange={(v) => updateActive("overview", v)} />;
      case "problem": return <ProblemSection data={active.problem} onChange={(v) => updateActive("problem", v)} />;
      case "context": return <UserContextSection data={active.context} onChange={(v) => updateActive("context", v)} />;
      case "assumptions": return <AssumptionsSection data={active.assumptions} onChange={(v) => updateActive("assumptions", v)} />;
      case "edges": return <EdgeCasesSection data={active.edges} onChange={(v) => updateActive("edges", v)} />;
      case "scope": return <ScopeSection data={active.scope} onChange={(v) => updateActive("scope", v)} />;
      case "questions": return <QuestionsSection data={active.questions} onChange={(v) => updateActive("questions", v)} />;
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
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">Requirement Analyzer</h1>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">◀</button>
            </div>
            <button
              onClick={createNew}
              className="w-full py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              + New Analysis
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {analyses.map((a) => {
              const comp = getCompletion(a);
              return (
                <div
                  key={a.id}
                  onClick={() => { setActiveId(a.id); setActiveSection("overview"); }}
                  className={`mx-2 mb-1 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors ${
                    a.id === activeId ? "bg-slate-100" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 truncate flex-1">{a.name || "Untitled"}</span>
                    {analyses.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteAnalysis(a.id); }}
                        className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 text-sm ml-2"
                      >×</button>
                    )}
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
          </div>
          <div className="px-4 py-3 border-t border-slate-100 space-y-2">
            <button onClick={handleExportMd} className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
              Export as Markdown
            </button>
            <button onClick={handleExportJson} className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
              Export as JSON
            </button>
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
              value={active.name}
              onChange={(e) => updateName(e.target.value)}
              placeholder="Analysis name..."
            />
            <div className="flex items-center gap-2 shrink-0">
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
            {SECTIONS.map((s) => (
              <Pill
                key={s.id}
                active={activeSection === s.id}
                onClick={() => setActiveSection(s.id)}
                completion={getSectionCompletion(active, s.id)}
              >
                <span className="mr-1 opacity-60">{s.icon}</span>
                {s.label}
              </Pill>
            ))}
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
