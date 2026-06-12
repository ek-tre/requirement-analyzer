import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import mammoth from "mammoth";

const BASE_PATH = import.meta.env.BASE_URL + "documents/";
const STORAGE_KEY = "documentSections";
const RESEARCH_DOCUMENTS_KEY = "researchDocuments";
const DOCUMENT_COMMENTS_KEY = "documentComments";
const DOCUMENT_COMMENT_AUTHOR_KEY = "documentCommentAuthorName";
const DEFAULT_RESEARCH_FOLDER_ID = "";
const DEFAULT_RESEARCH_FOLDER_NAME = "";
const UNLINKED_FOLDER_LABEL = "No folder linked";

function normalizeFolderId(rawValue) {
  const source = String(rawValue || "").trim().toLowerCase();
  const slug = source.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug ? `folder_${slug}` : "";
}

// Section definitions
const DEFAULT_DOCUMENT_SECTIONS = [
  { sectionNum: 1, key: "s1", label: "Interview", color: "light", borderColor: "border-l-slate-300" },
  { sectionNum: 2, key: "s2", label: "Portal Demo", color: "medium", borderColor: "border-l-slate-400" },
  { sectionNum: 3, key: "s3", label: "Prototype Test", color: "dark", borderColor: "border-l-slate-500" },
];

// Heuristic keywords for auto-detection
const SECTION2_KEYWORDS = [
  "admin portal", "go into the", "share my screen", "let me show",
  "log in to the portal", "current portal", "log into the",
  "show me how you", "screen share", "let me share", "share screen",
  "walk me through", "show us how", "open the portal",
];
const SECTION3_KEYWORDS = [
  "prototype", "new solution", "share the link", "figma",
  "new design", "user test", "look at the new", "early version",
  "test the new", "new portal", "redesign", "mock", "wireframe",
];

function normalizeDocumentSectionsConfig(rawConfig) {
  const defaultsBySectionNum = new Map(DEFAULT_DOCUMENT_SECTIONS.map((section) => [section.sectionNum, section]));
  if (!Array.isArray(rawConfig)) {
    return DEFAULT_DOCUMENT_SECTIONS.map((section, order) => ({ ...section, order }));
  }

  const normalized = [];
  const seen = new Set();

  rawConfig.forEach((entry, index) => {
    const sectionNum = Number(entry?.sectionNum);
    if (!Number.isInteger(sectionNum) || sectionNum < 1 || sectionNum > 3 || seen.has(sectionNum)) return;
    const base = defaultsBySectionNum.get(sectionNum);
    if (!base) return;

    seen.add(sectionNum);
    normalized.push({
      ...base,
      label: typeof entry?.label === "string" && entry.label.trim() ? entry.label.trim() : base.label,
      order: Number.isFinite(entry?.order) ? Number(entry.order) : index,
    });
  });

  DEFAULT_DOCUMENT_SECTIONS.forEach((base) => {
    if (seen.has(base.sectionNum)) return;
    normalized.push({ ...base, order: 100 + base.sectionNum });
  });

  return normalized
    .sort((a, b) => a.order - b.order)
    .map((section, order) => ({ ...section, order }));
}

function loadSections() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function saveSections(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadResearchDocuments() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESEARCH_DOCUMENTS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.map((doc) => {
      if (!doc || typeof doc !== "object") return doc;

      const opportunityIds = Array.isArray(doc.opportunityIds)
        ? doc.opportunityIds
        : (() => {
            const legacyId = typeof doc.opportunityId === "string" && doc.opportunityId ? doc.opportunityId : "";
            return legacyId ? [legacyId] : [];
          })();

      const folderId = typeof doc.folderId === "string" ? doc.folderId.trim() : "";
      const folderName = typeof doc.folderName === "string" ? doc.folderName.trim() : "";
      const normalizedFolderId = folderId || normalizeFolderId(folderName) || "";
      const normalizedFolderName = folderName || "";

      return {
        ...doc,
        opportunityIds,
        folderId: normalizedFolderId,
        folderName: normalizedFolderName,
      };
    });
  } catch {
    return [];
  }
}

function saveResearchDocuments(docs) {
  localStorage.setItem(RESEARCH_DOCUMENTS_KEY, JSON.stringify(docs));
}

function getTodayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDateInput(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function formatDateForDisplay(value) {
  if (!isValidDateInput(value)) return "";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function normalizeComment(rawComment) {
  if (!rawComment || typeof rawComment !== "object") return null;

  const authorName = (rawComment.authorName || rawComment.author || "").trim();
  const text = (rawComment.text || "").trim();
  const sourceDate = typeof rawComment.commentDate === "string"
    ? rawComment.commentDate
    : (typeof rawComment.createdAt === "string" ? rawComment.createdAt.slice(0, 10) : "");
  const commentDate = isValidDateInput(sourceDate) ? sourceDate : "";

  if (!authorName || !text || !commentDate) return null;

  return {
    id: typeof rawComment.id === "string" && rawComment.id
      ? rawComment.id
      : `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    authorName,
    text,
    commentDate,
    createdAt: typeof rawComment.createdAt === "string" && rawComment.createdAt
      ? rawComment.createdAt
      : new Date().toISOString(),
    updatedAt: typeof rawComment.updatedAt === "string" && rawComment.updatedAt
      ? rawComment.updatedAt
      : null,
  };
}

function loadDocumentComments() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DOCUMENT_COMMENTS_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const normalized = {};
    Object.entries(parsed).forEach(([docId, rawComments]) => {
      if (!Array.isArray(rawComments)) return;
      const comments = rawComments.map(normalizeComment).filter(Boolean);
      normalized[docId] = comments;
    });
    return normalized;
  } catch {
    return {};
  }
}

function saveDocumentComments(commentsByDocument) {
  localStorage.setItem(DOCUMENT_COMMENTS_KEY, JSON.stringify(commentsByDocument));
}

function loadRememberedCommentAuthor() {
  try {
    return (localStorage.getItem(DOCUMENT_COMMENT_AUTHOR_KEY) || "").trim();
  } catch {
    return "";
  }
}

function saveRememberedCommentAuthor(authorName) {
  localStorage.setItem(DOCUMENT_COMMENT_AUTHOR_KEY, (authorName || "").trim());
}

function createCommentDraft(authorName = loadRememberedCommentAuthor()) {
  return {
    authorName: (authorName || "").trim(),
    text: "",
    commentDate: getTodayDateInputValue(),
  };
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainTextToHtml(text) {
  const normalized = (text || "").replace(/\r\n/g, "\n");
  const blocks = normalized.split("\n\n").map((part) => part.trim()).filter(Boolean);
  if (blocks.length === 0) return "<p></p>";
  return blocks
    .map((block) => `<p>${escapeHtml(block).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function parseHtmlToParagraphs(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const elements = doc.body.children;
  const paragraphs = [];
  for (let i = 0; i < elements.length; i++) {
    paragraphs.push(elements[i].outerHTML);
  }
  return paragraphs;
}

function extractText(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

function detectSections(paragraphs) {
  let section2Start = null;
  let section3Start = null;

  // Skip the first ~15 paragraphs for section 2 detection (intro/greetings)
  const minSection2Start = Math.min(15, Math.floor(paragraphs.length * 0.1));
  const minSection3Start = (idx) => idx + 10; // Section 3 must be at least 10 paragraphs after section 2

  for (let i = minSection2Start; i < paragraphs.length; i++) {
    const text = extractText(paragraphs[i]).toLowerCase();
    if (section2Start === null) {
      for (const kw of SECTION2_KEYWORDS) {
        if (text.includes(kw)) { section2Start = i; break; }
      }
    }
    if (section2Start !== null && section3Start === null && i >= minSection3Start(section2Start)) {
      for (const kw of SECTION3_KEYWORDS) {
        if (text.includes(kw)) { section3Start = i; break; }
      }
    }
    if (section2Start !== null && section3Start !== null) break;
  }

  return { section2Start, section3Start };
}

function getSectionForParagraph(idx, boundaries) {
  const { section2Start, section3Start } = boundaries;
  if (section3Start !== null && idx >= section3Start) return 3;
  if (section2Start !== null && idx >= section2Start) return 2;
  return 1;
}

export default function DocumentsSection({
  opportunities = [],
  onResearchDocumentsChange,
  openDocumentId = null,
  onOpenDocumentHandled,
  sectionConfig,
  onSectionConfigChange,
  linkedFolderId = "",
  linkedFolderName = "",
  availableFolders = [],
  onLinkFolderChange,
  onDeleteResearchFolder,
}) {
  const [researchDocuments, setResearchDocuments] = useState(loadResearchDocuments);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docContent, setDocContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMarket, setFilterMarket] = useState("all");
  const [sections, setSections] = useState(loadSections);
  const [contextMenu, setContextMenu] = useState(null); // { idx, x, y }
  const [uploadDraft, setUploadDraft] = useState(null);
  const [uploadCommentError, setUploadCommentError] = useState("");
  const [opportunitySearch, setOpportunitySearch] = useState("");
  const [documentComments, setDocumentComments] = useState(loadDocumentComments);
  const [viewerCommentDraft, setViewerCommentDraft] = useState(() => createCommentDraft());
  const [viewerCommentError, setViewerCommentError] = useState("");
  const [sectionEditorOpen, setSectionEditorOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [deleteDialog, setDeleteDialog] = useState(null);
  const readerRef = useRef(null);
  const sectionRefs = useRef({});
  const uploadInputRef = useRef(null);
  const resolvedSectionConfig = useMemo(
    () => normalizeDocumentSectionsConfig(sectionConfig),
    [sectionConfig]
  );
  const sectionByNum = useMemo(
    () => new Map(resolvedSectionConfig.map((section) => [section.sectionNum, section])),
    [resolvedSectionConfig]
  );

  const resolvedLinkedFolderId =
    (typeof linkedFolderId === "string" && linkedFolderId.trim()) || "";
  const resolvedLinkedFolderName =
    (typeof linkedFolderName === "string" && linkedFolderName.trim()) || "";

  const folderOptions = useMemo(() => {
    const byId = new Map();

    (availableFolders || []).forEach((folder) => {
      const id = typeof folder?.id === "string" ? folder.id.trim() : "";
      const name = typeof folder?.name === "string" ? folder.name.trim() : "";
      if (!id) return;
      byId.set(id, { id, name: name || "Untitled folder" });
    });

    (researchDocuments || []).forEach((doc) => {
      if (!doc || typeof doc !== "object") return;
      const id = typeof doc.folderId === "string" ? doc.folderId.trim() : "";
      const name = typeof doc.folderName === "string" ? doc.folderName.trim() : "";
      if (!id) return;
      if (!byId.has(id)) byId.set(id, { id, name: name || "Untitled folder" });
    });

    if (resolvedLinkedFolderId && !byId.has(resolvedLinkedFolderId)) {
      byId.set(resolvedLinkedFolderId, { id: resolvedLinkedFolderId, name: resolvedLinkedFolderName });
    }

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [availableFolders, researchDocuments, resolvedLinkedFolderId, resolvedLinkedFolderName]);

  const persistResearchDocuments = useCallback((nextDocs) => {
    setResearchDocuments(nextDocs);
    saveResearchDocuments(nextDocs);
    if (typeof onResearchDocumentsChange === "function") {
      onResearchDocumentsChange(nextDocs);
    }
  }, [onResearchDocumentsChange]);

  const persistDocumentComments = useCallback((nextCommentsByDocument) => {
    setDocumentComments(nextCommentsByDocument);
    saveDocumentComments(nextCommentsByDocument);
  }, []);

  useEffect(() => {
    const hasManifestDocs = (researchDocuments || []).some((doc) => doc?.source === "manifest");
    if (!hasManifestDocs) return;

    const keptDocuments = (researchDocuments || []).filter((doc) => doc?.source !== "manifest");
    const keptIds = new Set(keptDocuments.map((doc) => String(doc?.id || "").trim()).filter(Boolean));

    const nextComments = Object.entries(documentComments || {}).reduce((acc, [docId, comments]) => {
      if (keptIds.has(String(docId || "").trim())) {
        acc[docId] = comments;
      }
      return acc;
    }, {});

    persistResearchDocuments(keptDocuments);
    persistDocumentComments(nextComments);
  }, [researchDocuments, documentComments, persistResearchDocuments, persistDocumentComments]);

  useEffect(() => {
    const migrated = researchDocuments.map((doc) => {
      const opportunityIds = Array.isArray(doc.opportunityIds)
        ? doc.opportunityIds
        : (() => {
            const legacyId = typeof doc.opportunityId === "string" && doc.opportunityId ? doc.opportunityId : "";
            return legacyId ? [legacyId] : [];
          })();

      const folderId = typeof doc.folderId === "string" ? doc.folderId.trim() : "";
      const folderName = typeof doc.folderName === "string" ? doc.folderName.trim() : "";
      const normalizedFolderId = folderId || normalizeFolderId(folderName) || "";
      const normalizedFolderName = folderName || "";

      if (
        Array.isArray(doc.opportunityIds)
        && folderId
        && folderName
        && folderId === normalizedFolderId
      ) {
        return doc;
      }

      return {
        ...doc,
        opportunityIds,
        folderId: normalizedFolderId,
        folderName: normalizedFolderName,
      };
    });

    const changed = migrated.some((doc, idx) => doc !== researchDocuments[idx]);
    if (!changed) return;

    persistResearchDocuments(migrated);
  }, [researchDocuments, persistResearchDocuments]);

  useEffect(() => {
    // Normalize persisted comments once and re-save only when malformed data was present.
    const normalized = {};
    let changed = false;

    Object.entries(documentComments).forEach(([docId, rawComments]) => {
      if (!Array.isArray(rawComments)) {
        changed = true;
        normalized[docId] = [];
        return;
      }

      const normalizedComments = rawComments.map(normalizeComment).filter(Boolean);
      normalized[docId] = normalizedComments;
      if (normalizedComments.length !== rawComments.length) changed = true;
    });

    if (!changed) return;
    persistDocumentComments(normalized);
  }, [documentComments, persistDocumentComments]);

  const paragraphs = useMemo(() => {
    if (!docContent) return [];
    return parseHtmlToParagraphs(docContent);
  }, [docContent]);

  // Get or auto-detect boundaries for current doc
  const boundaries = useMemo(() => {
    if (!selectedDoc || paragraphs.length === 0) return { section2Start: null, section3Start: null };
    const stored = sections[selectedDoc.id];
    if (stored) return stored;
    // Auto-detect
    const detected = detectSections(paragraphs);
    return detected;
  }, [selectedDoc, paragraphs, sections]);

  const loadDocument = useCallback(async (doc) => {
    setSelectedDoc(doc);
    setContextMenu(null);

    if (doc.isUploaded) {
      setDocContent(plainTextToHtml(doc.content || ""));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(BASE_PATH + doc.filename);
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setDocContent(result.value);
    } catch (e) {
      setDocContent("<p class='text-red-500'>Failed to load document.</p>");
    }
    setLoading(false);
  }, []);

  const handleUploadFile = useCallback(async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".txt") && !lowerName.endsWith(".docx")) return;

    setUploading(true);
    try {
      let content = "";
      if (lowerName.endsWith(".txt")) {
        content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => reject(new Error("Failed to read .txt file"));
          reader.readAsText(file);
        });
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value || "";
      }

      const defaultName = file.name.replace(/\.[^/.]+$/, "") || file.name;
      setUploadDraft({
        name: defaultName,
        tag: "DK",
        opportunityIds: [],
        content,
        comments: [],
      });
      setUploadCommentError("");
      setOpportunitySearch("");
    } catch {
      // Keep this lightweight; errors are non-fatal for the page.
    } finally {
      setUploading(false);
    }
  }, []);

  const confirmUpload = useCallback(() => {
    if (!uploadDraft) return;
    if (!resolvedLinkedFolderId) {
      setUploadCommentError("Select or create a folder before adding documents.");
      return;
    }
    const trimmedName = (uploadDraft.name || "").trim();
    if (!trimmedName) return;

    const draftComments = Array.isArray(uploadDraft.comments) ? uploadDraft.comments : [];
    const normalizedDraftComments = draftComments.map(normalizeComment).filter(Boolean);
    if (normalizedDraftComments.length !== draftComments.length) {
      setUploadCommentError("Each comment must include author name, text, and a valid date.");
      return;
    }

    const newDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      tag: uploadDraft.tag || "Other",
      opportunityIds: Array.isArray(uploadDraft.opportunityIds) ? uploadDraft.opportunityIds : [],
      folderId: resolvedLinkedFolderId,
      folderName: resolvedLinkedFolderName,
      content: uploadDraft.content || "",
      uploadedAt: new Date().toISOString(),
    };

    const updated = [newDocument, ...researchDocuments];
    persistResearchDocuments(updated);
    if (normalizedDraftComments.length > 0) {
      persistDocumentComments({
        ...documentComments,
        [newDocument.id]: normalizedDraftComments,
      });
    }
    setUploadDraft(null);
    setUploadCommentError("");

    const listDoc = {
      id: newDocument.id,
      label: newDocument.name,
      company: newDocument.name,
      market: newDocument.tag,
      filename: "Uploaded",
      isUploaded: true,
      content: newDocument.content,
      opportunityIds: newDocument.opportunityIds,
      folderId: newDocument.folderId,
      folderName: newDocument.folderName,
    };
    setSelectedDoc(listDoc);
    setDocContent(plainTextToHtml(newDocument.content));
    setViewerCommentDraft(createCommentDraft());
    setViewerCommentError("");
    setOpportunitySearch("");
  }, [
    uploadDraft,
    researchDocuments,
    documentComments,
    persistResearchDocuments,
    persistDocumentComments,
    resolvedLinkedFolderId,
    resolvedLinkedFolderName,
  ]);

  const addUploadCommentDraft = useCallback(() => {
    setUploadDraft((prev) => {
      if (!prev) return prev;
      const currentComments = Array.isArray(prev.comments) ? prev.comments : [];
      return {
        ...prev,
        comments: [
          ...currentComments,
          {
            id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            ...createCommentDraft(),
          },
        ],
      };
    });
  }, []);

  const updateUploadCommentDraft = useCallback((commentId, field, value) => {
    setUploadDraft((prev) => {
      if (!prev) return prev;
      const currentComments = Array.isArray(prev.comments) ? prev.comments : [];
      return {
        ...prev,
        comments: currentComments.map((comment) => (
          comment.id === commentId ? { ...comment, [field]: value } : comment
        )),
      };
    });
    if (field === "authorName") {
      saveRememberedCommentAuthor(value);
    }
    setUploadCommentError("");
  }, []);

  const removeUploadCommentDraft = useCallback((commentId) => {
    setUploadDraft((prev) => {
      if (!prev) return prev;
      const currentComments = Array.isArray(prev.comments) ? prev.comments : [];
      return {
        ...prev,
        comments: currentComments.filter((comment) => comment.id !== commentId),
      };
    });
    setUploadCommentError("");
  }, []);

  const toggleOpportunityInDraft = useCallback((opportunityId) => {
    setUploadDraft((prev) => {
      if (!prev) return prev;
      const current = Array.isArray(prev.opportunityIds) ? prev.opportunityIds : [];
      const hasId = current.includes(opportunityId);
      return {
        ...prev,
        opportunityIds: hasId ? current.filter((id) => id !== opportunityId) : [...current, opportunityId],
      };
    });
  }, []);

  const opportunityNameById = useMemo(() => {
    const map = {};
    opportunities.forEach((opp) => {
      map[opp.id] = opp.text || "Untitled opportunity";
    });
    return map;
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    const term = opportunitySearch.trim().toLowerCase();
    if (!term) return opportunities;
    return opportunities.filter((opp) => (opp.text || "").toLowerCase().includes(term));
  }, [opportunities, opportunitySearch]);

  const commentsForSelectedDocument = useMemo(() => {
    if (!selectedDoc?.id) return [];
    const comments = documentComments[selectedDoc.id];
    return Array.isArray(comments) ? comments : [];
  }, [documentComments, selectedDoc]);

  useEffect(() => {
    setViewerCommentDraft({
      authorName: loadRememberedCommentAuthor(),
      text: "",
      commentDate: getTodayDateInputValue(),
    });
    setViewerCommentError("");
  }, [selectedDoc?.id]);

  const addViewerComment = useCallback(() => {
    if (!selectedDoc?.id) return;

    const normalized = normalizeComment({
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      authorName: viewerCommentDraft.authorName,
      text: viewerCommentDraft.text,
      commentDate: viewerCommentDraft.commentDate,
      createdAt: new Date().toISOString(),
    });

    if (!normalized) {
      setViewerCommentError("Author name, comment text, and date are required.");
      return;
    }

    const current = Array.isArray(documentComments[selectedDoc.id]) ? documentComments[selectedDoc.id] : [];
    persistDocumentComments({
      ...documentComments,
      [selectedDoc.id]: [normalized, ...current],
    });
    saveRememberedCommentAuthor(normalized.authorName);
    setViewerCommentDraft(createCommentDraft(normalized.authorName));
    setViewerCommentError("");
  }, [selectedDoc, viewerCommentDraft, documentComments, persistDocumentComments]);

  const removeViewerComment = useCallback((commentId) => {
    if (!selectedDoc?.id) return;
    const current = Array.isArray(documentComments[selectedDoc.id]) ? documentComments[selectedDoc.id] : [];
    persistDocumentComments({
      ...documentComments,
      [selectedDoc.id]: current.filter((comment) => comment.id !== commentId),
    });
  }, [selectedDoc, documentComments, persistDocumentComments]);

  const allDocuments = useMemo(() => {
    return researchDocuments.map((doc) => ({
      id: doc.id,
      label: doc.name,
      company: doc.name,
      market: doc.tag,
      filename: "Uploaded",
      isUploaded: true,
      content: doc.content,
      uploadedAt: doc.uploadedAt,
      folderId: doc.folderId || DEFAULT_RESEARCH_FOLDER_ID,
      folderName: doc.folderName || DEFAULT_RESEARCH_FOLDER_NAME,
      opportunityIds: Array.isArray(doc.opportunityIds)
        ? doc.opportunityIds
        : (doc.opportunityId ? [doc.opportunityId] : []),
    }));
  }, [researchDocuments]);

  const linkedFolderDocuments = useMemo(
    () => (
      resolvedLinkedFolderId
        ? allDocuments.filter((doc) => (doc.folderId || "") === resolvedLinkedFolderId)
        : []
    ),
    [allDocuments, resolvedLinkedFolderId]
  );

  useEffect(() => {
    if (!openDocumentId) return;

    const target = allDocuments.find((doc) => doc.id === openDocumentId);
    if (!target) {
      if (allDocuments.length > 0 && typeof onOpenDocumentHandled === "function") {
        onOpenDocumentHandled();
      }
      return;
    }

    loadDocument(target);
    if (typeof onOpenDocumentHandled === "function") {
      onOpenDocumentHandled();
    }
  }, [openDocumentId, allDocuments, loadDocument, onOpenDocumentHandled]);

  const setBoundary = useCallback((sectionNum, paragraphIdx) => {
    if (!selectedDoc) return;
    const current = sections[selectedDoc.id] || { ...boundaries };
    const updated = { ...current };
    if (sectionNum === 2) {
      updated.section2Start = paragraphIdx;
      // Ensure section3 is after section2
      if (updated.section3Start !== null && updated.section3Start <= paragraphIdx) {
        updated.section3Start = null;
      }
    } else if (sectionNum === 3) {
      updated.section3Start = paragraphIdx;
      // Ensure section2 is before section3
      if (updated.section2Start === null || updated.section2Start >= paragraphIdx) {
        updated.section2Start = Math.max(0, paragraphIdx - 1);
      }
    }
    const newSections = { ...sections, [selectedDoc.id]: updated };
    setSections(newSections);
    saveSections(newSections);
    setContextMenu(null);
  }, [selectedDoc, sections, boundaries]);

  const handleParagraphClick = useCallback((e, idx) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ idx, x: rect.right + 8, y: rect.top });
  }, []);

  const scrollToSection = useCallback((sectionNum) => {
    const el = sectionRefs.current[sectionNum];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const filteredDocs = linkedFolderDocuments.filter((d) => {
    if (filterMarket !== "all" && d.market !== filterMarket) return false;
    const label = (d.label || "").toLowerCase();
    const company = (d.company || "").toLowerCase();
    if (searchTerm && !label.includes(searchTerm.toLowerCase()) && !company.includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const markets = [...new Set(linkedFolderDocuments.map((d) => d.market).filter(Boolean))];

  useEffect(() => {
    if (!selectedDoc?.id) return;
    const stillVisible = linkedFolderDocuments.some((doc) => doc.id === selectedDoc.id);
    if (stillVisible) return;
    setSelectedDoc(null);
    setDocContent("");
  }, [linkedFolderDocuments, selectedDoc]);

  const hasSections = boundaries.section2Start !== null || boundaries.section3Start !== null;
  const jumpSections = useMemo(
    () => resolvedSectionConfig.filter((section) => {
      if (section.sectionNum === 1) return true;
      if (section.sectionNum === 2) return boundaries.section2Start !== null;
      if (section.sectionNum === 3) return boundaries.section3Start !== null;
      return false;
    }),
    [resolvedSectionConfig, boundaries]
  );

  const updateSectionLabel = useCallback((sectionNum, nextLabel) => {
    if (typeof onSectionConfigChange !== "function") return;
    const nextConfig = resolvedSectionConfig.map((section) => (
      section.sectionNum === sectionNum
        ? { ...section, label: nextLabel }
        : section
    ));
    onSectionConfigChange(nextConfig);
  }, [resolvedSectionConfig, onSectionConfigChange]);

  const moveSection = useCallback((index, direction) => {
    if (typeof onSectionConfigChange !== "function") return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= resolvedSectionConfig.length) return;

    const nextConfig = [...resolvedSectionConfig];
    const [moved] = nextConfig.splice(index, 1);
    nextConfig.splice(targetIndex, 0, moved);
    onSectionConfigChange(nextConfig.map((section, order) => ({ ...section, order })));
  }, [resolvedSectionConfig, onSectionConfigChange]);

  const resetSectionConfig = useCallback(() => {
    if (typeof onSectionConfigChange !== "function") return;
    onSectionConfigChange(DEFAULT_DOCUMENT_SECTIONS.map((section, order) => ({ ...section, order })));
  }, [onSectionConfigChange]);

  const handleFolderSelection = useCallback((nextFolderId) => {
    if (typeof onLinkFolderChange !== "function") return;
    if (!nextFolderId) {
      onLinkFolderChange({ id: "", name: "" });
      return;
    }
    const selected = folderOptions.find((folder) => folder.id === nextFolderId)
      || folderOptions[0]
      || { id: "", name: "" };
    onLinkFolderChange(selected);
  }, [onLinkFolderChange, folderOptions]);

  const handleCreateFolder = useCallback(() => {
    if (typeof onLinkFolderChange !== "function") return;
    const name = String(newFolderName || "").trim();
    if (!name) return;
    const id = normalizeFolderId(name) || `folder_${Date.now()}`;
    onLinkFolderChange({ id, name });
    setNewFolderName("");
  }, [newFolderName, onLinkFolderChange]);

  const executeDocumentDelete = useCallback((documentId) => {
    const nextDocuments = (researchDocuments || []).filter((doc) => String(doc?.id || "") !== String(documentId || ""));
    persistResearchDocuments(nextDocuments);

    if (documentComments && Object.prototype.hasOwnProperty.call(documentComments, documentId)) {
      const nextComments = { ...documentComments };
      delete nextComments[documentId];
      persistDocumentComments(nextComments);
    }

    if (selectedDoc?.id === documentId) {
      setSelectedDoc(null);
      setDocContent("");
    }
  }, [researchDocuments, persistResearchDocuments, documentComments, persistDocumentComments, selectedDoc]);

  const handleDeleteDocument = useCallback((documentId) => {
    const targetDoc = (researchDocuments || []).find((doc) => String(doc?.id || "") === String(documentId || ""));
    if (!targetDoc) return;

    const docName = String(targetDoc?.name || "Untitled document").trim() || "Untitled document";
    const commentCount = Array.isArray(documentComments?.[documentId]) ? documentComments[documentId].length : 0;

    setDeleteDialog({
      type: "document",
      title: "Delete document",
      description: `Delete "${docName}"? This cannot be undone.`,
      docName,
      documentId,
      documentCount: 1,
      commentCount,
      confirmLabel: "Delete document",
    });
  }, [researchDocuments, documentComments]);

  const executeFolderDelete = useCallback((folderId, docsInFolder) => {
    const folderDocIds = new Set(docsInFolder.map((doc) => String(doc?.id || "").trim()).filter(Boolean));

    const nextDocuments = (researchDocuments || []).filter((doc) => {
      const docFolderId = typeof doc?.folderId === "string" ? doc.folderId.trim() : "";
      return (docFolderId || DEFAULT_RESEARCH_FOLDER_ID) !== folderId;
    });
    persistResearchDocuments(nextDocuments);

    const nextComments = Object.entries(documentComments || {}).reduce((acc, [docId, comments]) => {
      if (!folderDocIds.has(String(docId || "").trim())) {
        acc[docId] = comments;
      }
      return acc;
    }, {});
    persistDocumentComments(nextComments);

    if (selectedDoc?.id && folderDocIds.has(String(selectedDoc.id || "").trim())) {
      setSelectedDoc(null);
      setDocContent("");
    }

    if (typeof onDeleteResearchFolder === "function") {
      onDeleteResearchFolder(folderId);
    }

    if (typeof onLinkFolderChange === "function") {
      onLinkFolderChange({ id: "", name: "" });
    }
  }, [
    researchDocuments,
    persistResearchDocuments,
    documentComments,
    persistDocumentComments,
    selectedDoc,
    onDeleteResearchFolder,
    onLinkFolderChange,
  ]);

  const handleDeleteLinkedFolder = useCallback(() => {
    const folderId = String(resolvedLinkedFolderId || "").trim();
    if (!folderId) return;

    const docsInFolder = (researchDocuments || []).filter((doc) => {
      const docFolderId = typeof doc?.folderId === "string" ? doc.folderId.trim() : "";
      return (docFolderId || DEFAULT_RESEARCH_FOLDER_ID) === folderId;
    });

    const commentCount = docsInFolder.reduce((sum, doc) => {
      const docId = String(doc?.id || "").trim();
      const count = Array.isArray(documentComments?.[docId]) ? documentComments[docId].length : 0;
      return sum + count;
    }, 0);

    setDeleteDialog({
      type: "folder",
      title: "Delete linked folder",
      description: `Delete folder "${resolvedLinkedFolderName}"? This cannot be undone.`,
      folderId,
      folderName: resolvedLinkedFolderName,
      docsInFolder,
      documentCount: docsInFolder.length,
      commentCount,
      confirmLabel: "Delete folder",
    });
  }, [resolvedLinkedFolderId, resolvedLinkedFolderName, researchDocuments, documentComments]);

  const confirmDeleteDialog = useCallback(() => {
    if (!deleteDialog) return;

    if (deleteDialog.type === "document") {
      executeDocumentDelete(deleteDialog.documentId);
    }

    if (deleteDialog.type === "folder") {
      executeFolderDelete(deleteDialog.folderId, Array.isArray(deleteDialog.docsInFolder) ? deleteDialog.docsInFolder : []);
    }

    setDeleteDialog(null);
  }, [deleteDialog, executeDocumentDelete, executeFolderDelete]);

  // Build rendered content with section dividers
  const renderContent = () => {
    if (paragraphs.length === 0) return null;
    const items = [];
    let lastSection = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const currentSection = getSectionForParagraph(i, boundaries);

      // Insert section divider when section changes
      if (currentSection !== lastSection) {
        const sectionDef = sectionByNum.get(currentSection) || DEFAULT_DOCUMENT_SECTIONS[currentSection - 1];
        const anchorId = `${selectedDoc.id}-s${currentSection}`;
        const label = sectionDef?.label || `Section ${currentSection}`;
        const bgColors = { light: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700", medium: "bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-600", dark: "bg-slate-200 dark:bg-slate-800/80 border-slate-400 dark:border-slate-500" };
        items.push(
          <div
            key={`divider-${currentSection}`}
            id={anchorId}
            ref={(el) => { sectionRefs.current[currentSection] = el; }}
            className={`flex items-center gap-2 px-3 py-2 my-3 rounded-md border ${bgColors[sectionDef.color]}`}
          >
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">§{currentSection}</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
            <span className="ml-auto text-[9px] text-slate-400">¶{i}</span>
          </div>
        );
        lastSection = currentSection;
      }

      // Render paragraph with section color coding
      const sectionDef = sectionByNum.get(currentSection) || DEFAULT_DOCUMENT_SECTIONS[currentSection - 1];
      items.push(
        <div
          key={`p-${i}`}
          className={`border-l-2 ${sectionDef.borderColor} pl-3 py-0.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group relative`}
          onClick={(e) => handleParagraphClick(e, i)}
        >
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed [&_p]:mb-0 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1 [&_table]:text-xs"
            dangerouslySetInnerHTML={{ __html: paragraphs[i] }}
          />
          <span className="absolute right-1 top-1 text-[8px] text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">¶{i}</span>
        </div>
      );
    }

    return items;
  };

  return (
    <div className="flex flex-col h-full">
      {uploadDraft && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setUploadDraft(null)}>
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Add Research Document</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Document name</label>
                <input
                  type="text"
                  value={uploadDraft.name}
                  onChange={(e) => setUploadDraft((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Country / region</label>
                <select
                  value={uploadDraft.tag}
                  onChange={(e) => setUploadDraft((prev) => ({ ...prev, tag: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="DK">DK</option>
                  <option value="SE">SE</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Opportunity tags</label>
                <input
                  type="text"
                  value={opportunitySearch}
                  onChange={(e) => setOpportunitySearch(e.target.value)}
                  placeholder="Search opportunities..."
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <div className="mt-2 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-md p-2 space-y-1">
                  {filteredOpportunities.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No matching opportunities</p>
                  ) : (
                    filteredOpportunities.map((opp) => {
                      const selected = (uploadDraft.opportunityIds || []).includes(opp.id);
                      return (
                        <label key={opp.id} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleOpportunityInDraft(opp.id)}
                            className="mt-0.5"
                          />
                          <span>{opp.text || "Untitled opportunity"}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                {(uploadDraft.opportunityIds || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {uploadDraft.opportunityIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleOpportunityInDraft(id)}
                        className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        title="Remove tag"
                      >
                        {opportunityNameById[id] || "Unknown"} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Comments</label>
                  <button
                    type="button"
                    onClick={addUploadCommentDraft}
                    className="px-2 py-1 text-[10px] border border-slate-200 dark:border-slate-600 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Add comment
                  </button>
                </div>

                {(uploadDraft.comments || []).length === 0 ? (
                  <p className="text-[11px] text-slate-400">No comments added yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(uploadDraft.comments || []).map((comment) => (
                      <div key={comment.id} className="rounded-md border border-slate-200 dark:border-slate-600 p-2 space-y-2">
                        <div className="flex flex-col gap-2 items-start">
                          <input
                            type="date"
                            value={comment.commentDate || ""}
                            disabled
                            className="w-[12ch] px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={comment.authorName || ""}
                            onChange={(e) => updateUploadCommentDraft(comment.id, "authorName", e.target.value)}
                            placeholder="Your name"
                            className="w-full max-w-[68ch] px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                          />
                        </div>
                        <textarea
                          value={comment.text || ""}
                          onChange={(e) => updateUploadCommentDraft(comment.id, "text", e.target.value)}
                          rows={2}
                          placeholder="Comment context"
                          className="w-full max-w-[68ch] px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeUploadCommentDraft(comment.id)}
                            className="px-2 py-1 text-[10px] border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {uploadCommentError && (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{uploadCommentError}</p>
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
              <button
                onClick={() => setUploadDraft(null)}
                className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                className="px-3 py-1.5 text-xs rounded-md bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDialog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleteDialog(null)}>
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-rose-200 dark:border-rose-700">
              <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">{deleteDialog.title}</h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-700 dark:text-slate-200">{deleteDialog.description}</p>
              <div className="rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 p-3 space-y-1">
                <p className="text-xs text-slate-700 dark:text-slate-200">
                  Documents to delete: <span className="font-semibold">{deleteDialog.documentCount}</span>
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-200">
                  Comments to delete: <span className="font-semibold">{deleteDialog.commentCount}</span>
                </p>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDialog}
                className="px-3 py-1.5 text-xs rounded-md bg-rose-600 text-white hover:bg-rose-700"
              >
                {deleteDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={uploadInputRef}
        type="file"
        accept=".docx,.txt"
        onChange={handleUploadFile}
        className="hidden"
      />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Research Data</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Interview transcripts and research source material.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Linked folder: <span className="font-semibold text-slate-700 dark:text-slate-200">{resolvedLinkedFolderName || UNLINKED_FOLDER_LABEL}</span>
          </p>
        </div>
        <button
          onClick={() => uploadInputRef.current?.click()}
          disabled={uploading || !resolvedLinkedFolderId}
          className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
        >
          {uploading ? "Parsing..." : "Upload"}
        </button>
      </div>

      <div className="mb-4 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={resolvedLinkedFolderId}
            onChange={(e) => handleFolderSelection(e.target.value)}
            className="min-w-[14rem] px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">No folder linked</option>
            {folderOptions.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Create new folder"
            className="min-w-[12rem] px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="button"
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
            className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
          >
            Create + link
          </button>
          <button
            type="button"
            onClick={handleDeleteLinkedFolder}
            disabled={!resolvedLinkedFolderId}
            className="px-2.5 py-1.5 text-xs font-medium border border-rose-300 dark:border-rose-700 rounded-md text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-60"
          >
            Delete linked folder
          </button>
        </div>
        {!resolvedLinkedFolderId && (
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">No folder is linked to this project. Select or create a folder to view and upload research documents.</p>
        )}
        {resolvedLinkedFolderId && linkedFolderDocuments.length === 0 && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">No documents are linked to this project folder yet. Upload transcripts before running AI analysis.</p>
        )}
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Document list sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <select
              value={filterMarket}
              onChange={(e) => setFilterMarket(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="all">All</option>
              {markets.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
            {filteredDocs.map((doc) => {
              const docSections = sections[doc.id];
              const hasStored = docSections && (docSections.section2Start !== null || docSections.section3Start !== null);
              return (
                <div
                  key={doc.id}
                  className={`w-full px-3 py-2.5 text-xs border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors group ${
                    selectedDoc?.id === doc.id
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => loadDocument(doc)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[2.25rem] rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-500 dark:text-slate-300 shrink-0">
                          {doc.market || "N/A"}
                        </span>
                        <span className="truncate block">{doc.company || doc.label}</span>
                        {(documentComments[doc.id] || []).length > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-medium shrink-0">
                            {(documentComments[doc.id] || []).length}
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="shrink-0 px-1.5 py-0.5 text-[10px] border border-rose-200 dark:border-rose-700 rounded text-rose-600 dark:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete document"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredDocs.length === 0 && (
              <p className="px-3 py-4 text-xs text-slate-400 text-center">No documents found</p>
            )}
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500">{linkedFolderDocuments.length} documents in this folder</p>
        </div>

        {/* Document reader */}
        <div ref={readerRef} className="flex-1 min-w-0 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-y-auto relative">
          {!selectedDoc ? (
            <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm">
              Select a document to read
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm">
              Loading...
            </div>
          ) : (
            <div className="p-6">
              {/* Document header with section jump buttons */}
              <div className="mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedDoc.label}</h3>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{selectedDoc.filename}</span>
                    {Array.isArray(selectedDoc.opportunityIds) && selectedDoc.opportunityIds.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedDoc.opportunityIds.map((id) => (
                          <span key={id} className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {opportunityNameById[id] || "Tagged opportunity"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {(hasSections || typeof onSectionConfigChange === "function") && (
                    <div className="flex gap-1">
                      {jumpSections.map((section) => (
                        <button
                          key={section.sectionNum}
                          onClick={() => scrollToSection(section.sectionNum)}
                          className="px-2 py-1 text-[10px] font-medium rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title={`Jump to ${section.label} section`}
                        >
                          {`§${section.sectionNum}`}
                        </button>
                      ))}
                      {typeof onSectionConfigChange === "function" && (
                        <button
                          type="button"
                          onClick={() => setSectionEditorOpen((prev) => !prev)}
                          className="px-2 py-1 text-[10px] font-medium rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Edit section labels and order"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {sectionEditorOpen && typeof onSectionConfigChange === "function" && (
                  <div className="mt-3 p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 space-y-2">
                    {resolvedSectionConfig.map((section, index) => (
                      <div key={section.sectionNum} className="flex items-center gap-2">
                        <span className="w-6 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{`§${section.sectionNum}`}</span>
                        <input
                          type="text"
                          value={section.label}
                          onChange={(e) => updateSectionLabel(section.sectionNum, e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <button
                          type="button"
                          onClick={() => moveSection(index, -1)}
                          disabled={index === 0}
                          className="px-2 py-1 text-[10px] border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-300 disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(index, 1)}
                          disabled={index === resolvedSectionConfig.length - 1}
                          className="px-2 py-1 text-[10px] border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-300 disabled:opacity-40"
                        >
                          ↓
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={resetSectionConfig}
                        className="px-2 py-1 text-[10px] border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        Reset defaults
                      </button>
                    </div>
                  </div>
                )}
                {!hasSections && paragraphs.length > 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">⚠ No section boundaries detected — click any paragraph to set them</p>
                )}
              </div>

              <div className="mb-4 pb-3 border-b border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Comments</h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {commentsForSelectedDocument.length} total
                  </span>
                </div>

                <div className="flex flex-col gap-2 items-start">
                  <input
                    type="date"
                    value={viewerCommentDraft.commentDate}
                    disabled
                    className="w-[12ch] px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={viewerCommentDraft.authorName}
                    onChange={(e) => {
                      saveRememberedCommentAuthor(e.target.value);
                      setViewerCommentDraft((prev) => ({ ...prev, authorName: e.target.value }));
                      setViewerCommentError("");
                    }}
                    placeholder="Your name"
                    className="w-full max-w-[68ch] px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <textarea
                  value={viewerCommentDraft.text}
                  onChange={(e) => {
                    setViewerCommentDraft((prev) => ({ ...prev, text: e.target.value }));
                    setViewerCommentError("");
                  }}
                  rows={3}
                  placeholder="Add context for this document"
                  className="w-full max-w-[68ch] px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addViewerComment}
                    disabled={
                      !viewerCommentDraft.authorName.trim()
                      || !viewerCommentDraft.text.trim()
                      || !isValidDateInput(viewerCommentDraft.commentDate)
                    }
                    className="px-3 py-1.5 text-xs rounded-md bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 hover:opacity-90"
                  >
                    Add comment
                  </button>
                </div>
                {viewerCommentError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">{viewerCommentError}</p>
                )}

                {commentsForSelectedDocument.length === 0 ? (
                  <p className="text-[11px] text-slate-400">No comments yet for this document.</p>
                ) : (
                  <div className="space-y-2">
                    {commentsForSelectedDocument.map((comment) => (
                      <div key={comment.id} className="rounded-md border border-slate-200 dark:border-slate-600 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{comment.authorName}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDateForDisplay(comment.commentDate)}</span>
                            <button
                              type="button"
                              onClick={() => removeViewerComment(comment.id)}
                              className="px-2 py-1 text-[10px] border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rendered paragraphs with section dividers */}
              <div className="space-y-0.5">
                {renderContent()}
              </div>
            </div>
          )}

          {/* Context menu for setting section boundaries */}
          {contextMenu && (
            <div
              className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg py-1 min-w-[180px]"
              style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: contextMenu.y }}
            >
              <div className="px-3 py-1 text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-700">
                Paragraph ¶{contextMenu.idx}
              </div>
              {resolvedSectionConfig
                .filter((section) => section.sectionNum > 1)
                .map((section) => {
                  const colorClass = section.sectionNum === 2
                    ? "text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                    : "text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30";
                  return (
                    <button
                      key={section.sectionNum}
                      onClick={() => setBoundary(section.sectionNum, contextMenu.idx)}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${colorClass}`}
                    >
                      {`Set as §${section.sectionNum} start (${section.label})`}
                    </button>
                  );
                })}
              <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                <button
                  onClick={() => setContextMenu(null)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close context menu when clicking outside */}
      {contextMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
      )}
    </div>
  );
}
