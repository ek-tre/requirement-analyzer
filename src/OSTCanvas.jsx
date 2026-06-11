import { useMemo, useState, useRef, useEffect } from "react";

const MIN_CANVAS_WIDTH = 1200;
const CANVAS_PADDING_X = 40;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 84;
const CHAIN_HORIZONTAL_GAP = 180;
const CHILD_HORIZONTAL_GAP = 120;
const OUTCOME_Y = 32;
const OPPORTUNITY_Y = 190;
const SOLUTION_Y = 340;
const EXPERIMENT_Y = 500;
const DIAGRAM_VISIBLE_LIMIT = 3;

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
          result: typeof safeExp.result === "string" ? safeExp.result : "",
          designTaskId: typeof safeExp.designTaskId === "string" ? safeExp.designTaskId : "",
          designTaskName: typeof safeExp.designTaskName === "string" ? safeExp.designTaskName : "",
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
      showInDiagram: typeof safeOpp.showInDiagram === "boolean" ? safeOpp.showInDiagram : true,
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

function calculateLayout(treeData, canvasWidth = MIN_CANVAS_WIDTH) {
  const layout = {};
  const opportunities = treeData.opportunities || [];
  const availableWidth = Math.max(MIN_CANVAS_WIDTH, canvasWidth);

  const opportunityCount = Math.max(1, opportunities.length);
  const totalOpportunityWidth =
    opportunityCount * NODE_WIDTH + (opportunityCount - 1) * CHAIN_HORIZONTAL_GAP;
  const startOpportunityX = Math.max(
    CANVAS_PADDING_X,
    Math.floor((availableWidth - totalOpportunityWidth) / 2)
  );

  const outcomeCenterX = startOpportunityX + totalOpportunityWidth / 2;
  layout[treeData.outcome.id] = {
    x: Math.max(CANVAS_PADDING_X, Math.floor(outcomeCenterX - NODE_WIDTH / 2)),
    y: OUTCOME_Y,
  };

  opportunities.forEach((opp, oppIndex) => {
    const oppX = startOpportunityX + oppIndex * (NODE_WIDTH + CHAIN_HORIZONTAL_GAP);
    layout[opp.id] = { x: oppX, y: OPPORTUNITY_Y };

    const solutions = opp.solutions || [];
    if (solutions.length === 0) return;

    const totalSolutionsWidth =
      solutions.length * NODE_WIDTH + (solutions.length - 1) * CHILD_HORIZONTAL_GAP;
    const solutionsStartX = oppX + Math.floor((NODE_WIDTH - totalSolutionsWidth) / 2);

    solutions.forEach((sol, solIndex) => {
      const solX = solutionsStartX + solIndex * (NODE_WIDTH + CHILD_HORIZONTAL_GAP);
      layout[sol.id] = { x: solX, y: SOLUTION_Y };

      const experiments = sol.experiments || [];
      if (experiments.length === 0) return;

      const totalExperimentsWidth =
        experiments.length * NODE_WIDTH + (experiments.length - 1) * CHILD_HORIZONTAL_GAP;
      const experimentsStartX = solX + Math.floor((NODE_WIDTH - totalExperimentsWidth) / 2);

      experiments.forEach((exp, expIndex) => {
        const expX = experimentsStartX + expIndex * (NODE_WIDTH + CHILD_HORIZONTAL_GAP);
        layout[exp.id] = { x: expX, y: EXPERIMENT_Y };
      });
    });
  });

  return layout;
}

function getTreeBoundsWithHeights(treeData, layout, getNodeHeight, canvasWidth) {
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
    const nodeHeight = getNodeHeight(node.id);
    maxX = Math.max(maxX, pos.x + NODE_WIDTH + 40);
    maxY = Math.max(maxY, pos.y + nodeHeight + 180);
  });

  return {
    width: Math.max(MIN_CANVAS_WIDTH, canvasWidth, maxX),
    height: Math.max(660, maxY),
  };
}

