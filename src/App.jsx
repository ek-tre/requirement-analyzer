/**
 * WCAG 2.1 AA Accessibility Guidelines
 * 
 * This application follows WCAG 2.1 Level AA standards:
 * 
 * 1. Text Size: Minimum 14px (text-sm) for body text, with 16px preferred
 * 2. Touch Targets: Interactive elements minimum 44x44px (py-2.5+ for buttons)
 * 3. Color Contrast: 
 *    - Normal text: 4.5:1 minimum (slate-600+ on white)
 *    - Large text (18px+): 3:1 minimum (slate-500+ on white)
 * 4. Focus Indicators: Visible focus rings (ring-2, ring-slate-400+)
 * 5. Border Contrast: Borders minimum 3:1 against background (slate-300+ on white)
 * 
 * Color usage:
 * - Use slate-600/700 for primary text (not slate-400/500 for body text)
 * - Use border-slate-300+ for visible borders (not slate-100/200 for important dividers)
 * - Links should have 4.5:1 contrast (blue-600+) and underline for identification
 * 
 * UI Guidelines:
 * - Always use simple vector SVG icons (not emojis) for consistency across platforms
 * - See AudioIcon, FolderIcon, TextIcon components as examples
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";

// --- Encryption Utilities for Secure localStorage ---
// Uses Web Crypto API to encrypt sensitive data at rest

const ENCRYPTION_KEY_NAME = "req_analyzer_key_v1";
const ENCRYPTION_SALT = "requirement-analyzer-secure-2026"; // In production, use unique per-installation salt

// Generate or retrieve encryption key
const getEncryptionKey = async () => {
  // For automatic encryption, we derive a key from a constant
  // For password-protected mode, replace this with PBKDF2 from user password
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_SALT),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("secure-telco-mode"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// Encrypt data
const encryptData = async (data) => {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(data)
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64 for localStorage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Encryption failed:", error);
    return data; // Fallback to unencrypted if encryption fails
  }
};

// Decrypt data
const decryptData = async (encryptedData) => {
  try {
    const key = await getEncryptionKey();
    const decoder = new TextDecoder();
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    // If decryption fails, might be old unencrypted data
    return encryptedData;
  }
};

// Secure localStorage wrapper
const secureStorage = {
  async setItem(key, value) {
    const encrypted = await encryptData(value);
    localStorage.setItem(key, encrypted);
  },
  
  async getItem(key) {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    return await decryptData(encrypted);
  },
  
  removeItem(key) {
    localStorage.removeItem(key);
  }
};

const generateId = () => Math.random().toString(36).slice(2, 10);

// Translation dictionaries
const TRANSLATIONS = {
  en: {
    sections: {
      overview: "Overview",
      problem: "Problem & Purpose",
      context: "User Context",
      assumptions: "Assumptions",
      edges: "Edge Cases",
      scope: "Scope & Versions",
      questions: "Open Questions",
      notes: "Notes",
      summary: "Summary",
      mapping: "Mapping"
    },
    fields: {
      featureName: "Feature Name",
      date: "Date",
      stakeholders: "Stakeholders / Source",
      origin: "Requirement Origin",
      targetVersion: "Target Version",
      description: "Brief Description",
      problem: "What problem does this solve?",
      who: "Who experiences this problem?",
      outcome: "What's the desired business outcome?",
      metrics: "How will we measure success?",
      ifNotBuilt: "What happens if we don't build this?",
      segments: "Target user segment(s)",
      workflow: "Current workflow",
      workarounds: "Existing workarounds",
      triggers: "What triggers the need?",
      beforeAfter: "What happens before and after?",
      confidence: "Overall Confidence",
      concerns: "Key Concerns or Risks",
      nextSteps: "Next Steps"
    }
  },
  da: {
    sections: {
      overview: "Oversigt",
      problem: "Problem & Formål",
      context: "Brugerkontekst",
      assumptions: "Antagelser",
      edges: "Særtilfælde",
      scope: "Omfang & Versioner",
      questions: "Åbne Spørgsmål",
      notes: "Noter",
      summary: "Opsummering",
      mapping: "Kortlægning"
    },
    fields: {
      featureName: "Funktionsnavn",
      date: "Dato",
      stakeholders: "Interessenter / Kilde",
      origin: "Kravenes Oprindelse",
      targetVersion: "Målversion",
      description: "Kort Beskrivelse",
      problem: "Hvilket problem løser dette?",
      who: "Hvem oplever dette problem?",
      outcome: "Hvad er det ønskede forretningsmæssige resultat?",
      metrics: "Hvordan vil vi måle succes?",
      ifNotBuilt: "Hvad sker der, hvis vi ikke bygger dette?",
      segments: "Målbrugergruppe(r)",
      workflow: "Nuværende arbejdsgang",
      workarounds: "Eksisterende løsninger",
      triggers: "Hvad udløser behovet?",
      beforeAfter: "Hvad sker der før og efter?",
      confidence: "Samlet Tillid",
      concerns: "Nøglebekymringer eller Risici",
      nextSteps: "Næste Skridt"
    }
  },
  sv: {
    sections: {
      overview: "Översikt",
      problem: "Problem & Syfte",
      context: "Användarkontext",
      assumptions: "Antaganden",
      edges: "Specialfall",
      scope: "Omfattning & Versioner",
      questions: "Öppna Frågor",
      notes: "Anteckningar",
      summary: "Sammanfattning",
      mapping: "Kartläggning"
    },
    fields: {
      featureName: "Funktionsnamn",
      date: "Datum",
      stakeholders: "Intressenter / Källa",
      origin: "Kravursprung",
      targetVersion: "Målversion",
      description: "Kort Beskrivning",
      problem: "Vilket problem löser detta?",
      who: "Vem upplever detta problem?",
      outcome: "Vad är det önskade affärsresultatet?",
      metrics: "Hur ska vi mäta framgång?",
      ifNotBuilt: "Vad händer om vi inte bygger detta?",
      segments: "Målanvändargrupp(er)",
      workflow: "Nuvarande arbetsflöde",
      workarounds: "Befintliga lösningar",
      triggers: "Vad utlöser behovet?",
      beforeAfter: "Vad händer före och efter?",
      confidence: "Övergripande Förtroende",
      concerns: "Viktiga Bekymmer eller Risker",
      nextSteps: "Nästa Steg"
    }
  }
};

const SECTIONS = [
  { id: "overview", label: "Overview", icon: "◉" },
  { id: "problem", label: "Problem & Purpose", icon: "◎" },
  { id: "context", label: "User Context", icon: "◈" },
  { id: "assumptions", label: "Assumptions", icon: "◇" },
  { id: "edges", label: "Edge Cases", icon: "◆" },
  { id: "scope", label: "Scope & Versions", icon: "◫" },
  { id: "questions", label: "Open Questions", icon: "◻" },
  { id: "notes", label: "Notes", icon: "◐" },
  { id: "mapping", label: "Mapping", icon: "◱" },
  { id: "summary", label: "Summary", icon: "◼" },
];

const ORIGIN_OPTIONS = [
  "User Research", "Business Metric", "Competitor Analysis",
  "Stakeholder Request", "Technical Debt", "Legal", "Other",
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

const createBlankAnalysis = (name = "Untitled Design Task") => ({
  id: generateId(),
  name,
  phase: "",
  gistId: "",
  jiraTicket: "",
  secureMode: false,
  language: "en",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  overview: { featureName: "", date: "", requestor: "", description: "", origin: "", originOther: "" },
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
  actions: [],
  mapping: { figmaUrl: "https://embed.figma.com/board/JiPxw8hWqRLsTs2cpUFU7O/Figjam-Concept?node-id=378-61&embed-host=share" },
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
    jiraTicket: analysis.jiraTicket ?? "",
    secureMode: analysis.secureMode ?? false,
    language: analysis.language ?? "en",
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

// Audio analysis functions
let mediaRecorder = null;
let audioChunks = [];
let recognition = null;

const startAudioRecording = async (onTranscript) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        onTranscript(finalTranscript, interimTranscript);
      };

      recognition.start();
    }

    mediaRecorder.start();
    return true;
  } catch (error) {
    console.error("Error starting recording:", error);
    return false;
  }
};

const stopAudioRecording = () => {
  return new Promise((resolve) => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        resolve(audioBlob);
      };
      mediaRecorder.stop();
    } else {
      resolve(null);
    }

    if (recognition) {
      recognition.stop();
      recognition = null;
    }
  });
};

const analyzeWithGitHub = async (transcript, githubAIKey) => {
  if (!githubAIKey) return null;
  
  try {
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${githubAIKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'system',
          content: 'You are a UX/product design assistant. Analyze the transcript and extract information into these sections: problem (what problem and why it matters), context (user context and personas), assumptions (unvalidated assumptions), edges (edge cases), scope (in/out of scope), questions (open questions), actions (requirement analysis action items like "Interview users", "Review analytics", "Create wireframes" - NOT development/implementation tasks), notes (additional notes). Return as compact JSON with section keys and string values. Be concise.'
        }, {
          role: 'user',
          content: transcript
        }],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) throw new Error('GitHub API error');
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Try to parse as JSON, fallback to text
    try {
      return JSON.parse(content);
    } catch {
      return { notes: content };
    }
  } catch (error) {
    console.error('Failed to analyze with GitHub:', error);
    return null;
  }
};

const analyzeImage = async (imageBase64, githubAIKey) => {
  if (!githubAIKey) {
    return {
      notes: 'Image uploaded but no AI token provided.',
      _fallback: true,
      _reason: 'No GitHub token provided'
    };
  }
  
  try {
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${githubAIKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'system',
          content: 'You are analyzing images (screenshots of Jira tickets, requirements docs, wireframes, designs, emails, etc). Extract structured information and return ONLY a valid JSON object (no markdown, no code blocks, no explanation). Use these fields (omit if not found): featureName (short title), date (any date mentioned), requestor (who requested/stakeholders), origin (one of: User Research, Business Metric, Competitor Analysis, Stakeholder Request, Technical Debt, Legal, Other), description (brief summary), problem (problem statement), who (target users), outcome (business outcome), segments (user segments), workflow (current workflow), assumptions (array of strings), questions (array of strings), actions (array of requirement analysis tasks like "Schedule user interview", "Review competitor solutions", "Create user flow", NOT implementation/development tasks), notes (array of additional points). Return raw JSON only.'
        }, {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this image and extract all relevant requirement information.' },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }],
        temperature: 0.5,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API returned ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Strip markdown code blocks if present
    content = content.trim();
    
    if (content.startsWith('```')) {
      const match = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match) {
        content = match[1].trim();
      }
    }
    
    content = content.replace(/^`+|`+$/g, '').trim();
    
    try {
      const parsed = JSON.parse(content);
      console.log('Successfully parsed AI image response:', parsed);
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError, 'Content:', content);
      return { 
        notes: 'Failed to parse AI response. Raw content:\n\n' + content,
        _fallback: true,
        _reason: 'JSON parsing failed: ' + parseError.message
      };
    }
  } catch (error) {
    console.error('Failed to analyze image:', error);
    return {
      notes: 'Image analysis failed: ' + error.message,
      _fallback: true,
      _reason: error.message || 'API request failed'
    };
  }
};

// Extract text from PDF file
const extractTextFromPDF = async (file) => {
  try {
    // Dynamically import PDF.js only when needed
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configure worker using dynamic import for Vite bundling
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Failed to extract text from PDF:', error);
    throw new Error('Failed to read PDF file: ' + error.message);
  }
};

const analyzePastedText = async (text, githubAIKey) => {
  if (!githubAIKey) {
    // Fallback without AI: add to notes as bullet points
    return {
      notes: text.split('\n').filter(line => line.trim()).map(line => `• ${line.trim()}`).join('\n'),
      _fallback: true,
      _reason: 'No GitHub token provided'
    };
  }
  
  try {
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${githubAIKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'system',
          content: 'You are analyzing pasted text (like Jira tickets, requirements docs, emails, etc). Extract structured information and return ONLY a valid JSON object (no markdown, no code blocks, no explanation). Use these fields (omit if not found): featureName (short title), date (any date mentioned), requestor (who requested/stakeholders), origin (one of: User Research, Business Metric, Competitor Analysis, Stakeholder Request, Technical Debt, Legal, Other), description (brief summary), problem (problem statement), who (target users), outcome (business outcome), segments (user segments), workflow (current workflow), assumptions (array of strings), questions (array of strings), actions (array of requirement analysis tasks like "Schedule user interview", "Review competitor solutions", "Create user flow", NOT implementation/development tasks), notes (array of additional points). Return raw JSON only.'
        }, {
          role: 'user',
          content: text
        }],
        temperature: 0.5,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API returned ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Strip markdown code blocks if present (try multiple patterns)
    content = content.trim();
    
    // Remove ```json ... ``` blocks
    if (content.startsWith('```')) {
      const match = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match) {
        content = match[1].trim();
      }
    }
    
    // Remove any remaining backticks
    content = content.replace(/^`+|`+$/g, '').trim();
    
    try {
      const parsed = JSON.parse(content);
      console.log('Successfully parsed AI response:', parsed);
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError, 'Content:', content);
      return { 
        notes: 'Failed to parse AI response. Raw content:\n\n' + content,
        _fallback: true,
        _reason: 'JSON parsing failed: ' + parseError.message
      };
    }
  } catch (error) {
    console.error('Failed to analyze pasted text:', error);
    // Fallback: add to notes
    return {
      notes: text.split('\n').filter(line => line.trim()).map(line => `• ${line.trim()}`).join('\n'),
      _fallback: true,
      _reason: error.message || 'API request failed'
    };
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
  total++; if ((analysis.actions || []).length > 0) filled++;
  Object.values(analysis.summary).forEach(check);
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

function getTaskCount(analysis) {
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
  total++; if ((analysis.actions || []).length > 0) filled++;
  Object.values(analysis.summary).forEach(check);
  return { filled, total };
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
    case "actions": total = 1; if ((analysis.actions || []).length > 0) filled = 1; break;
    case "mapping": 
      total = 1; 
      if (analysis.mapping?.figmaUrl?.trim()) filled = 1; 
      break;
    case "notes": check(analysis.notes); break;
    case "summary": Object.values(analysis.summary).forEach(check); break;
  }
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

function exportToMarkdown(a) {
  if (!a) return "No analysis selected.";
  
  const lines = [];
  const h = (t) => lines.push(`\n## ${t}`);
  const f = (label, val) => { if (val?.trim()) lines.push(`**${label}:** ${val}`); };
  lines.push(`# ${a.name || "Untitled Design Task"}`);
  lines.push(`*Created: ${new Date(a.createdAt).toLocaleDateString()}*`);
  if (a.phase) lines.push(`*Target Phase: ${a.phase}*`);
  if (a.jiraTicket) lines.push(`*JIRA Ticket: ${a.jiraTicket}*`);

  h("Overview");
  f("Feature", a.overview?.featureName); f("Date", a.overview?.date);
  f("Stakeholders", a.overview?.requestor); 
  f("Origin", a.overview?.origin === "Other" && a.overview?.originOther ? `Other: ${a.overview.originOther}` : a.overview?.origin);
  if (a.overview?.description) lines.push(`\n${a.overview.description}`);

  h("Problem & Purpose");
  f("Problem", a.problem?.problem); f("Who", a.problem?.who);
  f("Business Outcome", a.problem?.outcome); f("Success Metrics", a.problem?.metrics);
  f("If Not Built", a.problem?.ifNotBuilt);

  h("User Context");
  f("Target Segments", a.context?.segments); f("Current Workflow", a.context?.workflow);
  f("Workarounds", a.context?.workarounds); f("Triggers", a.context?.triggers);
  f("Before/After", a.context?.beforeAfter);

  h("Assumptions");
  if (!a.assumptions || a.assumptions.length === 0) lines.push("*No assumptions logged yet.*");
  else a.assumptions.forEach((item, i) => lines.push(`${i + 1}. [${item.status}] ${item.text}`));

  h("Edge Cases");
  EDGE_CASE_ITEMS.forEach((ec) => {
    const d = a.edges?.[ec.id];
    if (d?.considered) lines.push(`- [x] **${ec.label}**${d.notes ? `: ${d.notes}` : ""}`);
    else lines.push(`- [ ] ${ec.label}`);
  });

  h("Scope & Versions");
  f("Affected Features", a.scope?.affected); f("New Patterns Needed", a.scope?.newPatterns);
  f("Technical Constraints", a.scope?.technical);
  if (a.scope?.items && a.scope.items.length > 0) {
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
  if (!a.questions || a.questions.length === 0) lines.push("*No questions logged yet.*");
  else a.questions.forEach((q, i) => {
    const status = q.status === "Answered" ? "Y" : "?";
    lines.push(`${i + 1}. [${status}] (${q.type}) ${q.text}`);
    if (q.answer?.trim()) lines.push(`   - ${q.answer}`);
  });

  h("Action Items");
  if (!a.actions || a.actions.length === 0) lines.push("*No actions logged yet.*");
  else a.actions.forEach((item, i) => lines.push(`${i + 1}. [${item.completed ? "X" : " "}] ${item.text}`));

  h("Mapping");
  if (a.mapping?.figmaUrl) {
    lines.push(`Figma Embed: ${a.mapping.figmaUrl}`);
  } else {
    lines.push("*No mapping URL set.*");
  }

  h("Notes");
  if (a.notes?.trim()) lines.push(a.notes);
  else lines.push("*No notes.*");

  h("Summary");
  f("Confidence", a.summary?.confidence); f("Key Concerns", a.summary?.concerns);
  f("Next Steps", a.summary?.nextSteps);
  return lines.join("\n");
}

// Import from Markdown
function importFromMarkdown(markdown) {
  const lines = markdown.split("\n");
  const analysis = createBlankAnalysis();
  
  let currentSection = "";
  let buffer = [];
  
  const parseField = (line) => {
    const match = line.match(/\*\*([^:]+):\*\*\s*(.+)/);
    return match ? { label: match[1].trim(), value: match[2].trim() } : null;
  };
  
  const processSection = () => {
    const content = buffer.join("\n").trim();
    
    switch(currentSection) {
      case "Overview":
        buffer.forEach(line => {
          const field = parseField(line);
          if (!field) {
            if (line && !line.startsWith("**") && analysis.overview.description === "") {
              analysis.overview.description = content.split("\n").filter(l => !l.startsWith("**")).join("\n").trim();
            }
            return;
          }
          if (field.label === "Feature") analysis.overview.featureName = field.value;
          if (field.label === "Date") analysis.overview.date = field.value;
          if (field.label === "Stakeholders") analysis.overview.requestor = field.value;
          if (field.label === "Origin") {
            // Check if it's "Other: something"
            if (field.value.startsWith("Other: ")) {
              analysis.overview.origin = "Other";
              analysis.overview.originOther = field.value.substring(7);
            } else {
              analysis.overview.origin = field.value;
            }
          }
        });
        break;
        
      case "Problem & Purpose":
        buffer.forEach(line => {
          const field = parseField(line);
          if (!field) return;
          if (field.label === "Problem") analysis.problem.problem = field.value;
          if (field.label === "Who") analysis.problem.who = field.value;
          if (field.label === "Business Outcome") analysis.problem.outcome = field.value;
          if (field.label === "Success Metrics") analysis.problem.metrics = field.value;
          if (field.label === "If Not Built") analysis.problem.ifNotBuilt = field.value;
        });
        break;
        
      case "User Context":
        buffer.forEach(line => {
          const field = parseField(line);
          if (!field) return;
          if (field.label === "Target Segments") analysis.context.segments = field.value;
          if (field.label === "Current Workflow") analysis.context.workflow = field.value;
          if (field.label === "Workarounds") analysis.context.workarounds = field.value;
          if (field.label === "Triggers") analysis.context.triggers = field.value;
          if (field.label === "Before/After") analysis.context.beforeAfter = field.value;
        });
        break;
        
      case "Assumptions":
        buffer.forEach(line => {
          const match = line.match(/^\d+\.\s*\[([^\]]+)\]\s*(.+)/);
          if (match) {
            analysis.assumptions.push({
              id: generateId(),
              text: match[2].trim(),
              status: match[1].trim()
            });
          }
        });
        break;
        
      case "Design actions":  // Legacy support for old exports
      case "Action Items":
        buffer.forEach(line => {
          const match = line.match(/^\d+\.\s*\[([^\]]+)\]\s*(.+)/);
          if (match) {
            analysis.actions.push({
              id: generateId(),
              text: match[2].trim(),
              completed: match[1].trim() === "X",
              note: ""
            });
          }
        });
        break;
        
      case "Open Questions":
        buffer.forEach(line => {
          const match = line.match(/^\d+\.\s*\[([^\]]+)\]\s*\(([^)]+)\)\s*(.+)/);
          if (match) {
            analysis.questions.push({
              id: generateId(),
              text: match[3].trim(),
              type: match[2].trim(),
              status: match[1].trim() === "Y" ? "Answered" : "Open",
              answer: ""
            });
          }
        });
        break;
        
      case "Mapping":
        const figmaMatch = content.match(/Figma Embed:\s*(.+)/);
        if (figmaMatch) {
          analysis.mapping = { figmaUrl: figmaMatch[1].trim() };
        }
        break;
        
      case "Notes":
        if (content && !content.includes("*No notes.*")) {
          analysis.notes = content;
        }
        break;
        
      case "Summary":
        buffer.forEach(line => {
          const field = parseField(line);
          if (!field) return;
          if (field.label === "Confidence") analysis.summary.confidence = field.value;
          if (field.label === "Key Concerns") analysis.summary.concerns = field.value;
          if (field.label === "Next Steps") analysis.summary.nextSteps = field.value;
        });
        break;
    }
    
    buffer = [];
  };
  
  lines.forEach((line, index) => {
    // Extract title from first line
    if (index === 0 && line.startsWith("# ")) {
      analysis.name = line.substring(2).trim();
      return;
    }
    
    // Extract phase
    if (line.startsWith("*Target Phase:")) {
      const match = line.match(/\*Target Phase:\s*([^*]+)\*/);
      if (match) analysis.phase = match[1].trim();
      return;
    }
    
    // Extract JIRA ticket
    if (line.startsWith("*JIRA Ticket:")) {
      const match = line.match(/\*JIRA Ticket:\s*([^*]+)\*/);
      if (match) analysis.jiraTicket = match[1].trim();
      return;
    }
    
    // Section headers
    if (line.startsWith("## ")) {
      if (currentSection) processSection();
      currentSection = line.substring(3).trim();
      return;
    }
    
    // Skip empty lines at start of section
    if (!buffer.length && !line.trim()) return;
    
    // Add to buffer
    if (line.trim()) {
      buffer.push(line);
    }
  });
  
  // Process final section
  if (currentSection) processSection();
  
  return analysis;
}

