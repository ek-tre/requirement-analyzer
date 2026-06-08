import { useMemo, useState } from "react";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 84;
const HORIZONTAL_GAP = 56;
const OUTCOME_Y = 32;
const OPPORTUNITY_Y = 190;
const SOLUTION_Y = 350;
const EXPERIMENT_Y = 510;

const NODE_STYLES = {
  outcome: {
    bg: "#f3e8ff",
    border: "#a855f7",
    text: "#6b21a8",
    title: "Outcome",
  },
  opportunity: {
    bg: "#fef3c7",
    border: "#f59e0b",
    text: "#92400e",
    title: "Opportunity",
  },
  solution: {
    bg: "#dcfce7",
    border: "#22c55e",
    text: "#166534",
    title: "Solution",
  },
  experiment: {
    bg: "#e0f2fe",
    border: "#0ea5e9",
    text: "#075985",
    title: "Experiment",
  },
};

const EMPTY_TREE = {
  outcome: { id: "outcome", text: "Desired Outcome" },
  opportunities: [],
};

function normalizeTreeData(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  const outcomeRaw = base.outcome && typeof base.outcome === "object" ? base.outcome : {};

  const outcome = {
    id: typeof outcomeRaw.id === "string" && outcomeRaw.id ? outcomeRaw.id : "outcome",
    text: typeof outcomeRaw.text === "string" ? outcomeRaw.text : "Desired Outcome",
  };

  const opportunities = Array.isArray(base.opportunities) ? base.opportunities : [];
  const normalizedOpportunities = opportunities.map((opp, oppIndex) => {
    const safeOpp = opp && typeof opp === "object" ? opp : {};
    const oppId = typeof safeOpp.id === "string" && safeOpp.id ? safeOpp.id : `opp_${oppIndex}`;
    const oppText = typeof safeOpp.text === "string" ? safeOpp.text : "Opportunity";

    const solutions = Array.isArray(safeOpp.solutions) ? safeOpp.solutions : [];
    const normalizedSolutions = solutions.map((sol, solIndex) => {
      const safeSol = sol && typeof sol === "object" ? sol : {};
      const solId = typeof safeSol.id === "string" && safeSol.id ? safeSol.id : `${oppId}_sol_${solIndex}`;
      const solText = typeof safeSol.text === "string" ? safeSol.text : "Solution";

      const experiments = Array.isArray(safeSol.experiments) ? safeSol.experiments : [];
      const normalizedExperiments = experiments.map((exp, expIndex) => {
        const safeExp = exp && typeof exp === "object" ? exp : {};
        return {
          id: typeof safeExp.id === "string" && safeExp.id ? safeExp.id : `${solId}_exp_${expIndex}`,
          text: typeof safeExp.text === "string" ? safeExp.text : "Experiment",
        };
      });

      return {
        id: solId,
        text: solText,
        experiments: normalizedExperiments,
      };
    });

    return {
      id: oppId,
      text: oppText,
      sourceRowId: safeOpp.sourceRowId,
      solutions: normalizedSolutions,
    };
  });

  return {
    outcome,
    opportunities: normalizedOpportunities,
    positions: base.positions && typeof base.positions === "object" ? base.positions : undefined,
  };
}