function NodeCard({
  meta,
  text,
  placeholder,
  style,
  isSelected,
  onClickHandler,
  onTextChange,
  extraContent,
  footerActions,
}) {
  const textareaRef = useRef(null);
  const placeholderMinHeight = useMemo(() => {
    if (!placeholder) return 56;

    // Include textarea vertical padding so wrapped placeholder lines are not clipped.
    const estimatedCharsPerLine = 18;
    const estimatedLines = Math.max(3, Math.ceil(placeholder.length / estimatedCharsPerLine));
    const estimatedLineHeight = 20;
    const verticalPadding = 16;
    return Math.min(160, Math.max(72, estimatedLines * estimatedLineHeight + verticalPadding));
  }, [placeholder]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const hasValue = Boolean((textareaRef.current.value || "").trim());
      const targetHeight = hasValue
        ? Math.max(placeholderMinHeight, textareaRef.current.scrollHeight)
        : placeholderMinHeight;
      textareaRef.current.style.height = `${targetHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [text, placeholderMinHeight]);

  return (
    <div
      className="rounded-xl shadow-sm"
      style={{
        width: NODE_WIDTH,
        background: style.bg,
        border: `2px solid ${isSelected ? "#1e293b" : style.border}`,
        transition: "opacity 120ms ease",
        display: "flex",
        flexDirection: "column",
        height: "auto",
      }}
      onClick={onClickHandler}
    >
      <div
        className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: style.text, flexShrink: 0 }}
      >
        {style.title}
      </div>
      <textarea
        ref={textareaRef}
        value={text || ""}
        onChange={(e) => {
          onTextChange(e.target.value);
          setTimeout(adjustHeight, 0);
        }}
        onInput={adjustHeight}
        className="w-full bg-transparent px-3 pb-3 pt-1 text-sm leading-[1.4] resize-none outline-none"
        placeholder={placeholder}
        style={{ color: style.text, height: "auto", minHeight: placeholderMinHeight, overflowY: "hidden" }}
      />
      {extraContent ? <div className="px-3 pb-3">{extraContent}</div> : null}
      {footerActions ? <div className="flex flex-wrap gap-2 px-3 pb-3">{footerActions}</div> : null}
    </div>
  );
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

export default function OSTCanvas({
  outcomeId,
  data,
  onChange,
  researchDocuments = [],
  onCreateDesignTask,
  onOpenDesignTask,
  onUploadDataRequest,
}) {
  const treeData = useMemo(() => normalizeTreeData(data || EMPTY_TREE), [data]);
  const visibleTreeData = useMemo(
    () => ({
      ...treeData,
      opportunities: (treeData.opportunities || []).filter((opp) => opp.showInDiagram === true),
    }),
    [treeData]
  );
  const [selection, setSelection] = useState(null);
  const [focusedOpportunityId, setFocusedOpportunityId] = useState(null);
  const [hoveredTerminalEdgeKey, setHoveredTerminalEdgeKey] = useState(null);
  const [deleteConfirmMeta, setDeleteConfirmMeta] = useState(null);
  const [openDocsForOpportunityId, setOpenDocsForOpportunityId] = useState(null);
  const [expandedResultEditors, setExpandedResultEditors] = useState({});
  const [nodeHeights, setNodeHeights] = useState({});
  const nodeHeightCacheRef = useRef({});
  const docsPopoverRef = useRef(null);
  const canvasViewportRef = useRef(null);
  const [canvasViewportWidth, setCanvasViewportWidth] = useState(0);

  const linkedDocumentsByOpportunity = useMemo(() => {
    const grouped = {};

    (researchDocuments || []).forEach((doc, docIndex) => {
      if (!doc || typeof doc !== "object") return;

      const rawName = typeof doc.name === "string" ? doc.name.trim() : "";
      const safeName = rawName || "Unnamed document";
      const safeId = typeof doc.id === "string" && doc.id ? doc.id : `doc_fallback_${docIndex}`;
      const linkedOpportunityIds = Array.isArray(doc.opportunityIds)
        ? doc.opportunityIds
        : (typeof doc.opportunityId === "string" && doc.opportunityId ? [doc.opportunityId] : []);

      linkedOpportunityIds.forEach((opportunityId) => {
        if (typeof opportunityId !== "string" || !opportunityId) return;
        grouped[opportunityId] = grouped[opportunityId] || [];

        const alreadyIncluded = grouped[opportunityId].some((linkedDoc) => linkedDoc.id === safeId);
        if (!alreadyIncluded) {
          grouped[opportunityId].push({ id: safeId, name: safeName });
        }
      });
    });

    return grouped;
  }, [researchDocuments]);

  useEffect(() => {
    const viewport = canvasViewportRef.current;
    if (!viewport) return undefined;

    const updateViewportWidth = () => {
      setCanvasViewportWidth(viewport.clientWidth || 0);
    };

    updateViewportWidth();

    const observer = new ResizeObserver(() => {
      updateViewportWidth();
    });

    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, []);

  const availableCanvasWidth = Math.max(MIN_CANVAS_WIDTH, canvasViewportWidth);
  const layout = useMemo(
    () => calculateLayout(visibleTreeData, availableCanvasWidth),
    [visibleTreeData, availableCanvasWidth]
  );
  const getNodeHeight = (nodeId) => nodeHeights[nodeId] || NODE_HEIGHT;
  const bounds = useMemo(
    () => getTreeBoundsWithHeights(visibleTreeData, layout, getNodeHeight, availableCanvasWidth),
    [visibleTreeData, layout, nodeHeights, availableCanvasWidth]
  );

  useEffect(() => {
    setNodeHeights((prev) => {
      const validIds = new Set([visibleTreeData.outcome.id]);
      (visibleTreeData.opportunities || []).forEach((opp) => {
        validIds.add(opp.id);
        (opp.solutions || []).forEach((sol) => {
          validIds.add(sol.id);
          (sol.experiments || []).forEach((exp) => validIds.add(exp.id));
        });
      });

      const next = {};
      let changed = false;
      Object.keys(prev).forEach((id) => {
        if (validIds.has(id)) {
          next[id] = prev[id];
        } else {
          changed = true;
        }
      });

      if (!changed && Object.keys(next).length === Object.keys(prev).length) {
        return prev;
      }

      return next;
    });
  }, [visibleTreeData]);

  useEffect(() => {
    if (!openDocsForOpportunityId) return;

    const handlePointerDown = (event) => {
      if (!docsPopoverRef.current) return;
      if (!docsPopoverRef.current.contains(event.target)) {
        setOpenDocsForOpportunityId(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenDocsForOpportunityId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDocsForOpportunityId]);

  const updateTree = (updater) => {
    const next = deepClone(treeData);
    updater(next);
    next.positions = calculateLayout(next, availableCanvasWidth);
    onChange(next);
  };

  const addOpportunity = () => {
    updateTree((next) => {
      next.opportunities = next.opportunities || [];
      const shownCount = next.opportunities.reduce(
        (count, opportunity) => count + (opportunity?.showInDiagram === true ? 1 : 0),
        0
      );
      next.opportunities.push({
        id: genId("opp"),
        text: "New Opportunity",
        showInDiagram: shownCount < DIAGRAM_VISIBLE_LIMIT,
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

  const deleteNodeByMeta = (meta) => {
    if (!meta || meta.type === "outcome") return;

    updateTree((next) => {
      if (meta.type === "opportunity") {
        next.opportunities = (next.opportunities || []).filter((o) => o.id !== meta.id);
        if (focusedOpportunityId === meta.id) setFocusedOpportunityId(null);
        return;
      }

      if (meta.type === "solution") {
        const opp = (next.opportunities || []).find((o) => o.id === meta.parentId);
        if (!opp) return;
        opp.solutions = (opp.solutions || []).filter((s) => s.id !== meta.id);
        return;
      }

      if (meta.type === "experiment") {
        const opp = (next.opportunities || []).find((o) => o.id === meta.grandParentId);
        if (!opp) return;
        const sol = (opp.solutions || []).find((s) => s.id === meta.parentId);
        if (!sol) return;
        sol.experiments = (sol.experiments || []).filter((e) => e.id !== meta.id);
      }
    });

    setSelection(null);
  };

  const deleteSelected = () => {
    if (!selection) return;
    deleteNodeByMeta(selection);
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
        next.opportunities = (next.opportunities || []).map((opp) => {
          if (opp.id !== meta.parentId) return opp;

          return {
            ...opp,
            solutions: (opp.solutions || []).map((sol) =>
              sol.id === meta.id ? { ...sol, text: value } : sol
            ),
          };
        });
        return;
      }
      if (meta.type === "experiment") {
        next.opportunities = (next.opportunities || []).map((opp) => {
          if (opp.id !== meta.grandParentId) return opp;

          return {
            ...opp,
            solutions: (opp.solutions || []).map((sol) => {
              if (sol.id !== meta.parentId) return sol;

              return {
                ...sol,
                experiments: (sol.experiments || []).map((exp) =>
                  exp.id === meta.id ? { ...exp, text: value } : exp
                ),
              };
            }),
          };
        });
      }
    });
  };

  const updateExperimentResult = (meta, value) => {
    updateTree((next) => {
      next.opportunities = (next.opportunities || []).map((opp) => {
        if (opp.id !== meta.grandParentId) return opp;

        return {
          ...opp,
          solutions: (opp.solutions || []).map((sol) => {
            if (sol.id !== meta.parentId) return sol;

            return {
              ...sol,
              experiments: (sol.experiments || []).map((exp) =>
                exp.id === meta.id ? { ...exp, result: value } : exp
              ),
            };
          }),
        };
      });
    });
  };

  const setResultEditorExpanded = (experimentId, isExpanded) => {
    setExpandedResultEditors((prev) => {
      if (isExpanded) {
        return { ...prev, [experimentId]: true };
      }

      const next = { ...prev };
      delete next[experimentId];
      return next;
    });
  };

  const renderNode = (meta, text, placeholder = "", options = {}) => {
    const style = NODE_STYLES[meta.type];
    const pos = layout[meta.id] || { x: 40, y: 40 };
    const isSelected = selection?.type === meta.type && selection?.id === meta.id;

    let opacity = 1;
    if (focusedOpportunityId) {
      const chainIds = getChainNodeIds(focusedOpportunityId, visibleTreeData);
      opacity = chainIds.has(meta.id) ? 1 : 0.2;
    }

    return (
      <div
        key={`${meta.type}-${meta.id}`}
        className="absolute"
        ref={(element) => {
          if (!element) return;
          const measuredHeight = Math.ceil(element.getBoundingClientRect().height);
          if (nodeHeightCacheRef.current[meta.id] === measuredHeight) return;
          nodeHeightCacheRef.current[meta.id] = measuredHeight;
          setNodeHeights((prev) => {
            if (prev[meta.id] === measuredHeight) return prev;
            return { ...prev, [meta.id]: measuredHeight };
          });
        }}
        style={{
          left: pos.x,
          top: pos.y,
          width: NODE_WIDTH,
          opacity,
          transition: "opacity 120ms ease",
        }}
      >
        <NodeCard
          meta={meta}
          text={text}
          placeholder={placeholder}
          style={style}
          isSelected={isSelected}
          onClickHandler={(e) => {
            e.stopPropagation();
            setSelection(meta);

            const oppId = getOpportunityForNode(meta, visibleTreeData);
            if (oppId) {
              setFocusedOpportunityId((prev) => (prev === oppId ? null : oppId));
            } else {
              setFocusedOpportunityId(null);
            }
          }}
          onTextChange={(value) => updateNodeText(meta, value)}
          extraContent={options.extraContent}
          footerActions={options.footerActions}
        />
        {options.belowContent ? (
          <div className="flex flex-col items-center">
            <svg width="2" height="52" viewBox="0 0 2 52" aria-hidden="true" className="block">
              <line x1="1" y1="0" x2="1" y2="52" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {options.belowContent}
          </div>
        ) : null}
      </div>
    );
  };

  const renderAddButton = (parentMeta, childType, parentPos, onClickHandler) => {
    const BUTTON_SIZE = 40;
    const parentHeight = getNodeHeight(parentMeta.id);
    const buttonY = parentPos.y + parentHeight + 36;
    const buttonX = parentPos.x + NODE_WIDTH / 2;
    const style = NODE_STYLES[childType];

    return {
      button: (
        <button
          key={`add-${parentMeta.type}-${parentMeta.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onClickHandler();
          }}
          className="absolute flex items-center justify-center rounded-full"
          style={{
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            left: buttonX - BUTTON_SIZE / 2,
            top: buttonY - BUTTON_SIZE / 2,
            background: "transparent",
            border: `1.5px solid ${style.border}`,
             color: style.border,
            cursor: "pointer",
            fontSize: "26px",
            fontWeight: "300",
            lineHeight: 1,
            zIndex: 10,
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
          }}
        >
          <span style={{ transform: "translateY(-2px)" }}>+</span>
        </button>
      ),
      svgLine: (
        <line
          key={`line-${parentMeta.type}-${parentMeta.id}`}
          x1={parentPos.x + NODE_WIDTH / 2}
          y1={parentPos.y + parentHeight}
          x2={parentPos.x + NODE_WIDTH / 2}
          y2={buttonY - BUTTON_SIZE / 2}
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeDasharray="2,3"
        />
      ),
    };
  };

  const edges = [];
  const addButtonsData = [];
  (visibleTreeData.opportunities || []).forEach((opp) => {
    edges.push({
      fromId: visibleTreeData.outcome.id,
      toId: opp.id,
      key: `${visibleTreeData.outcome.id}-${opp.id}`,
      isTerminal: false,
    });
    (opp.solutions || []).forEach((sol) => {
      const hasExperiments = (sol.experiments || []).length > 0;
      edges.push({
        fromId: opp.id,
        toId: sol.id,
        key: `${opp.id}-${sol.id}`,
        isTerminal: !hasExperiments,
        targetType: "solution",
        targetMeta: !hasExperiments
          ? { type: "solution", id: sol.id, parentId: opp.id }
          : null,
      });
      (sol.experiments || []).forEach((exp) => {
        edges.push({
          fromId: sol.id,
          toId: exp.id,
          key: `${sol.id}-${exp.id}`,
          isTerminal: true,
          targetType: "experiment",
          targetMeta: { type: "experiment", id: exp.id, parentId: sol.id, grandParentId: opp.id },
        });
      });
    });
  });
  return (
    <div className="flex flex-col h-full" key={outcomeId}>
      <div
        ref={canvasViewportRef}
        className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900"
        onClick={() => setSelection(null)}
      >
        <div
          className="relative"
          style={{
            width: bounds.width,
            height: bounds.height,
            minWidth: "100%",
          }}
        >
          <svg
            className="absolute inset-0"
            width={bounds.width}
            height={bounds.height}
            viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          >
            {edges.map((edge) => {
              const from = layout[edge.fromId];
              const to = layout[edge.toId];
              if (!from || !to) return null;

              const x1 = from.x + NODE_WIDTH / 2;
              const y1 = from.y + getNodeHeight(edge.fromId);
              const x2 = to.x + NODE_WIDTH / 2;
              const y2 = to.y;
              const deleteX = x1 + 0.5 * (x2 - x1);
              const deleteY = y1 + 0.5 * (y2 - y1);
              const isHovered = hoveredTerminalEdgeKey === edge.key;

              return (
                <g key={edge.key}>
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    className="pointer-events-none"
                  />
                  {edge.isTerminal && edge.targetMeta && (
                    <path
                      d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="12"
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onMouseEnter={() => setHoveredTerminalEdgeKey(edge.key)}
                      onMouseLeave={() => setHoveredTerminalEdgeKey((prev) => (prev === edge.key ? null : prev))}
                    />
                  )}
                  {edge.isTerminal && edge.targetMeta && isHovered && (
                    <g
                      transform={`translate(${deleteX} ${deleteY})`}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredTerminalEdgeKey(edge.key)}
                      onMouseLeave={() => setHoveredTerminalEdgeKey((prev) => (prev === edge.key ? null : prev))}
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteConfirmMeta(edge.targetMeta);
                      }}
                    >
                      <circle r="12" fill="#ffffff" stroke="#ef4444" strokeWidth="1.5" />
                      <path d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                    </g>
                  )}
                </g>
              );
            })}
            {addButtonsData}
          </svg>

          {renderNode({ type: "outcome", id: visibleTreeData.outcome.id }, visibleTreeData.outcome.text)}
          {(visibleTreeData.opportunities || []).map((opp) => {
            const nodes = [
              renderNode({ type: "opportunity", id: opp.id }, opp.text),
            ];
            
            const oppPos = layout[opp.id] || { x: 40, y: 40 };
            
            // Add button for solutions if opportunity has no solutions
            if ((opp.solutions || []).length === 0) {
              const buttonData = renderAddButton(
                { type: "opportunity", id: opp.id },
                "solution",
                oppPos,
                () => {
                  updateTree((next) => {
                    const opportunity = (next.opportunities || []).find((o) => o.id === opp.id);
                    if (!opportunity) return;
                    opportunity.solutions = opportunity.solutions || [];
                    opportunity.solutions.push({
                      id: genId("sol"),
                      text: "",
                      experiments: [],
                    });
                  });
                }
              );
              addButtonsData.push(buttonData.svgLine);
              nodes.push(buttonData.button);
            }
            
            (opp.solutions || []).forEach((sol) => {
              const solPlaceholder = "A solution should be testable. What would you try?";
              nodes.push(
                renderNode(
                  { type: "solution", id: sol.id, parentId: opp.id },
                  sol.text,
                  solPlaceholder,
                  {}
                )
              );
              
              const solPos = layout[sol.id] || { x: 40, y: 40 };
              
              // Add button for experiments if solution has text and no experiments
              if (sol.text.trim() !== "" && (sol.experiments || []).length === 0) {
                const buttonData = renderAddButton(
                  { type: "solution", id: sol.id },
                  "experiment",
                  solPos,
                  () => {
                    updateTree((next) => {
                      const opportunity = (next.opportunities || []).find((o) => o.id === opp.id);
                      if (!opportunity) return;
                      const solution = (opportunity.solutions || []).find((s) => s.id === sol.id);
                      if (!solution) return;
                      solution.experiments = solution.experiments || [];
                      solution.experiments.push({
                        id: genId("exp"),
                        text: "",
                      });
                    });
                  }
                );
                addButtonsData.push(buttonData.svgLine);
                nodes.push(buttonData.button);
              }
              
              (sol.experiments || []).forEach((exp) => {
                const expPlaceholder = "What's the smallest test that would teach you something useful before building?";
                const resultValue = typeof exp.result === "string" ? exp.result : "";
                const hasResult = resultValue.trim() !== "";
                const isResultEditorExpanded = expandedResultEditors[exp.id] === true;
                const designTaskId = typeof exp.designTaskId === "string" ? exp.designTaskId : "";
                const designTaskName = typeof exp.designTaskName === "string" && exp.designTaskName.trim() ? exp.designTaskName.trim() : "Untitled Design Task";
                const experimentMeta = { type: "experiment", id: exp.id, parentId: sol.id, grandParentId: opp.id };
                const experimentBelowContent = hasResult && !isResultEditorExpanded && (typeof onCreateDesignTask === "function" || (designTaskId && typeof onOpenDesignTask === "function"))
                  ? (
                    <div className="flex flex-col items-center">
                      <svg width="2" height="36" viewBox="0 0 2 36" className="block" aria-hidden="true">
                        <line x1="1" y1="0" x2="1" y2="36" stroke="#94a3b8" strokeWidth="2" />
                      </svg>
                      {designTaskId && typeof onOpenDesignTask === "function" ? (
                        <button
                          type="button"
                          className="inline-flex max-w-full items-center justify-center gap-2 rounded-lg border border-black bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenDesignTask(designTaskId);
                          }}
                          title={`Open design task: ${designTaskName}`}
                        >
                          <span className="max-w-full whitespace-normal break-words text-left">{designTaskName}</span>
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M4 10H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M11 5L16 10L11 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex max-w-full items-center justify-center gap-2 rounded-lg border border-black bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-sm transition-colors hover:bg-slate-100"
                          onClick={async (event) => {
                            event.stopPropagation();
                            const createdTask = await onCreateDesignTask({
                              outcome: visibleTreeData.outcome,
                              opportunity: opp,
                              solution: sol,
                              experiment: exp,
                            });

                            if (!createdTask || !createdTask.id) {
                              return;
                            }

                            updateTree((next) => {
                              const nextOpportunity = (next.opportunities || []).find((candidate) => candidate.id === opp.id);
                              if (!nextOpportunity) return;
                              const nextSolution = (nextOpportunity.solutions || []).find((candidate) => candidate.id === sol.id);
                              if (!nextSolution) return;
                              const nextExperiment = (nextSolution.experiments || []).find((candidate) => candidate.id === exp.id);
                              if (!nextExperiment) return;
                              nextExperiment.designTaskId = createdTask.id;
                              nextExperiment.designTaskName = createdTask.name || "Untitled Design Task";
                            });
                          }}
                        >
                          <span className="max-w-full whitespace-normal break-words text-left">Create Design Task</span>
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M4 10H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M11 5L16 10L11 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                  : null;

                const experimentExtraContent = isResultEditorExpanded ? (
                  <div className="space-y-2">
                    <textarea
                      value={resultValue}
                      onChange={(event) => updateExperimentResult(experimentMeta, event.target.value)}
                      onBlur={() => {
                        if (resultValue.trim() !== "") {
                          setResultEditorExpanded(exp.id, false);
                        }
                      }}
                      placeholder="What did you learn?"
                      className="w-full resize-none rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs text-sky-900 outline-none focus:border-sky-400"
                      rows={3}
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onFocus={(event) => event.stopPropagation()}
                    />
                    {typeof onUploadDataRequest === "function" && (
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-sky-300 bg-white px-2.5 py-1 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-50"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          onUploadDataRequest({ outcomeId, opportunityId: opp.id, solutionId: sol.id, experimentId: exp.id });
                        }}
                      >
                        Upload data
                      </button>
                    )}
                  </div>
                ) : hasResult ? (
                  <button
                    type="button"
                    className="w-full rounded-lg border border-sky-200 bg-white/80 px-3 py-2 text-left text-xs font-medium text-sky-900 transition-colors hover:bg-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      setResultEditorExpanded(exp.id, true);
                    }}
                    title="Click to edit result"
                  >
                    {resultValue}
                  </button>
                ) : null;

                const experimentFooterActions = !hasResult && !isResultEditorExpanded ? (
                  <button
                    type="button"
                    className="rounded-md border border-sky-500 px-2.5 py-1 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-50"
                    onClick={(event) => {
                      event.stopPropagation();
                      setResultEditorExpanded(exp.id, true);
                    }}
                  >
                    Add result
                  </button>
                ) : null;

                nodes.push(
                  renderNode(
                    experimentMeta,
                    exp.text,
                    expPlaceholder,
                    {
                      extraContent: experimentExtraContent,
                      footerActions: experimentFooterActions,
                      belowContent: experimentBelowContent,
                    }
                  )
                );

                const expPos = layout[exp.id] || { x: 40, y: 40 };

                const linkedDocuments = linkedDocumentsByOpportunity[exp.id] || [];

                if (linkedDocuments.length > 0) {
                  const isPopoverOpen = openDocsForOpportunityId === exp.id;
                  nodes.push(
                    <div
                      key={`doc-badge-wrap-${exp.id}`}
                      className="absolute"
                      ref={isPopoverOpen ? docsPopoverRef : null}
                      style={{
                        left: expPos.x + NODE_WIDTH - 42,
                        top: expPos.y + getNodeHeight(exp.id) - 14,
                        zIndex: 30,
                      }}
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
                        title="View linked research documents"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenDocsForOpportunityId((prev) => (prev === exp.id ? null : exp.id));
                        }}
                      >
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="M6 2.75h5.8L16.25 7.2V16a1.25 1.25 0 0 1-1.25 1.25h-9A1.25 1.25 0 0 1 4.75 16V4A1.25 1.25 0 0 1 6 2.75Z" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M11.75 2.75V7.25H16.25" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                        <span>{linkedDocuments.length}</span>
                      </button>

                      {isPopoverOpen && (
                        <div
                          className="absolute right-0 top-7 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Linked documents</p>
                          <ul className="max-h-40 overflow-y-auto pr-1">
                            {linkedDocuments.map((doc) => (
                              <li key={`${exp.id}-${doc.id}`} className="truncate py-0.5 text-xs text-slate-700" title={doc.name}>
                                {doc.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                }
              });
            });
            return nodes;
          })}
        </div>
      </div>

      {deleteConfirmMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirmMeta(null)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800">Delete this card?</h3>
            <p className="mt-2 text-sm text-slate-600">This will permanently remove the selected solution or experiment.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setDeleteConfirmMeta(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                onClick={() => {
                  deleteNodeByMeta(deleteConfirmMeta);
                  setDeleteConfirmMeta(null);
                  setHoveredTerminalEdgeKey(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