// --- UI Components ---

const Field = ({ label, hint, placeholder, value, onChange, multiline = false, rows = 3 }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
    {hint && <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">{hint}</p>}
    {multiline ? (
      <textarea
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500 focus:border-slate-400 dark:focus:border-slate-500 resize-y bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
        rows={rows} value={value || ""} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <input
        type="text"
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500 focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
        value={value || ""} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )}
  </div>
);

const Select = ({ label, hint, value, options, onChange, allowEmpty = true }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
    {hint && <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">{hint}</p>}
    <select
      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500 focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
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
      active ? "bg-slate-800 dark:bg-slate-600 text-white font-medium" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
    }`}
  >
    <span>{children}</span>
    {count !== undefined && count > 0 && (
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
        active ? "bg-slate-600 dark:bg-slate-700 text-slate-200" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
      }`}>
        {count}
      </span>
    )}
  </button>
);

const SectionHeader = ({ title, description }) => (
  <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h2>
    {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
  </div>
);

// --- Section Components ---

const OverviewSection = ({ data, phase, jiraTicket, secureMode, language, audioModalOpen, pasteModalOpen, onChange, onPhaseChange, onJiraTicketChange, onSecureModeChange, onLanguageChange, onOpenAudioModal, onOpenPasteModal }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  
  return (
  <div>
    <SectionHeader title={t.sections.overview} description="Basic information about the feature requirement." />
    
    {/* Language Selector */}
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Task Language</label>
      <div className="flex gap-2">
        {['en', 'da', 'sv'].map((lang) => (
          <button
            key={lang}
            onClick={() => onLanguageChange(lang)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              language === lang
                ? "bg-slate-800 dark:bg-slate-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            }`}
          >
            {lang === 'en' ? 'English' : lang === 'da' ? 'Dansk' : 'Svenska'}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Choose the language for section titles and field labels in this task</p>
    </div>
    
    {/* Secure Mode & AI Features */}
    <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Secure Mode</label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enable encryption and disable external services for sensitive data</p>
        </div>
        <button
          onClick={() => onSecureModeChange(!secureMode)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            secureMode
              ? "bg-emerald-600 dark:bg-emerald-700 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600"
              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {secureMode ? "ON" : "OFF"}
        </button>
      </div>
      
      {/* AI Analysis Buttons - Only visible when secure mode is OFF */}
      {!secureMode && (
        <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onOpenAudioModal}
            className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Audio Analysis
          </button>
          <button
            onClick={onOpenPasteModal}
            className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Text Analysis
          </button>
        </div>
      )}
      
      {secureMode && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-3 border-t border-slate-200 dark:border-slate-700">
          ✓ Data encrypted • External services disabled • GitHub sync hidden
        </p>
      )}
    </div>
    
    <Field label="JIRA Ticket" value={jiraTicket} onChange={onJiraTicketChange} placeholder="e.g., PROJ-123" />
    <div className="grid grid-cols-2 gap-4">
      <Field label={t.fields.featureName} value={data.featureName} onChange={(v) => onChange({ ...data, featureName: v })} />
      <Field label={t.fields.date} value={data.date} onChange={(v) => onChange({ ...data, date: v })} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Field label={t.fields.stakeholders} value={data.requestor} onChange={(v) => onChange({ ...data, requestor: v })} />
      <Select label={t.fields.origin} value={data.origin} options={ORIGIN_OPTIONS} onChange={(v) => onChange({ ...data, origin: v })} />
    </div>
    {data.origin === "Other" && (
      <Field label="Specify Other Origin" value={data.originOther} onChange={(v) => onChange({ ...data, originOther: v })} />
    )}
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.fields.targetVersion}</label>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Which release phase is this analysis targeting?</p>
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
    <Field label={t.fields.description} hint="What is this feature in one or two sentences?" multiline value={data.description} onChange={(v) => onChange({ ...data, description: v })} />
  </div>
  );
};

const ProblemSection = ({ data, language, onChange }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  return (
  <div>
    <SectionHeader title={t.sections.problem} description="Understand the why before the what." />
    <Field label={t.fields.problem} multiline hint="Be specific. Vague problems lead to vague solutions." value={data.problem} onChange={(v) => onChange({ ...data, problem: v })} />
    <Field label={t.fields.who} multiline hint="Which users, how often, and in what circumstances?" value={data.who} onChange={(v) => onChange({ ...data, who: v })} />
    <Field label={t.fields.outcome} multiline value={data.outcome} onChange={(v) => onChange({ ...data, outcome: v })} />
    <Field label={t.fields.metrics} multiline hint="If stakeholders can't define this, the requirement isn't ready." value={data.metrics} onChange={(v) => onChange({ ...data, metrics: v })} />
    <Field label={t.fields.ifNotBuilt} multiline hint="Helps gauge urgency and priority." value={data.ifNotBuilt} onChange={(v) => onChange({ ...data, ifNotBuilt: v })} />
  </div>
  );
};

const UserContextSection = ({ data, language, onChange }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  return (
  <div>
    <SectionHeader title={t.sections.context} description="Map the who, when, and current reality." />
    <Field label={t.fields.segments} multiline value={data.segments} onChange={(v) => onChange({ ...data, segments: v })} />
    <Field label={t.fields.workflow} multiline hint="What does the user do today without this feature?" value={data.workflow} onChange={(v) => onChange({ ...data, workflow: v })} />
    <Field label={t.fields.workarounds} multiline hint="If there's no workaround, question whether the problem is real. If there is, study it — your solution must beat it." value={data.workarounds} onChange={(v) => onChange({ ...data, workarounds: v })} />
    <Field label={t.fields.triggers} multiline hint="What moment or event causes the user to want this?" value={data.triggers} onChange={(v) => onChange({ ...data, triggers: v })} />
    <Field label={t.fields.beforeAfter} multiline hint="The surrounding flow shapes constraints on your design." value={data.beforeAfter} onChange={(v) => onChange({ ...data, beforeAfter: v })} />
  </div>
  );
};

const AssumptionsSection = ({ data, language, onChange }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
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
      <SectionHeader title={t.sections.assumptions} description="Every requirement carries hidden assumptions. Name them so you can validate or flag them." />
      {data.length > 0 && (
        <div className="flex items-center justify-end mb-4">
          <div className="flex gap-1">
            <button
              onClick={() => setStatusFilter("Open")}
              className={`px-2 py-1 text-xs rounded ${
                statusFilter === "Open" ? "bg-slate-800 dark:bg-slate-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter("Answered")}
              className={`px-2 py-1 text-xs rounded ${
                statusFilter === "Answered" ? "bg-slate-800 dark:bg-slate-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              Answered
            </button>
          </div>
        </div>
      )}
      {data.length === 0 && (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm border border-dashed border-slate-200 dark:border-slate-600 rounded-lg mb-4">
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
            <button onClick={() => removeItem(item.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500 text-lg mt-1.5 px-1">×</button>
          </div>
        ))}
      </div>
      <button onClick={addItem} className="text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-dashed border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
        + Add assumption
      </button>
    </div>
  );
};

const EdgeCasesSection = ({ data, language, onChange }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const toggle = (id) => onChange({ ...data, [id]: { ...data[id], considered: !data[id].considered } });
  const setNotes = (id, notes) => onChange({ ...data, [id]: { ...data[id], notes } });
  const consideredCount = Object.values(data).filter((e) => e.considered).length;

  return (
    <div>
      <SectionHeader title={t.sections.edges} description="Requirements almost never cover these. They're where most design complexity lives." />
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
                  {d.considered && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
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

const ScopeSection = ({ data, language, onChange }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
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
      <SectionHeader title={t.sections.scope} description="Break the feature into scope items and assign each to a release version." />

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

        <button onClick={addItem} className="text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-dashed border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
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

const QuestionsSection = ({ data, language, onChange }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
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
    <div key={item.id} className={`p-3 rounded-lg border ${
      item.status === "Answered" 
        ? "bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600" 
        : "bg-amber-50/30 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/40"
    }`}>
      <div className="flex gap-2 items-start">
        {showNumber && <span className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-mono w-5 shrink-0">{index + 1}</span>}
        <div className="flex-1 space-y-2">
          <textarea
            ref={textareaRef}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-500 resize-none overflow-hidden"
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
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={item.dependency || false}
                onChange={(e) => updateItem(item.id, "dependency", e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 focus:ring-slate-300 dark:focus:ring-slate-500"
              />
              Dependency
            </label>
            {item.dependency && (
              <select
                className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                value={QUESTION_TYPES.includes(item.type) ? item.type : ""}
                onChange={(e) => updateItem(item.id, "type", e.target.value)}
              >
                {!QUESTION_TYPES.includes(item.type) && <option value="">Select type...</option>}
                {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <select
              className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              value={item.status} onChange={(e) => updateItem(item.id, "status", e.target.value)}
            >
              {QUESTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={(item.tags || []).includes("B2B")}
                onChange={(e) => {
                  const tags = item.tags || [];
                  updateItem(item.id, "tags", e.target.checked ? [...tags.filter(t => t !== "B2B"), "B2B"] : tags.filter(t => t !== "B2B"));
                }}
                className="rounded border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 focus:ring-slate-300 dark:focus:ring-slate-500"
              />
              B2B
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={(item.tags || []).includes("B2C")}
                onChange={(e) => {
                  const tags = item.tags || [];
                  updateItem(item.id, "tags", e.target.checked ? [...tags.filter(t => t !== "B2C"), "B2C"] : tags.filter(t => t !== "B2C"));
                }}
                className="rounded border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 focus:ring-slate-300 dark:focus:ring-slate-500"
              />
              B2C
            </label>
          </div>
          {item.status === "Answered" && (
            <textarea
              ref={textareaRef}
              className="w-full px-2 py-1.5 text-sm border border-emerald-200 dark:border-emerald-800 rounded bg-emerald-50 dark:bg-emerald-900/20 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-300 dark:focus:ring-emerald-700 resize-none overflow-hidden"
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
        <button onClick={() => removeItem(item.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500 text-lg mt-1 px-1">×</button>
      </div>
    </div>
  );

  return (
    <div>
      <SectionHeader title={t.sections.questions} description="What you don't know. Surface these early — they're your blocker list." />
      {data.length > 0 && (
        <div className="flex items-center justify-end mb-4">
          <div className="flex gap-1">
            <button
              onClick={() => setStatusFilter("Open")}
              className={`px-2 py-1 text-xs rounded ${
                statusFilter === "Open" ? "bg-slate-800 dark:bg-slate-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter("Answered")}
              className={`px-2 py-1 text-xs rounded ${
                statusFilter === "Answered" ? "bg-slate-800 dark:bg-slate-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              Answered
            </button>
          </div>
        </div>
      )}
      {data.length === 0 && (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm border border-dashed border-slate-200 dark:border-slate-600 rounded-lg mb-4">
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
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mt-6">{type}</h3>
              {items.map((item) => renderQuestion(item, 0, false))}
            </div>
          );
        })}
      </div>
      <button onClick={addItem} className="text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-dashed border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
        + Add question
      </button>
    </div>
  );
};

const ActionsSection = ({ data, onChange }) => {
  const [statusFilter, setStatusFilter] = useState("To Do");
  const [expandedNotes, setExpandedNotes] = useState({});
  const addItem = () => onChange([...data, { id: generateId(), text: "", completed: false, note: "" }]);
  const updateItem = (id, field, val) =>
    onChange(data.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  const removeItem = (id) => onChange(data.filter((item) => item.id !== id));
  const toggleNote = (id) => setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));

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

  const completedCount = data.filter(item => item.completed).length;
  const filteredData = statusFilter === "To Do" 
    ? data.filter(item => !item.completed)
    : data.filter(item => item.completed);

  return (
    <div>
      {data.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{completedCount} of {data.length} completed</p>
          <div className="flex gap-1">
            <button
              onClick={() => setStatusFilter("To Do")}
              className={`px-2 py-1 text-xs rounded ${
                statusFilter === "To Do" ? "bg-slate-800 dark:bg-slate-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              To Do
            </button>
            <button
              onClick={() => setStatusFilter("Done")}
              className={`px-2 py-1 text-xs rounded ${
                statusFilter === "Done" ? "bg-slate-800 dark:bg-slate-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              Done
            </button>
          </div>
        </div>
      )}
      {data.length === 0 && (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm border border-dashed border-slate-200 dark:border-slate-600 rounded-lg mb-4">
          No action items yet. Add tasks below.
        </div>
      )}
      <div className="space-y-2 mb-4">
        {filteredData.map((item) => (
          <div key={item.id} className={`rounded-lg ${item.completed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'}`}>
            <div className="flex gap-3 items-start p-3">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={(e) => updateItem(item.id, "completed", e.target.checked)}
                className={`w-5 h-5 mt-1 rounded focus:ring-2 shrink-0 ${item.completed ? 'border-green-400 dark:border-green-500 text-green-600 dark:text-green-500 focus:ring-green-400 dark:focus:ring-green-500' : 'border-slate-300 dark:border-slate-500 text-slate-800 dark:text-slate-200 focus:ring-slate-400 dark:focus:ring-slate-500'}`}
              />
              <div className="flex-1 min-w-0">
                <textarea
                  ref={textareaRef}
                  className={`w-full text-sm border-none bg-transparent focus:outline-none resize-none overflow-hidden ${item.completed ? 'text-green-700 dark:text-green-400' : 'text-slate-900 dark:text-slate-100'}`}
                  style={{ minHeight: "24px" }}
                  placeholder="Describe the action..."
                  value={item.text}
                  onChange={(e) => {
                    updateItem(item.id, "text", e.target.value);
                    autoResize(e);
                  }}
                  onInput={autoResize}
                  rows={1}
                />
                {expandedNotes[item.id] && (
                  <textarea
                    ref={textareaRef}
                    className="w-full mt-2 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500 resize-none overflow-hidden text-slate-900 dark:text-slate-100"
                    style={{ minHeight: "36px" }}
                    placeholder="Add a note or link..."
                    value={item.note || ""}
                    onChange={(e) => {
                      updateItem(item.id, "note", e.target.value);
                      autoResize(e);
                    }}
                    onInput={autoResize}
                    rows={1}
                  />
                )}
              </div>
              <div className="flex items-center gap-1">
                {item.completed && (
                  <button
                    onClick={() => toggleNote(item.id)}
                    className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-sm shrink-0"
                  >
                    {expandedNotes[item.id] ? '⌄' : '⌃'}
                  </button>
                )}
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500 text-lg shrink-0"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addItem} className="text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-50 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 hover:border-slate-400 dark:hover:border-slate-500 transition-colors font-medium">
        + Add Action
      </button>
    </div>
  );
};

const NotesSection = ({ data, language, onChange }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  return (
  <div>
    <SectionHeader title={t.sections.notes} description="Additional notes, observations, or reminders about this requirement." />
    <Field label="Notes" multiline hint="Use this space for any additional information that doesn't fit elsewhere." rows={10} value={data} onChange={onChange} />
  </div>
  );
};

const MappingSection = ({ data, language, onChange }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  return (
  <div>
    <SectionHeader title={t.sections.mapping} description="Visual mapping and conceptual diagrams for this requirement." />
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Figjam/Figma Embed URL</label>
      <input
        type="text"
        value={data.figmaUrl || ""}
        onChange={(e) => onChange({ ...data, figmaUrl: e.target.value })}
        placeholder="https://embed.figma.com/..."
        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Paste a Figjam or Figma embed URL to display your mapping board</p>
    </div>
    {data.figmaUrl && (
      <div className="-mx-6">
        <div className="border-t border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full" style={{ height: "calc(100vh - 280px)", minHeight: "600px" }}>
          <iframe
            style={{ border: "1px solid rgba(0, 0, 0, 0.1)" }}
            width="100%"
            height="100%"
            src={data.figmaUrl}
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>
    )}
  </div>
  );
};

const SummarySection = ({ data, language, onChange, onGenerateAIBrief }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  return (
  <div>
    <SectionHeader title={t.sections.summary} description="Your overall assessment and what needs to happen next." />
    <Select label={t.fields.confidence} hint="How ready is this requirement for design?" value={data.confidence} options={CONFIDENCE_LEVELS} onChange={(v) => onChange({ ...data, confidence: v })} />
    <Field label={t.fields.concerns} multiline hint="What worries you most about this requirement?" value={data.concerns} onChange={(v) => onChange({ ...data, concerns: v })} />
    <Field label={t.fields.nextSteps} multiline hint="What actions should happen before design work begins?" rows={4} value={data.nextSteps} onChange={(v) => onChange({ ...data, nextSteps: v })} />
    
    {/* AI Design Brief Button */}
    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
      <button
        onClick={onGenerateAIBrief}
        className="w-full px-4 py-3 text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 dark:from-purple-700 dark:to-blue-700 dark:hover:from-purple-800 dark:hover:to-blue-800 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Create Design Brief for AI
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
        Generates an AI-optimized design context file for tools like Claude, ChatGPT, or Copilot
      </p>
    </div>
  </div>
  );
};

// Audio Icon Component
const AudioIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

// Folder Icon Component
const FolderIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

// Text/Document Icon Component
const TextIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// Import Markdown Modal Component
const ImportMarkdownModal = ({ isOpen, onClose, onImportNew, onImportExisting, analysisName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-8" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Import Markdown</h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">×</button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
            Choose how to import this markdown file:
          </p>

          <div className="space-y-3">
            <button
              onClick={onImportNew}
              className="w-full px-4 py-3 text-left border-2 border-slate-200 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="font-medium text-slate-800 dark:text-slate-200 mb-1">Create New Task</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Import as a new design task</div>
            </button>

            <button
              onClick={onImportExisting}
              className="w-full px-4 py-3 text-left border-2 border-slate-200 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="font-medium text-slate-800 dark:text-slate-200 mb-1">Add to Current Task</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Merge with "{analysisName}"</div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Paste & Analyze Modal Component
const PasteAnalyzeModal = ({ 
  isOpen, 
  onClose, 
  pastedText, 
  onTextChange, 
  onAnalyze, 
  analyzing, 
  results,
  onApply,
  githubAIKey,
  onSetGitHubAIKey,
  onDeleteField,
  pastedImage,
  onImageChange,
  onImageAnalyze,
  pastedPdf,
  onPdfChange,
  onPdfAnalyze,
  activeAnalysis,
  mergeModes,
  onSetMergeMode
}) => {
  const [activeTab, setActiveTab] = useState('text');
  
  if (!isOpen) return null;

  const hasResults = results && Object.keys(results).length > 0;
  
  // Helper to get existing content for a field
  const getExistingContent = (fieldName) => {
    console.log('[PASTE MODAL] getExistingContent called:', fieldName);
    console.log('[PASTE MODAL] activeAnalysis:', activeAnalysis);
    
    if (!activeAnalysis) {
      console.log('[PASTE MODAL] No activeAnalysis!');
      return '';
    }
    
    console.log('[PASTE MODAL] activeAnalysis.overview:', activeAnalysis.overview);
    console.log('[PASTE MODAL] activeAnalysis.problem:', activeAnalysis.problem);
    
    // Map field names to analysis structure
    if (fieldName === 'featureName') {
      const value = activeAnalysis.overview?.featureName || '';
      console.log('[PASTE MODAL] featureName value:', value);
      return value;
    }
    if (fieldName === 'date') return activeAnalysis.overview?.date || '';
    if (fieldName === 'requestor') return activeAnalysis.overview?.requestor || '';
    if (fieldName === 'origin') return activeAnalysis.overview?.origin || '';
    if (fieldName === 'description') {
      const value = activeAnalysis.overview?.description || '';
      console.log('[PASTE MODAL] description value:', value);
      return value;
    }
    if (fieldName === 'problem') {
      const value = activeAnalysis.problem?.problem || '';
      console.log('[PASTE MODAL] problem value:', value);
      return value;
    }
    if (fieldName === 'who') return activeAnalysis.problem?.who || '';
    if (fieldName === 'outcome') return activeAnalysis.problem?.outcome || '';
    if (fieldName === 'segments') return activeAnalysis.context?.segments || '';
    if (fieldName === 'workflow') return activeAnalysis.context?.workflow || '';
    
    return '';
  };
  
  // Component to render a field with existing content and merge options
  const FieldDisplay = ({ fieldName, value, section, sectionColor, label }) => {
    const existingContent = getExistingContent(fieldName);
    const hasExisting = existingContent && existingContent.trim().length > 0;
    const mergeMode = mergeModes[fieldName] || 'replace';
    
    console.log('[FIELD DISPLAY]', {
      fieldName,
      existingContent,
      hasExisting,
      'existingContent.length': existingContent?.length,
      'value.length': value?.length,
      mergeMode
    });
    
    return (
      <div className={`border border-${sectionColor}-200 dark:border-${sectionColor}-800 rounded-lg p-3 bg-${sectionColor}-50 dark:bg-${sectionColor}-900/20`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold text-${sectionColor}-700 dark:text-${sectionColor}-300 px-2 py-0.5 bg-${sectionColor}-100 dark:bg-${sectionColor}-800 rounded`}>
              {section}
            </span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
          </div>
          <button
            onClick={() => onDeleteField(fieldName)}
            className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Delete this field"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Show existing content if any */}
        {hasExisting && (
          <div className="mb-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Existing content:</div>
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-16 overflow-y-auto">
              {existingContent}
            </div>
          </div>
        )}
        
        {/* Merge mode options if existing content */}
        {hasExisting && (
          <div className="mb-2 flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Action:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`merge-${fieldName}`}
                value="replace"
                checked={mergeMode === 'replace'}
                onChange={() => onSetMergeMode(fieldName, 'replace')}
                className="text-slate-800 focus:ring-slate-400"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">Replace</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`merge-${fieldName}`}
                value="add"
                checked={mergeMode === 'add'}
                onChange={() => onSetMergeMode(fieldName, 'add')}
                className="text-slate-800 focus:ring-slate-400"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">Add to existing</span>
            </label>
          </div>
        )}
        
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">New content:</div>
        <div className={`text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap ${value.length > 100 ? 'max-h-24 overflow-y-auto' : ''}`}>
          {value}
        </div>
      </div>
    );
  };
  
  const handleImagePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            onImageChange(event.target.result);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };
  
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onImageChange(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onPdfChange(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-8" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Paste & Analyze</h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-2xl leading-none">×</button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
          <button
            onClick={() => setActiveTab('text')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'text'
                ? 'border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-200'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Text
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'image'
                ? 'border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-200'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Image
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pdf'
                ? 'border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-200'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            PDF
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'text' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Paste Text</label>
              <textarea
                value={pastedText}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="Paste your Jira ticket, requirements, or any text here..."
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                rows={10}
              />
              {!hasResults && pastedText.trim() && (
                <button
                  onClick={onAnalyze}
                  disabled={analyzing}
                  className="mt-3 px-4 py-2 text-sm bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {analyzing ? 'Analyzing...' : (githubAIKey ? 'Analyze with AI' : 'Analyze')}
                </button>
              )}
            </div>
          )}
          
          {activeTab === 'image' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Paste or Upload Image</label>
              <div 
                className="w-full min-h-[240px] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center p-4"
                onPaste={handleImagePaste}
              >
                {pastedImage ? (
                  <div className="w-full">
                    <img src={pastedImage} alt="Pasted content" className="max-w-full max-h-[400px] mx-auto rounded" />
                    <button
                      onClick={() => onImageChange(null)}
                      className="mt-3 px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-600 hover:border-red-400 dark:hover:border-red-500 rounded transition-colors"
                    >
                      Clear Image
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Press Ctrl+V (or Cmd+V) to paste image</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">or</p>
                    <label className="inline-block px-4 py-2 text-sm bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors cursor-pointer">
                      Choose File
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Screenshot Jira tickets, wireframes, designs, etc.</p>
                  </div>
                )}
              </div>
              {!hasResults && pastedImage && (
                <button
                  onClick={onImageAnalyze}
                  disabled={analyzing}
                  className="mt-3 px-4 py-2 text-sm bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {analyzing ? 'Analyzing...' : (githubAIKey ? 'Analyze with AI' : 'Analyze')}
                </button>
              )}
            </div>
          )}

          {activeTab === 'pdf' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Upload PDF</label>
              <div className="w-full min-h-[240px] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center p-4">
                {pastedPdf ? (
                  <div className="w-full text-center">
                    <svg className="w-16 h-16 mx-auto text-red-500 dark:text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{pastedPdf.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{(pastedPdf.size / 1024).toFixed(1)} KB</p>
                    <button
                      onClick={() => onPdfChange(null)}
                      className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-600 hover:border-red-400 dark:hover:border-red-500 rounded transition-colors"
                    >
                      Clear PDF
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Upload a PDF document</p>
                    <label className="inline-block px-4 py-2 text-sm bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors cursor-pointer">
                      Choose PDF File
                      <input type="file" accept="application/pdf,.pdf" onChange={handlePdfUpload} className="hidden" />
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Upload requirement documents, specifications, etc.</p>
                  </div>
                )}
              </div>
              {!hasResults && pastedPdf && (
                <button
                  onClick={onPdfAnalyze}
                  disabled={analyzing}
                  className="mt-3 px-4 py-2 text-sm bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {analyzing ? 'Analyzing...' : (githubAIKey ? 'Analyze with AI' : 'Analyze')}
                </button>
              )}
            </div>
          )}

          {/* GitHub AI Key Input */}
          {!githubAIKey && (pastedText.trim() || pastedImage || pastedPdf) && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                Add a GitHub Personal Access Token for AI-powered field extraction. Without it, content will be added to notes as bullet points.
              </p>
              <input
                type="password"
                placeholder="github_pat_... or ghp_..."
                value={githubAIKey || ''}
                onChange={(e) => onSetGitHubAIKey(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600"
              />
            </div>
          )}
          
          {/* GitHub AI Key Status */}
          {githubAIKey && (pastedText.trim() || pastedImage || pastedPdf) && (
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">GitHub Token: Active</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {!hasResults ? 'Click "Analyze with AI" to extract structured information.' : 'Token is saved. Clear to enter a new one.'}
                </p>
              </div>
              <button
                onClick={() => onSetGitHubAIKey('')}
                className="ml-4 px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-600 hover:border-red-400 dark:hover:border-red-500 rounded transition-colors"
              >
                Clear Token
              </button>
            </div>
          )}

          {/* Results Preview */}
          {hasResults && (
            <div>
              {/* Fallback Warning */}
              {results._fallback && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">Basic formatting applied</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    {results._reason || 'AI extraction was not used.'}
                    {results._reason && results._reason.includes('token') ? '' : ' Clear the token above and add a valid GitHub Personal Access Token to use AI-powered extraction.'}
                  </p>
                </div>
              )}
              
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                {results._fallback ? 'Extracted Information' : 'Fields to Populate'}
              </h4>
              
              {/* Field Mapping Display */}
              <div className="space-y-2 mb-4">
                {results.featureName && (
                  <FieldDisplay 
                    fieldName="featureName" 
                    value={results.featureName} 
                    section="Overview" 
                    sectionColor="blue" 
                    label="Feature Name" 
                  />
                )}
                
                {results.date && (
                  <FieldDisplay 
                    fieldName="date" 
                    value={results.date} 
                    section="Overview" 
                    sectionColor="blue" 
                    label="Date" 
                  />
                )}
                
                {results.requestor && (
                  <FieldDisplay 
                    fieldName="requestor" 
                    value={results.requestor} 
                    section="Overview" 
                    sectionColor="blue" 
                    label="Requestor" 
                  />
                )}
                
                {results.origin && (
                  <FieldDisplay 
                    fieldName="origin" 
                    value={results.origin} 
                    section="Overview" 
                    sectionColor="blue" 
                    label="Origin" 
                  />
                )}
                
                {results.description && (
                  <FieldDisplay 
                    fieldName="description" 
                    value={results.description} 
                    section="Overview" 
                    sectionColor="blue" 
                    label="Description" 
                  />
                )}
                
                {results.problem && (
                  <FieldDisplay 
                    fieldName="problem" 
                    value={results.problem} 
                    section="Problem" 
                    sectionColor="purple" 
                    label="Problem Statement" 
                  />
                )}
                
                {results.who && (
                  <FieldDisplay 
                    fieldName="who" 
                    value={results.who} 
                    section="Problem" 
                    sectionColor="purple" 
                    label="Who (Target Users)" 
                  />
                )}
                
                {results.outcome && (
                  <FieldDisplay 
                    fieldName="outcome" 
                    value={results.outcome} 
                    section="Problem" 
                    sectionColor="purple" 
                    label="Outcome" 
                  />
                )}
                
                {results.segments && (
                  <FieldDisplay 
                    fieldName="segments" 
                    value={results.segments} 
                    section="Context" 
                    sectionColor="green" 
                    label="User Segments" 
                  />
                )}
                
                {results.workflow && (
                  <FieldDisplay 
                    fieldName="workflow" 
                    value={results.workflow} 
                    section="Context" 
                    sectionColor="green" 
                    label="Current Workflow" 
                  />
                )}
                
                {results.assumptions && Array.isArray(results.assumptions) && results.assumptions.length > 0 && (
                  <div className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-orange-700 px-2 py-0.5 bg-orange-100 rounded">Assumptions</span>
                        <span className="text-xs font-medium text-slate-600">{results.assumptions.length} item(s)</span>
                      </div>
                      <button
                        onClick={() => onDeleteField('assumptions')}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete this field"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm text-slate-700">
                      {results.assumptions.map((item, i) => (
                        <div key={i}>• {item}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {results.questions && Array.isArray(results.questions) && results.questions.length > 0 && (
                  <div className="border border-pink-200 rounded-lg p-3 bg-pink-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-pink-700 px-2 py-0.5 bg-pink-100 rounded">Questions</span>
                        <span className="text-xs font-medium text-slate-600">{results.questions.length} item(s)</span>
                      </div>
                      <button
                        onClick={() => onDeleteField('questions')}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete this field"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm text-slate-700">
                      {results.questions.map((item, i) => (
                        <div key={i}>• {item}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {results.actions && Array.isArray(results.actions) && results.actions.length > 0 && (
                  <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-indigo-700 px-2 py-0.5 bg-indigo-100 rounded">Actions</span>
                        <span className="text-xs font-medium text-slate-600">{results.actions.length} item(s)</span>
                      </div>
                      <button
                        onClick={() => onDeleteField('actions')}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete this field"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm text-slate-700">
                      {results.actions.map((item, i) => (
                        <div key={i}>• {item}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {results.notes && (
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700 px-2 py-0.5 bg-slate-100 rounded">Notes</span>
                      </div>
                      <button
                        onClick={() => onDeleteField('notes')}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete this field"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm text-slate-700">
                      {Array.isArray(results.notes) ? (
                        results.notes.map((note, i) => <div key={i}>• {note}</div>)
                      ) : (
                        <div className="whitespace-pre-wrap">{results.notes}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:border-slate-400 transition-colors"
          >
            Cancel
          </button>
          {hasResults && (
            <button
              onClick={onApply}
              className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Apply to Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Audio Analysis Modal Component
const AudioAnalysisModal = ({
  isOpen,
  onClose,
  isRecording,
  transcript,
  audioProcessing,
  aiSuggestions,
  selectedSections,
  onToggleSection,
  onUpdateSuggestion,
  onStartRecording,
  onStopRecording,
  onFileUpload,
  onAnalyze,
  onApply,
  githubAIKey,
  onSetGitHubAIKey,
  activeAnalysis,
  mergeModes,
  onSetMergeMode
}) => {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const hasTranscript = transcript && transcript.trim().length > 0;
  const hasSuggestions = Object.keys(aiSuggestions).length > 0;
  
  // Helper to get existing content for a field
  const getExistingContent = (section) => {
    if (!activeAnalysis) return '';
    
    // Direct fields
    if (activeAnalysis[section]) {
      return typeof activeAnalysis[section] === 'string' ? activeAnalysis[section] : '';
    }
    
    // Nested fields
    if (section === 'description') return activeAnalysis.overview?.description || '';
    if (section === 'featureName') return activeAnalysis.overview?.featureName || '';
    if (section === 'problem') return activeAnalysis.problem?.problem || '';
    if (section === 'who') return activeAnalysis.problem?.who || '';
    if (section === 'outcome') return activeAnalysis.problem?.outcome || '';
    if (section === 'segments') return activeAnalysis.context?.segments || '';
    if (section === 'workflow') return activeAnalysis.context?.workflow || '';
    
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-8" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <AudioIcon className="w-5 h-5" />
            Audio Analysis
          </h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Recording Controls */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={isRecording ? onStopRecording : onStartRecording}
                disabled={audioProcessing}
                className={`px-4 py-2.5 text-sm rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isRecording
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-slate-800 dark:bg-slate-600 text-white hover:bg-slate-700 dark:hover:bg-slate-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isRecording ? (
                  <>
                    <span className="w-3 h-3 bg-white rounded-sm"></span>
                    Stop Recording
                  </>
                ) : (
                  <>
                    <AudioIcon className="w-4 h-4" />
                    Start Recording
                  </>
                )}
              </button>
              <span className="text-slate-400">or</span>
              <label className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 transition-colors cursor-pointer font-medium flex items-center gap-2">
                <FolderIcon className="w-4 h-4" />
                Upload Audio
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.ogg,.webm"
                  onChange={onFileUpload}
                  className="hidden"
                  disabled={audioProcessing || isRecording}
                />
              </label>
              {audioProcessing && <span className="text-sm text-slate-500">Processing...</span>}
            </div>
            {isRecording && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                Recording in progress...
              </div>
            )}
          </div>

          {/* Transcript */}
          {hasTranscript && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Transcript</label>
              <textarea
                value={transcript}
                readOnly
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-mono"
                rows={6}
              />
              {!hasSuggestions && (
                <button
                  onClick={onAnalyze}
                  disabled={audioProcessing}
                  className="mt-3 px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {githubAIKey ? 'Analyze with AI' : 'Prepare Suggestions'}
                </button>
              )}
            </div>
          )}

          {/* AI Suggestions */}
          {hasSuggestions && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Suggested Updates</h4>
              <div className="space-y-3">
                {Object.entries(aiSuggestions).map(([section, content]) => {
                  const existingContent = getExistingContent(section);
                  const hasExisting = existingContent && existingContent.trim().length > 0;
                  const mergeMode = mergeModes[section] || 'replace';
                  
                  return (
                    <div key={section} className="border border-slate-200 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedSections[section] !== false}
                          onChange={() => onToggleSection(section)}
                          className="rounded border-slate-300 dark:border-slate-500 text-slate-800 focus:ring-slate-400"
                        />
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize">{section}</label>
                      </div>
                      
                      {/* Show existing content if any */}
                      {hasExisting && (
                        <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded">
                          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Existing content:</div>
                          <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-20 overflow-y-auto">
                            {existingContent}
                          </div>
                        </div>
                      )}
                      
                      {/* Merge mode options if existing content */}
                      {hasExisting && (
                        <div className="mb-2 flex items-center gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`merge-${section}`}
                              value="replace"
                              checked={mergeMode === 'replace'}
                              onChange={() => onSetMergeMode(section, 'replace')}
                              className="text-slate-800 focus:ring-slate-400"
                            />
                            <span className="text-xs text-slate-600 dark:text-slate-400">Replace</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`merge-${section}`}
                              value="add"
                              checked={mergeMode === 'add'}
                              onChange={() => onSetMergeMode(section, 'add')}
                              className="text-slate-800 focus:ring-slate-400"
                            />
                            <span className="text-xs text-slate-600 dark:text-slate-400">Add to existing</span>
                          </label>
                        </div>
                      )}
                      
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">New content:</div>
                      <textarea
                        value={content}
                        onChange={(e) => onUpdateSuggestion(section, e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 resize-none"
                        rows={3}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GitHub AI Key Input */}
          {!githubAIKey && hasTranscript && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                Add a GitHub Personal Access Token for AI-powered analysis, or continue manually.
              </p>
              <input
                type="password"
                placeholder="github_pat_... or ghp_..."
                value={githubAIKey}
                onChange={(e) => onSetGitHubAIKey(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}
          
          {/* GitHub AI Key Status */}
          {githubAIKey && hasTranscript && (
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 mb-1">GitHub Token: Active</p>
                <p className="text-xs text-slate-600">Token is saved. Clear to enter a new one.</p>
              </div>
              <button
                onClick={() => onSetGitHubAIKey('')}
                className="ml-4 px-3 py-1 text-xs text-red-600 hover:text-red-800 border border-red-300 hover:border-red-400 rounded transition-colors"
              >
                Clear Token
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
          >
            Cancel
          </button>
          {hasSuggestions && (
            <button
              onClick={onApply}
              className="px-4 py-2 text-sm font-medium bg-slate-800 dark:bg-slate-600 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-500 transition-colors"
            >
              Apply Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function RequirementAnalyzer() {
  const [analyses, setAnalyses] = useState([createBlankAnalysis("Sample: Dark Mode Toggle")]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeId, setActiveId] = useState(() => analyses[0]?.id);
  const [activeSection, setActiveSection] = useState(() => {
    const saved = localStorage.getItem("activeSection");
    return saved || "overview";
  });
  const [showExport, setShowExport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [actionsPanelOpen, setActionsPanelOpen] = useState(true);
  const [phaseFilter, setPhaseFilter] = useState("All");
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem("githubToken") || "");
  const [loadGistId, setLoadGistId] = useState("");
  const [gistLoading, setGistLoading] = useState(false);
  const [gistExpanded, setGistExpanded] = useState(false);
  const [syncOptionsExpanded, setSyncOptionsExpanded] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioProcessing, setAudioProcessing] = useState(false);
  const [githubAIKey, setGitHubAIKey] = useState(() => localStorage.getItem("githubAIKey") || "");
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [selectedSections, setSelectedSections] = useState({});
  const [mergeModes, setMergeModes] = useState({}); // 'replace' or 'add' for each field with existing content
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importedMarkdown, setImportedMarkdown] = useState("");
  const [importMode, setImportMode] = useState(""); // "new" or "existing"
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [pastedImage, setPastedImage] = useState(null);
  const [pastedPdf, setPastedPdf] = useState(null);
  const [pasteAnalyzing, setPasteAnalyzing] = useState(false);
  const [pasteResults, setPasteResults] = useState(null);
  const [pasteMergeModes, setPasteMergeModes] = useState({}); // 'replace' or 'add' for paste results
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
  
  const fileInputRef = useRef(null);

  // Check if any analysis has secure mode enabled
  const hasSecureAnalysis = useMemo(() => 
    analyses.some(a => a.secureMode === true),
    [analyses]
  );

  // Load data on mount (encrypted if any analysis has secure mode)
  useEffect(() => {
    const loadData = async () => {
      try {
        let saved;
        // Try encrypted storage first
        saved = await secureStorage.getItem("requirementAnalyses");
        
        // If no encrypted data, try plain storage
        if (!saved) {
          saved = localStorage.getItem("requirementAnalyses");
        }
        
        if (saved) {
          const parsed = JSON.parse(saved);
          const migrated = Array.isArray(parsed) ? parsed.map(migrateAnalysis) : [];
          if (migrated.length > 0) {
            setAnalyses(migrated);
            if (!activeId || !migrated.find(a => a.id === activeId)) {
              setActiveId(migrated[0].id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        // Keep default data on error
      } finally {
        setDataLoaded(true);
      }
    };
    loadData();
  }, []); // Only run on mount

  // Apply dark mode class to document
  useEffect(() => {
    console.log('Dark mode changed:', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
      console.log('Added dark class');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Removed dark class');
    }
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

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

  // Save to localStorage whenever analyses change (encrypted if any analysis has secure mode)
  useEffect(() => {
    const saveData = async () => {
      if (dataLoaded) {
        if (hasSecureAnalysis) {
          await secureStorage.setItem("requirementAnalyses", JSON.stringify(analyses));
        } else {
          localStorage.setItem("requirementAnalyses", JSON.stringify(analyses));
        }
      }
    };
    saveData();
  }, [analyses, dataLoaded, hasSecureAnalysis]);

  // Remove old secure mode preference (no longer needed)
  useEffect(() => {
    localStorage.removeItem("secureMode");
  }, []);

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

  // Save GitHub AI key to localStorage
  useEffect(() => {
    if (githubAIKey) {
      localStorage.setItem("githubAIKey", githubAIKey);
    } else {
      localStorage.removeItem("githubAIKey");
    }
  }, [githubAIKey]);

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
    setAnalyses((prev) => prev.map((a) => {
      if (a.id === activeId) {
        return { 
          ...a, 
          name,
          overview: { ...a.overview, featureName: name }
        };
      }
      return a;
    }));
  };

  const handleExportMd = () => { if (active) setShowExport(true); };

  const handleGenerateAIBrief = () => {
    if (!active) return;
    const a = analyses.find((x) => x.id === active);
    if (!a) return;

    const lines = [];
    const h = (t, level = 2) => lines.push(`\n${"#".repeat(level)} ${t}`);
    const f = (label, val) => { if (val?.trim()) lines.push(`**${label}:** ${val}`); };

    // Title and metadata
    lines.push(`# AI Design Brief: ${a.name || "Untitled Design Task"}`);
    lines.push(`*Generated: ${new Date().toLocaleDateString()} | Target Phase: ${a.phase || "Not set"}*`);
    if (a.jiraTicket) lines.push(`*JIRA: ${a.jiraTicket}*`);

    // Executive Summary
    h("Executive Summary");
    f("Feature", a.overview?.featureName);
    f("Problem Statement", a.problem?.problem);
    f("Business Outcome", a.problem?.outcome);
    f("Success Metrics", a.problem?.metrics);
    if (a.overview?.description) lines.push(`\n${a.overview.description}`);

    // User Context & Research
    h("User Context & Research");
    f("Target Users", a.problem?.who);
    f("User Segments", a.context?.segments);
    f("Current Workflow", a.context?.workflow);
    f("Workarounds in Use", a.context?.workarounds);
    f("Triggers/Entry Points", a.context?.triggers);
    if (a.context?.beforeAfter) {
      lines.push(`\n**Before/After Scenario:**`);
      lines.push(a.context.beforeAfter);
    }

    // Requirements & Scope
    h("Requirements & Scope");
    f("Affected Features", a.scope?.affected);
    f("New Patterns Needed", a.scope?.newPatterns);
    if (a.scope?.items && a.scope.items.length > 0) {
      lines.push(`\n**Scope Items by Version:**`);
      const byVersion = {};
      a.scope.items.forEach((item) => {
        const v = item.version || "Unassigned";
        if (!byVersion[v]) byVersion[v] = [];
        byVersion[v].push(item);
      });
      Object.entries(byVersion).forEach(([version, items]) => {
        lines.push(`\n*${version}:*`);
        items.forEach((item) => {
          const priority = item.priority ? ` [${item.priority}]` : "";
          lines.push(`- ${item.item}${priority}${item.description ? ` — ${item.description}` : ""}`);
        });
      });
    }

    // Visual References
    h("Visual References & Mapping");
    if (a.mapping?.figmaUrl) {
      lines.push(`Figma: ${a.mapping.figmaUrl}`);
      lines.push(`\n*Use this Figma file as the visual reference for all design decisions.*`);
    } else {
      lines.push("*No visual references available yet.*");
    }

    // Constraints & Edge Cases
    h("Technical Constraints & Edge Cases");
    f("Technical Constraints", a.scope?.technical);
    if (a.edges && Object.keys(a.edges).length > 0) {
      lines.push(`\n**Edge Cases to Consider:**`);
      EDGE_CASE_ITEMS.forEach((ec) => {
        const d = a.edges[ec.id];
        if (d?.considered) {
          lines.push(`- ✓ **${ec.label}**${d.notes ? `: ${d.notes}` : ""}`);
        }
      });
    }
    if (a.assumptions && a.assumptions.length > 0) {
      lines.push(`\n**Assumptions:**`);
      a.assumptions.forEach((item) => {
        lines.push(`- [${item.status}] ${item.text}`);
      });
    }

    // Open Questions
    h("Open Questions & Decisions Needed");
    if (!a.questions || a.questions.length === 0) {
      lines.push("*No open questions at this time.*");
    } else {
      const unanswered = a.questions.filter(q => q.status !== "Answered");
      const answered = a.questions.filter(q => q.status === "Answered");
      if (unanswered.length > 0) {
        lines.push(`\n**Pending (${unanswered.length}):**`);
        unanswered.forEach((q) => {
          lines.push(`- (${q.type}) ${q.text}`);
        });
      }
      if (answered.length > 0) {
        lines.push(`\n**Resolved (${answered.length}):**`);
        answered.forEach((q) => {
          lines.push(`- (${q.type}) ${q.text}`);
          if (q.answer?.trim()) lines.push(`  → ${q.answer}`);
        });
      }
    }

    // Next Steps & Actions
    h("Next Steps & Actions");
    f("Design Lead Next Steps", a.summary?.nextSteps);
    f("Confidence Level", a.summary?.confidence);
    f("Key Concerns", a.summary?.concerns);
    if (a.actions && a.actions.length > 0) {
      lines.push(`\n**Action Items:**`);
      a.actions.forEach((item) => {
        lines.push(`- [${item.completed ? "X" : " "}] ${item.text}`);
      });
    }

    // Additional Context
    if (a.notes?.trim()) {
      h("Additional Context & Notes");
      lines.push(a.notes);
    }

    // Footer
    lines.push(`\n---`);
    lines.push(`*This AI Design Brief was auto-generated from the Requirements Analyzer.*`);
    lines.push(`*Use this document to provide comprehensive context to AI design tools.*`);

    const mdContent = lines.join("\n");
    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${a.name.replace(/[^a-z0-9]/gi, "_")}_AI_Brief.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportMd = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const markdown = e.target.result;
      setImportedMarkdown(markdown);
      setImportModalOpen(true);
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = "";
  };

  const handleImportNew = () => {
    if (!importedMarkdown) return;
    
    try {
      const imported = importFromMarkdown(importedMarkdown);
      setAnalyses((prev) => [imported, ...prev]);
      setActiveId(imported.id);
      setActiveSection("overview");
      setImportModalOpen(false);
      setImportedMarkdown("");
      alert(`Created new task: ${imported.name}`);
    } catch (error) {
      alert(`Failed to import markdown:\n${error.message}`);
    }
  };

  const handleImportExisting = () => {
    if (!importedMarkdown || !active) return;
    
    try {
      const imported = importFromMarkdown(importedMarkdown);
      
      // Merge with existing analysis
      setAnalyses((prev) =>
        prev.map((a) => {
          if (a.id !== activeId) return a;
          
          return {
            ...a,
            // Merge arrays
            assumptions: [...a.assumptions, ...imported.assumptions],
            questions: [...a.questions, ...imported.questions],
            actions: [...(a.actions || []), ...imported.actions],
            // Append text fields
            notes: a.notes ? `${a.notes}\n\n${imported.notes}` : imported.notes,
            // Keep existing values but allow imported ones to fill empty fields
            overview: {
              featureName: a.overview.featureName || imported.overview.featureName,
              date: a.overview.date || imported.overview.date,
              requestor: a.overview.requestor || imported.overview.requestor,
              origin: a.overview.origin || imported.overview.origin,
              originOther: a.overview.originOther || imported.overview.originOther,
              description: a.overview.description ? `${a.overview.description}\n\n${imported.overview.description}` : imported.overview.description,
            },
            problem: {
              problem: a.problem.problem || imported.problem.problem,
              who: a.problem.who || imported.problem.who,
              outcome: a.problem.outcome || imported.problem.outcome,
              metrics: a.problem.metrics || imported.problem.metrics,
              ifNotBuilt: a.problem.ifNotBuilt || imported.problem.ifNotBuilt,
            },
            context: {
              segments: a.context.segments || imported.context.segments,
              workflow: a.context.workflow || imported.context.workflow,
              workarounds: a.context.workarounds || imported.context.workarounds,
              triggers: a.context.triggers || imported.context.triggers,
              beforeAfter: a.context.beforeAfter || imported.context.beforeAfter,
            },
            summary: {
              confidence: a.summary.confidence || imported.summary.confidence,
              concerns: a.summary.concerns || imported.summary.concerns,
              nextSteps: a.summary.nextSteps || imported.summary.nextSteps,
            },
            updatedAt: new Date().toISOString(),
          };
        })
      );
      
      setImportModalOpen(false);
      setImportedMarkdown("");
      alert("Merged markdown content with current task");
    } catch (error) {
      alert(`Failed to import markdown:\n${error.message}`);
    }
  };

  const handlePasteAnalyze = async () => {
    if (!pastedText.trim()) return;
    
    setPasteAnalyzing(true);
    
    try {
      const results = await analyzePastedText(pastedText, githubAIKey);
      setPasteResults(results);
    } catch (error) {
      alert(`Failed to analyze text:\n${error.message}`);
    } finally {
      setPasteAnalyzing(false);
    }
  };

  const handleImageAnalyze = async () => {
    if (!pastedImage) return;
    
    setPasteAnalyzing(true);
    
    try {
      const results = await analyzeImage(pastedImage, githubAIKey);
      setPasteResults(results);
    } catch (error) {
      alert(`Failed to analyze image:\n${error.message}`);
    } finally {
      setPasteAnalyzing(false);
    }
  };

  const handlePdfAnalyze = async () => {
    if (!pastedPdf) return;
    
    setPasteAnalyzing(true);
    
    try {
      // Extract text from PDF
      const text = await extractTextFromPDF(pastedPdf);
      // Analyze the extracted text
      const results = await analyzePastedText(text, githubAIKey);
      setPasteResults(results);
    } catch (error) {
      alert(`Failed to analyze PDF:\n${error.message}`);
    } finally {
      setPasteAnalyzing(false);
    }
  };

  const handleApplyPasteResults = () => {
    if (!pasteResults || !active) return;
    
    setAnalyses((prev) =>
      prev.map((a) => {
        if (a.id !== activeId) return a;
        
        const updated = { ...a, updatedAt: new Date().toISOString() };
        
        // Helper to apply field based on merge mode
        const applyField = (fieldName, value, currentValue) => {
          if (!value) return currentValue;
          
          const mergeMode = pasteMergeModes[fieldName] || 'replace';
          if (!currentValue || currentValue.trim() === '') {
            return value;
          }
          
          if (mergeMode === 'add') {
            return `${currentValue}\n\n${value}`;
          }
          
          return value; // replace mode
        };
        
        // Update overview fields
        if (pasteResults.featureName) {
          updated.overview = { 
            ...updated.overview, 
            featureName: applyField('featureName', pasteResults.featureName, updated.overview.featureName)
          };
        }
        if (pasteResults.date) {
          updated.overview = { 
            ...updated.overview, 
            date: applyField('date', pasteResults.date, updated.overview.date)
          };
        }
        if (pasteResults.requestor) {
          updated.overview = { 
            ...updated.overview, 
            requestor: applyField('requestor', pasteResults.requestor, updated.overview.requestor)
          };
        }
        if (pasteResults.origin) {
          updated.overview = { 
            ...updated.overview, 
            origin: applyField('origin', pasteResults.origin, updated.overview.origin)
          };
        }
        if (pasteResults.description) {
          updated.overview = { 
            ...updated.overview, 
            description: applyField('description', pasteResults.description, updated.overview.description)
          };
        }
        
        // Update problem fields
        if (pasteResults.problem) {
          updated.problem = { 
            ...updated.problem, 
            problem: applyField('problem', pasteResults.problem, updated.problem.problem)
          };
        }
        if (pasteResults.who) {
          updated.problem = { 
            ...updated.problem, 
            who: applyField('who', pasteResults.who, updated.problem.who)
          };
        }
        if (pasteResults.outcome) {
          updated.problem = { 
            ...updated.problem, 
            outcome: applyField('outcome', pasteResults.outcome, updated.problem.outcome)
          };
        }
        
        // Update context fields
        if (pasteResults.segments) {
          updated.context = { 
            ...updated.context, 
            segments: applyField('segments', pasteResults.segments, updated.context.segments)
          };
        }
        if (pasteResults.workflow) {
          updated.context = { 
            ...updated.context, 
            workflow: applyField('workflow', pasteResults.workflow, updated.context.workflow)
          };
        }
        
        // Append arrays (always append, no merge mode)
        if (pasteResults.assumptions && Array.isArray(pasteResults.assumptions)) {
          updated.assumptions = [...updated.assumptions, ...pasteResults.assumptions];
        }
        if (pasteResults.questions && Array.isArray(pasteResults.questions)) {
          updated.questions = [...updated.questions, ...pasteResults.questions];
        }
        if (pasteResults.actions && Array.isArray(pasteResults.actions)) {
          const newActions = pasteResults.actions.map(text => ({ id: generateId(), text, completed: false }));
          updated.actions = [...(updated.actions || []), ...newActions];
        }
        
        // Append notes
        if (pasteResults.notes) {
          const notesText = Array.isArray(pasteResults.notes) 
            ? pasteResults.notes.map(n => `• ${n}`).join('\n')
            : pasteResults.notes;
          updated.notes = updated.notes 
            ? `${updated.notes}\n\n${notesText}` 
            : notesText;
        }
        
        return updated;
      })
    );
    
    setPasteModalOpen(false);
    setPastedText("");
    setPastedImage(null);
    setPastedPdf(null);
    setPasteResults(null);
    setPasteMergeModes({});
    alert("Applied extracted information to task");
  };

  const handleDeletePasteField = (fieldName) => {
    setPasteResults(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  };

  const handleSetPasteMergeMode = (fieldName, mode) => {
    setPasteMergeModes(prev => ({ ...prev, [fieldName]: mode }));
  };

  const handleExportJson = () => {
    if (!active) return;
    const encoded = btoa(JSON.stringify(active));
    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    
    // Try to copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        alert("Share link copied to clipboard! Anyone with this link can view this analysis.");
      }).catch((err) => {
        console.error("Clipboard write failed:", err);
        // Show URL in prompt as fallback
        prompt("Copy this share link:", url);
      });
    } else {
      // Browser doesn't support clipboard API, show URL in prompt
      prompt("Copy this share link:", url);
    }
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

  // Audio analysis handlers
  const handleStartRecording = async () => {
    setAudioProcessing(true);
    setTranscript("");
    const success = await startAudioRecording((finalTranscript, interimTranscript) => {
      setTranscript(prev => {
        const newTranscript = prev + finalTranscript;
        return newTranscript;
      });
    });
    if (success) {
      setIsRecording(true);
    } else {
      alert("Failed to start recording. Please check microphone permissions.");
    }
    setAudioProcessing(false);
  };

  const handleStopRecording = async () => {
    setAudioProcessing(true);
    await stopAudioRecording();
    setIsRecording(false);
    setAudioProcessing(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAudioProcessing(true);
    alert("Audio file transcription from uploads is not yet supported in the browser. Please use the recording feature or manually enter your content.");
    setAudioProcessing(false);
  };

  const handleAnalyzeTranscript = async () => {
    if (!transcript) return;
    
    setAudioProcessing(true);
    
    if (githubAIKey) {
      // Analyze with GitHub AI
      const suggestions = await analyzeWithGitHub(transcript, githubAIKey);
      if (suggestions) {
        setAiSuggestions(suggestions);
        // Initialize all sections as selected
        const selected = {};
        Object.keys(suggestions).forEach(key => { selected[key] = true; });
        setSelectedSections(selected);
      } else {
        alert("Failed to analyze with OpenAI. Please check your API key.");
      }
    } else {
      // Manual mode - put transcript in notes
      setAiSuggestions({ notes: transcript });
      setSelectedSections({ notes: true });
    }
    
    setAudioProcessing(false);
  };

  const handleToggleSection = (section) => {
    setSelectedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleUpdateSuggestion = (section, content) => {
    setAiSuggestions(prev => ({ ...prev, [section]: content }));
  };

  const handleSetMergeMode = (section, mode) => {
    setMergeModes(prev => ({ ...prev, [section]: mode }));
  };
  
  // Helper to get current value of a field from active analysis
  const getActiveFieldValue = (section) => {
    if (!active) return '';
    
    // Direct fields
    if (active[section]) {
      return typeof active[section] === 'string' ? active[section] : '';
    }
    
    // Nested fields
    if (section === 'description') return active.overview?.description || '';
    if (section === 'featureName') return active.overview?.featureName || '';
    if (section === 'problem') return active.problem?.problem || '';
    if (section === 'who') return active.problem?.who || '';
    if (section === 'outcome') return active.problem?.outcome || '';
    if (section === 'segments') return active.context?.segments || '';
    if (section === 'workflow') return active.context?.workflow || '';
    
    return '';
  };

  const handleApplyAudioChanges = () => {
    Object.entries(aiSuggestions).forEach(([section, content]) => {
      if (selectedSections[section] !== false && content.trim()) {
        const existingContent = getActiveFieldValue(section);
        const mergeMode = mergeModes[section] || 'replace';
        
        let finalContent = content;
        if (existingContent && existingContent.trim() && mergeMode === 'add') {
          // Add new content to existing
          finalContent = `${existingContent}\n\n${content}`;
        }
        
        updateActive(section, finalContent);
      }
    });
    
    // Reset audio modal state
    setAudioModalOpen(false);
    setTranscript("");
    setAiSuggestions({});
    setSelectedSections({});
    setMergeModes({});
    setIsRecording(false);
  };

  const handleCloseAudioModal = () => {
    if (isRecording) {
      handleStopRecording();
    }
    setAudioModalOpen(false);
    setTranscript("");
    setAiSuggestions({});
    setSelectedSections({});
    setMergeModes({});
  };

  if (!active) return null;
  const completion = getCompletion(active);
  const { filled: tasksFilled, total: tasksTotal } = getTaskCount(active);

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
    const lang = active.language || "en";
    switch (activeSection) {
      case "overview": return <OverviewSection 
        data={active.overview} 
        phase={active.phase} 
        jiraTicket={active.jiraTicket} 
        secureMode={active.secureMode || false}
        language={lang}
        audioModalOpen={audioModalOpen}
        pasteModalOpen={pasteModalOpen}
        onChange={(v) => {
          // Sync task name when feature name changes
          if (v.featureName !== active.overview.featureName) {
            setAnalyses((prev) => prev.map((a) => 
              a.id === activeId ? { ...a, name: v.featureName, overview: v, updatedAt: new Date().toISOString() } : a
            ));
          } else {
            updateActive("overview", v);
          }
        }} 
        onPhaseChange={updatePhase} 
        onJiraTicketChange={(v) => updateActive("jiraTicket", v)}
        onSecureModeChange={(v) => updateActive("secureMode", v)}
        onLanguageChange={(v) => updateActive("language", v)}
        onOpenAudioModal={() => setAudioModalOpen(true)}
        onOpenPasteModal={() => setPasteModalOpen(true)}
      />;
      case "problem": return <ProblemSection data={active.problem} language={lang} onChange={(v) => updateActive("problem", v)} />;
      case "context": return <UserContextSection data={active.context} language={lang} onChange={(v) => updateActive("context", v)} />;
      case "assumptions": return <AssumptionsSection data={active.assumptions} language={lang} onChange={(v) => updateActive("assumptions", v)} />;
      case "edges": return <EdgeCasesSection data={active.edges} language={lang} onChange={(v) => updateActive("edges", v)} />;
      case "scope": return <ScopeSection data={active.scope} language={lang} onChange={(v) => updateActive("scope", v)} />;
      case "questions": return <QuestionsSection data={active.questions} language={lang} onChange={(v) => updateActive("questions", v)} />;
      case "notes": return <NotesSection data={active.notes} language={lang} onChange={(v) => updateActive("notes", v)} />;
      case "mapping": return <MappingSection data={active.mapping || { figmaUrl: "" }} language={lang} onChange={(v) => updateActive("mapping", v)} />;
      case "summary": return <SummarySection data={active.summary} language={lang} onChange={(v) => updateActive("summary", v)} onGenerateAIBrief={() => handleGenerateAIBrief()} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0">
          <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">Design task manager</h1>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" title="Close sidebar">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Phase filter */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
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
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
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
                    a.id === activeId ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  {a.jiraTicket && (
                    <div className="text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">
                      {a.jiraTicket}
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1 break-words">{a.name || "Untitled Design Task"}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {a.secureMode && (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700" title="Secure mode enabled">
                          <svg className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                      )}
                      {a.phase && <VersionBadge version={a.phase} size="xs" />}
                      {analyses.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteAnalysis(a.id); }}
                          className="text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500 opacity-0 group-hover:opacity-100 text-sm ml-1"
                        >×</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredAnalyses.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No analyses in this phase.
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
            {/* New Design Task Button */}
            <button
              onClick={createNew}
              className="w-full py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-600 rounded-lg hover:border-slate-300 dark:hover:border-slate-500 transition-colors font-medium"
            >
              + New design task
            </button>
            
            {/* Export Options Section */}
            {syncOptionsExpanded && (
              <div className="space-y-2 mb-2">
                {/* GitHub Gist Sync - Only when current analysis doesn't have secure mode */}
                {!active?.secureMode && gistExpanded && (
                  <div className="space-y-2 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                    {/* GitHub Token */}
                    <div>
                      <label className="text-sm text-slate-700 dark:text-slate-200 mb-1 block font-medium">GitHub Token</label>
                      <input
                        type="password"
                        placeholder="ghp_..."
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                      />
                      <a
                        href="https://github.com/settings/tokens/new?description=Requirement%20Analyzer&scopes=gist"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline mt-1 inline-block"
                      >
                        Create token
                      </a>
                    </div>
                    
                    {/* Save to Gist */}
                    <button
                      onClick={handleSaveToGist}
                      disabled={gistLoading || !githubToken}
                      className="w-full py-2.5 text-sm text-white bg-slate-800 dark:bg-slate-600 hover:bg-slate-700 dark:hover:bg-slate-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {gistLoading ? "Saving..." : active?.gistId ? "Update Gist" : "Save to Gist"}
                    </button>
                    
                    {/* Load from Gist */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Gist ID"
                        value={loadGistId}
                        onChange={(e) => setLoadGistId(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                      />
                      <button
                        onClick={handleLoadFromGist}
                        disabled={gistLoading || !loadGistId.trim()}
                        className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600 rounded hover:border-slate-400 dark:hover:border-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                )}
                
                {!active?.secureMode && (
                  <button
                    onClick={() => setGistExpanded(!gistExpanded)}
                    className="w-full py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-600 rounded-lg hover:border-slate-300 dark:hover:border-slate-500 transition-colors flex items-center justify-center gap-1"
                    title="Cloud backup: Saves your active task to GitHub as a private gist. Share the Gist ID with others to let them import a copy. Changes don't auto-sync between people - each save/load creates an independent snapshot."
                  >
                    GitHub Sync {gistExpanded ? "⌄" : "⌃"}
                  </button>
                )}
                
                {/* Share Link */}
                <button
                  onClick={handleExportJson}
                  className="w-full py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-600 rounded-lg hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
                >
                  Share active task
                </button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportMd}
                  accept=".md,.markdown,.txt"
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-full py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-600 rounded-lg hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
                >
                  Import Markdown
                </button>
                <button onClick={handleExportMd} className="w-full py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-600 rounded-lg hover:border-slate-300 dark:hover:border-slate-500 transition-colors">
                  Export as Markdown
                </button>
              </div>
            )}
            
            {/* Export Options Toggle Button */}
            <button
              onClick={() => setSyncOptionsExpanded(!syncOptionsExpanded)}
              className="w-full py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-600 rounded-lg hover:border-slate-300 dark:hover:border-slate-500 transition-colors flex items-center justify-center gap-1"
            >
              Export options {syncOptionsExpanded ? "⌄" : "⌃"}
            </button>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3">
          <div className="flex items-center gap-3 mb-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 mr-1" title="Show sidebar">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <input
              className="text-lg font-semibold text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none focus:ring-0 flex-1 px-0"
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
              <span className="text-xs text-slate-400 w-10">{tasksFilled}/{tasksTotal}</span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setActionsPanelOpen(!actionsPanelOpen)}
                className="text-slate-400 hover:text-slate-800 ml-2 transition-colors flex items-center gap-1.5"
                title="Toggle actions panel"
              >
                {actionsPanelOpen ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                ) : (
                  <>
                    <span className="text-sm">Actions</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
          {/* Section nav */}
          <div className="flex gap-1 overflow-x-auto pb-4 -mx-1 px-1">
            {SECTIONS.map((s) => {
              const lang = active.language || "en";
              const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
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
                  {t.sections[s.id] || s.label}
                </Pill>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className={activeSection === "mapping" ? "px-6 py-8" : "max-w-2xl mx-auto px-6 py-8"}>
            {renderSection()}
          </div>
        </div>
      </div>

      {/* Actions Panel */}
      {actionsPanelOpen && (
        <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0">
          <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">Action Items</h2>
              <button onClick={() => setActionsPanelOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" title="Close actions panel">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <ActionsSection data={active.actions || []} onChange={(v) => updateActive("actions", v)} />
          </div>
        </div>
      )}

      {/* Audio Analysis Modal - Only when current analysis doesn't have secure mode */}
      {!active?.secureMode && (
        <AudioAnalysisModal
          isOpen={audioModalOpen}
          onClose={handleCloseAudioModal}
          isRecording={isRecording}
          transcript={transcript}
          audioProcessing={audioProcessing}
          aiSuggestions={aiSuggestions}
          selectedSections={selectedSections}
          onToggleSection={handleToggleSection}
          onUpdateSuggestion={handleUpdateSuggestion}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onFileUpload={handleFileUpload}
          onAnalyze={handleAnalyzeTranscript}
          onApply={handleApplyAudioChanges}
          githubAIKey={githubAIKey}
          onSetGitHubAIKey={setGitHubAIKey}
          activeAnalysis={active}
          mergeModes={mergeModes}
          onSetMergeMode={handleSetMergeMode}
        />
      )}

      {/* Paste & Analyze Modal - Only when current analysis doesn't have secure mode */}
      {!active?.secureMode && (
        <PasteAnalyzeModal
          isOpen={pasteModalOpen}
          onClose={() => {
            setPasteModalOpen(false);
            setPastedText("");
            setPastedImage(null);
            setPastedPdf(null);
            setPasteResults(null);
            setPasteMergeModes({});
          }}
          pastedText={pastedText}
          onTextChange={setPastedText}
          pastedImage={pastedImage}
          onImageChange={setPastedImage}
          pastedPdf={pastedPdf}
          onPdfChange={setPastedPdf}
          onAnalyze={handlePasteAnalyze}
          onImageAnalyze={handleImageAnalyze}
          onPdfAnalyze={handlePdfAnalyze}
          analyzing={pasteAnalyzing}
          results={pasteResults}
          onApply={handleApplyPasteResults}
          githubAIKey={githubAIKey}
          onSetGitHubAIKey={setGitHubAIKey}
          onDeleteField={handleDeletePasteField}
          activeAnalysis={active}
          mergeModes={pasteMergeModes}
          onSetMergeMode={handleSetPasteMergeMode}
        />
      )}

      {/* Import Markdown Modal */}
      <ImportMarkdownModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportedMarkdown("");
        }}
        onImportNew={handleImportNew}
        onImportExisting={handleImportExisting}
        hasActiveTask={!!active}
      />

      {/* Markdown Export Modal */}
      {showExport && active && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-8" onClick={() => setShowExport(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Markdown Export</h3>
              <button onClick={() => setShowExport(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                {exportToMarkdown(active)}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => { 
                  navigator.clipboard.writeText(exportToMarkdown(active))
                    .then(() => alert('Markdown copied to clipboard!'))
                    .catch(err => console.error('Failed to copy:', err));
                }}
                className="px-4 py-2 text-sm font-medium bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}