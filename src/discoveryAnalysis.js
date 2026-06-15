export const DISCOVERY_EVIDENCE_FIELDS = ["col_dk", "col_se", "col_proto", "col_b2b"];

const EVIDENCE_FIELD_ALIASES = {
  col_dk: ["col_dk", "dkEvidence", "dk", "denmarkEvidence", "denmarkQuote", "dkQuote", "dkPriorPortal"],
  col_se: ["col_se", "seEvidence", "se", "swedenEvidence", "swedenQuote", "seQuote", "mitt3Evidence", "mitt3"],
  col_proto: ["col_proto", "prototypeEvidence", "protoEvidence", "prototype", "prototypeQuote", "proto", "testEvidence"],
  col_b2b: ["col_b2b", "b2bEvidence", "b2b", "adminPortalEvidence", "adminPortalQuote", "b2bQuote", "businessPortalEvidence"],
};

const EVIDENCE_CONTAINER_KEYS = ["evidence", "quotes", "evidenceByColumn", "evidenceColumns"];

const trimString = (value) => String(value || "").trim();

const pickFirstNonEmptyString = (candidateValues = []) => {
  for (const value of candidateValues) {
    if (Array.isArray(value)) {
      const normalizedArray = value
        .map((entry) => trimString(entry))
        .filter(Boolean);
      if (normalizedArray.length > 0) return normalizedArray.join("\n\n");
      continue;
    }

    if (value && typeof value === "object") {
      const nested = pickFirstNonEmptyString([
        value.text,
        value.quote,
        value.summary,
        value.content,
        value.notes,
        value.value,
      ]);
      if (nested) return nested;
      continue;
    }

    const normalized = trimString(value);
    if (normalized) return normalized;
  }
  return "";
};

export const normalizeImpactValue = (value) => {
  const normalized = trimString(value);
  if (!normalized) return "";
  if (["High", "Medium", "Low"].includes(normalized)) return normalized;
  if (["high", "medium", "low"].includes(normalized.toLowerCase())) {
    return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1).toLowerCase()}`;
  }
  return "";
};

const getEvidenceValue = (item, fieldName) => {
  if (!item || typeof item !== "object") return "";

  const aliases = EVIDENCE_FIELD_ALIASES[fieldName] || [fieldName];
  const directCandidates = aliases.map((alias) => item?.[alias]);
  const nestedCandidates = EVIDENCE_CONTAINER_KEYS.flatMap((containerKey) => {
    const container = item?.[containerKey];
    if (!container || typeof container !== "object") return [];
    return aliases.map((alias) => container?.[alias]);
  });

  return pickFirstNonEmptyString([...directCandidates, ...nestedCandidates]);
};

export const normalizeDiscoveryOpportunityItem = (item, index = 0) => {
  if (typeof item === "string") {
    const text = item.trim();
    return {
      name: text,
      about: "",
      businessObjective: "",
      impact: "",
      fallbackName: `Opportunity ${index + 1}`,
      col_dk: "",
      col_se: "",
      col_proto: "",
      col_b2b: "",
    };
  }

  const name = pickFirstNonEmptyString([
    item?.name,
    item?.opportunity,
    item?.opportunityName,
    item?.title,
    item?.need,
    item?.painPoint,
    item?.problem,
  ]);
  const about = pickFirstNonEmptyString([
    item?.about,
    item?.description,
    item?.details,
    item?.context,
    item?.summary,
    item?.why,
  ]);
  // Business objectives are intentionally user-authored and should never be AI-populated.
  const businessObjective = "";
  const fallbackName = name
    ? ""
    : pickFirstNonEmptyString([
        about,
        businessObjective,
        item?.insight,
      ]) || `Opportunity ${index + 1}`;

  return {
    name,
    about,
    businessObjective,
    impact: normalizeImpactValue(item?.impact || item?.priority || item?.importance),
    fallbackName,
    col_dk: getEvidenceValue(item, "col_dk"),
    col_se: getEvidenceValue(item, "col_se"),
    col_proto: getEvidenceValue(item, "col_proto"),
    col_b2b: getEvidenceValue(item, "col_b2b"),
  };
};

export const createDiscoveryRowFromCandidate = (candidate, generateId) => ({
  id: generateId(),
  aiProvenance: candidate?.aiProvenance && typeof candidate.aiProvenance === "object"
    ? { ...candidate.aiProvenance }
    : undefined,
  cells: {
    col_opp: trimString(candidate?.name || candidate?.fallbackName),
    col_about: trimString(candidate?.about),
    col_impact: trimString(candidate?.impact),
    // Keep business objectives empty for user-provided business context.
    col_obj: "",
    col_rprio: "",
    col_iprio: "",
    col_diagram: "",
    col_dk: trimString(candidate?.col_dk),
    col_se: trimString(candidate?.col_se),
    col_proto: trimString(candidate?.col_proto),
    col_b2b: trimString(candidate?.col_b2b),
    col_sol_team: "",
    col_exp_team: "",
  },
});