function genId(prefix = "node") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function deepClone(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function calculateLayout(treeData) {
  const layout = {};
  const opportunities = treeData.opportunities || [];

  const opportunityCount = Math.max(1, opportunities.length);
  const totalOpportunityWidth = opportunityCount * NODE_WIDTH + (opportunityCount - 1) * HORIZONTAL_GAP;
  const startOpportunityX = Math.max(40, Math.floor((1200 - totalOpportunityWidth) / 2));

  const outcomeCenterX = startOpportunityX + totalOpportunityWidth / 2;
  layout[treeData.outcome.id] = {
    x: Math.max(40, Math.floor(outcomeCenterX - NODE_WIDTH / 2)),
    y: OUTCOME_Y,
  };

  opportunities.forEach((opp, oppIndex) => {
    const oppX = startOpportunityX + oppIndex * (NODE_WIDTH + HORIZONTAL_GAP);
    layout[opp.id] = { x: oppX, y: OPPORTUNITY_Y };

    const solutions = opp.solutions || [];
    if (solutions.length === 0) return;

    const totalSolutionsWidth = solutions.length * NODE_WIDTH + (solutions.length - 1) * HORIZONTAL_GAP;
    const solutionsStartX = oppX + Math.floor((NODE_WIDTH - totalSolutionsWidth) / 2);

    solutions.forEach((sol, solIndex) => {
      const solX = solutionsStartX + solIndex * (NODE_WIDTH + HORIZONTAL_GAP);
      layout[sol.id] = { x: solX, y: SOLUTION_Y };

      const experiments = sol.experiments || [];
      if (experiments.length === 0) return;

      const totalExperimentsWidth = experiments.length * NODE_WIDTH + (experiments.length - 1) * HORIZONTAL_GAP;
      const experimentsStartX = solX + Math.floor((NODE_WIDTH - totalExperimentsWidth) / 2);

      experiments.forEach((exp, expIndex) => {
        const expX = experimentsStartX + expIndex * (NODE_WIDTH + HORIZONTAL_GAP);
        layout[exp.id] = { x: expX, y: EXPERIMENT_Y };
      });
    });
  });

  return layout;
}

function getTreeBounds(treeData, layout) {
  const nodes = [treeData.outcome, ...(treeData.opportunities || [])];
  (treeData.opportunities || []).forEach((opp) => {
    (opp.solutions || []).forEach((sol) => {
      nodes.push(sol);
      (sol.experiments || []).forEach((exp) => nodes.push(exp));
    });
  });

  let maxX = 0;
  let maxY = 0;
  nodes.forEach((node) => {
    const pos = layout[node.id] || { x: 40, y: 40 };
    maxX = Math.max(maxX, pos.x + NODE_WIDTH + 40);
    maxY = Math.max(maxY, pos.y + NODE_HEIGHT + 40);
  });

  return {
    width: Math.max(1200, maxX),
    height: Math.max(660, maxY),
  };
}

function getOpportunityForNode(selection, treeData) {
  if (!selection) return null;
  if (selection.type === "opportunity") return selection.id;
  if (selection.type === "solution") return selection.parentId;
  if (selection.type === "experiment") return selection.grandParentId;
  return null;
}

function getChainNodeIds(opportunityId, treeData) {
  const ids = new Set([treeData.outcome.id, opportunityId]);
  const opportunity = (treeData.opportunities || []).find((o) => o.id === opportunityId);
  if (!opportunity) return ids;

  (opportunity.solutions || []).forEach((sol) => {
    ids.add(sol.id);
    (sol.experiments || []).forEach((exp) => ids.add(exp.id));
  });

  return ids;
}

export default function OSTCanvas({ outcomeId, data, onChange }) {
  const treeData = useMemo(() => normalizeTreeData(data || EMPTY_TREE), [data]);
  const [selection, setSelection] = useState(null);
  const [focusedOpportunityId, setFocusedOpportunityId] = useState(null);

  const layout = useMemo(() => treeData.positions || calculateLayout(treeData), [treeData]);
  const bounds = useMemo(() => getTreeBounds(treeData, layout), [treeData, layout]);

  const updateTree = (updater) => {
    const next = deepClone(treeData);
    updater(next);
    next.positions = calculateLayout(next);
    onChange(next);
  };

  const addOpportunity = () => {
    updateTree((next) => {
      next.opportunities = next.opportunities || [];
      next.opportunities.push({
        id: genId("opp"),
        text: "New Opportunity",
        solutions: [],
      });
    });
  };

  const addSolution = () => {
    const oppId = selection?.type === "opportunity" ? selection.id : selection?.parentId;
    if (!oppId) {
      alert("Select an opportunity first");
      return;
    }

    updateTree((next) => {
      const opp = (next.opportunities || []).find((o) => o.id === oppId);
      if (!opp) return;
      opp.solutions = opp.solutions || [];
      opp.solutions.push({ id: genId("sol"), text: "New Solution", experiments: [] });
    });
  };

  const addExperiment = () => {
    if (selection?.type !== "solution") {
      alert("Select a solution first");
      return;
    }

    updateTree((next) => {
      const opp = (next.opportunities || []).find((o) => o.id === selection.parentId);
      if (!opp) return;
      const sol = (opp.solutions || []).find((s) => s.id === selection.id);
      if (!sol) return;
      sol.experiments = sol.experiments || [];
      sol.experiments.push({ id: genId("exp"), text: "New Experiment" });
    });
  };

  const deleteSelected = () => {
    if (!selection || selection.type === "outcome") return;

    updateTree((next) => {
      if (selection.type === "opportunity") {
        next.opportunities = (next.opportunities || []).filter((o) => o.id !== selection.id);
        if (focusedOpportunityId === selection.id) setFocusedOpportunityId(null);
        return;
      }

      if (selection.type === "solution") {
        const opp = (next.opportunities || []).find((o) => o.id === selection.parentId);
        if (!opp) return;
        opp.solutions = (opp.solutions || []).filter((s) => s.id !== selection.id);
        return;
      }

      if (selection.type === "experiment") {
        const opp = (next.opportunities || []).find((o) => o.id === selection.grandParentId);
        if (!opp) return;
        const sol = (opp.solutions || []).find((s) => s.id === selection.parentId);
        if (!sol) return;
        sol.experiments = (sol.experiments || []).filter((e) => e.id !== selection.id);
      }
    });

    setSelection(null);
  };

  const updateNodeText = (meta, value) => {
    updateTree((next) => {
      if (meta.type === "outcome") {
        next.outcome.text = value;
        return;
      }
      if (meta.type === "opportunity") {
        const opp = (next.opportunities || []).find((o) => o.id === meta.id);
        if (opp) opp.text = value;
        return;
      }
      if (meta.type === "solution") {
        const opp = (next.opportunities || []).find((o) => o.id === meta.parentId);
        const sol = opp?.solutions?.find((s) => s.id === meta.id);
        if (sol) sol.text = value;
        return;
      }
      if (meta.type === "experiment") {
        const opp = (next.opportunities || []).find((o) => o.id === meta.grandParentId);
        const sol = opp?.solutions?.find((s) => s.id === meta.parentId);
        const exp = sol?.experiments?.find((e) => e.id === meta.id);
        if (exp) exp.text = value;
      }
    });
  };

  const renderNode = (meta, text) => {
    const style = NODE_STYLES[meta.type];
    const pos = layout[meta.id] || { x: 40, y: 40 };
    const isSelected = selection?.type === meta.type && selection?.id === meta.id;

    let opacity = 1;
    if (focusedOpportunityId) {
      const chainIds = getChainNodeIds(focusedOpportunityId, treeData);
      opacity = chainIds.has(meta.id) ? 1 : 0.2;
    }

    return (
      <div
        key={meta.id}
        className="absolute rounded-xl shadow-sm"
        style={{
          left: pos.x,
          top: pos.y,
          width: NODE_WIDTH,
          minHeight: NODE_HEIGHT,
          background: style.bg,
          border: `2px solid ${isSelected ? "#1e293b" : style.border}`,
          opacity,
          transition: "opacity 120ms ease",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelection(meta);

          const oppId = getOpportunityForNode(meta, treeData);
          if (oppId) {
            setFocusedOpportunityId((prev) => (prev === oppId ? null : oppId));
          } else {
            setFocusedOpportunityId(null);
          }
        }}
      >
        <div
          className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: style.text }}
        >
          {style.title}
        </div>
        <textarea
          value={text || ""}
          onChange={(e) => updateNodeText(meta, e.target.value)}
          className="w-full bg-transparent px-3 pb-3 pt-1 text-sm resize-none outline-none"
          style={{ color: style.text, minHeight: 56 }}
        />
      </div>
    );
  };

  const edges = [];
  (treeData.opportunities || []).forEach((opp) => {
    edges.push({ fromId: treeData.outcome.id, toId: opp.id });
    (opp.solutions || []).forEach((sol) => {
      edges.push({ fromId: opp.id, toId: sol.id });
      (sol.experiments || []).forEach((exp) => {
        edges.push({ fromId: sol.id, toId: exp.id });
      });
    });
  });

  return (
    <div className="flex flex-col h-full" key={outcomeId}>
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900" onClick={() => setSelection(null)}>
        <div
          className="relative"
          style={{
            width: bounds.width,
            height: bounds.height,
            minWidth: "100%",
          }}
        >
          <svg
            className="absolute inset-0 pointer-events-none"
            width={bounds.width}
            height={bounds.height}
            viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          >
            {edges.map((edge) => {
              const from = layout[edge.fromId];
              const to = layout[edge.toId];
              if (!from || !to) return null;

              const x1 = from.x + NODE_WIDTH / 2;
              const y1 = from.y + NODE_HEIGHT;
              const x2 = to.x + NODE_WIDTH / 2;
              const y2 = to.y;

              return (
                <path
                  key={`${edge.fromId}-${edge.toId}`}
                  d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {renderNode({ type: "outcome", id: treeData.outcome.id }, treeData.outcome.text)}
          {(treeData.opportunities || []).map((opp) => {
            const nodes = [
              renderNode({ type: "opportunity", id: opp.id }, opp.text),
            ];
            (opp.solutions || []).forEach((sol) => {
              nodes.push(renderNode({ type: "solution", id: sol.id, parentId: opp.id }, sol.text));
              (sol.experiments || []).forEach((exp) => {
                nodes.push(
                  renderNode(
                    { type: "experiment", id: exp.id, parentId: sol.id, grandParentId: opp.id },
                    exp.text
                  )
                );
              });
            });
            return nodes;
          })}
        </div>
      </div>
    </div>
  );
}
