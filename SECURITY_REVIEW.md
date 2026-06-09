# Security Review: Requirement Analyzer
**Executive Summary**  
**Date:** February 19, 2026  
**Application:** Requirements Analyzer (Static Web App)

---

## Executive Summary

This is a **client-side requirements documentation tool** with a **user-controlled security model**. Users choose security levels per-task, enabling strict controls for sensitive work while maintaining full functionality for standard analyses.

**Risk Rating:** 🟢 **LOW** - Aligns with approved organizational tools (GitHub, Microsoft Copilot)

---

## Security Architecture

### Per-Task Security Model
- **User Choice**: Each analysis can be marked "Secure" or "Standard" individually
- **Smart Encryption**: If ANY task is secure, ALL data encrypted with AES-256-GCM
- **Visual Indicators**: Green shield badges identify secure tasks
- **Default**: New analyses default to Standard mode (non-secure)

### Data Storage
| Aspect | Implementation | Risk Level |
|--------|---------------|------------|
| **Primary Storage** | Browser localStorage (client-only) | 🟢 Low |
| **Encryption** | AES-256-GCM, PBKDF2 (100k iterations) | 🟢 Low |
| **Network Storage** | None (static deployment) | 🟢 None |
| **Server Processing** | None (fully client-side) | 🟢 None |
| **Access Control** | Vercel SSO / Deployment Protection | 🟢 Low |

---

## External Service Usage

All external services **automatically disabled** when secure mode is active.

### 1. AI Analysis (Azure OpenAI via GitHub Models)
- **Purpose**: Auto-generate requirement sections from meeting transcripts or pasted text
- **Endpoint**: `models.inference.ai.azure.com` (Microsoft Azure)
- **Model**: GPT-4o
- **Auth**: GitHub Personal Access Token (user-provided)
- **Organizational Alignment**: ✅ Same infrastructure as approved GitHub Copilot
- **Availability**: Only when secure mode is OFF

**Risk:** 🟢 **LOW** - Uses pre-approved Microsoft AI infrastructure

### 2. GitHub Gist Sync (Optional)
- **Purpose**: Optional backup/sync via private GitHub gists
- **Provider**: GitHub API (Microsoft-owned)
- **Organizational Alignment**: ✅ GitHub is an approved service
- **Availability**: Only when secure mode is OFF

**Risk:** 🟢 **LOW** - Aligns with existing GitHub usage policies

### 3. Share Link Feature
- **Method**: Base64-encoded data in URL parameters
- **Risk**: Sensitive data visible in URLs (browser history, logs)
- **Mitigation**: Works with encrypted data; users control what they share

**Risk:** 🟡 **MEDIUM** - User awareness required

---

## Key Security Controls

✅ **User-Controlled Security**: Per-task security flags  
✅ **Automatic Feature Blocking**: AI/sync hidden for secure tasks  
✅ **Strong Encryption**: AES-256-GCM when any task is secure  
✅ **No Server-Side Storage**: Fully client-side application  
✅ **Approved Services Only**: GitHub and Microsoft infrastructure  
✅ **Visual Indicators**: Clear secure/standard task identification  

---

## Compliance & Organizational Fit

### Approved Services Alignment
- **GitHub** (Code hosting, gist sync): ✅ Organizationally approved
- **GitHub Models/Azure OpenAI** (AI analysis): ✅ Same as approved Copilot services
- **Microsoft Infrastructure**: ✅ Aligns with existing Microsoft Copilot usage

### Data Handling
- **Client-Side Only**: No server-side data processing or storage
- **Encryption at Rest**: AES-256-GCM for sensitive analyses
- **User Control**: Users decide what data is sensitive
- **No Telemetry**: No analytics or tracking implemented

---

## Risk Assessment

| Component | Risk Level | Justification |
|-----------|-----------|---------------|
| **Data Storage** | 🟢 Low | Local-only, encrypted when needed |
| **AI Features** | 🟢 Low | Pre-approved Microsoft infrastructure |
| **GitHub Sync** | 🟢 Low | Pre-approved service, user-controlled |
| **Share Links** | 🟡 Medium | Requires user awareness of URL exposure |
| **Overall** | 🟢 Low | Aligns with approved tools, user-controlled |

---

## Recommendations

### For Deployment
1. **Deploy as Static Site**: Use approved static hosting (for example Vercel) with no app server
2. **HTTPS Required**: Ensure encrypted transport layer
3. **Document User Guidelines**: Brief on secure mode usage for sensitive projects
4. **Browser Requirements**: Modern browser with Web Crypto API support

### For Users
1. **Enable Secure Mode**: For any analysis containing confidential information
2. **Avoid Share Links**: For highly sensitive data (use GitHub sync or manual export)
3. **Token Security**: Keep GitHub tokens secure, use minimal permissions

---

## Technical Specifications

**Encryption**: AES-256-GCM with PBKDF2 key derivation (100,000 iterations)  
**Storage**: Browser localStorage (5-10MB typical limit)  
**Dependencies**: React 18, Vite 5, Tailwind CSS, PDF.js  
**Deployment**: Static files (HTML/CSS/JS), no backend required  
**Authentication**: GitHub PAT (user-provided, optional for AI/sync features)  

---

