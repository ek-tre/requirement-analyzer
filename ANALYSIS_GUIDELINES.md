# Analysis Guidelines

Guidelines for effectively analyzing product requirements and design problems using this tool.

## Purpose

This tool is designed to help **product designers and UX designers** design with clarity. It provides a structured framework to:
- Understand and articulate design problems thoroughly
- Document user context and requirements
- Identify assumptions and edge cases early
- Track design-specific actions and decisions
- Communicate design intent clearly to stakeholders

The goal is to move from ambiguous requirements to clear, actionable design direction.

## Overview Section

### Feature Name
- Keep it concise and descriptive (3-7 words)
- Use title case
- Focus on the user-facing benefit or capability

### Date & Requestor
- Document when the request came in
- Track who initiated or is sponsoring the work
- Note any key stakeholders

### Origin
Choose the most appropriate category:
- **User Research** - Insight from customer studies, interviews, surveys
- **Business Metric** - Driven by KPIs, revenue, growth targets
- **Competitor Analysis** - Response to market competition
- **Stakeholder Request** - Internal leadership or partner request
- **Technical Debt** - Infrastructure, maintenance, or platform improvements
- **Legal** - Compliance, regulatory, or legal requirements
- **Other** - Anything that doesn't fit above categories

### Description
- Brief 2-3 sentence summary
- What is being built and why
- Keep it high-level; details go in other sections

## Problem Statement

### Problem
- Articulate the core problem being solved
- Focus on user pain points, not solutions
- Include impact or consequences if not addressed

### Who (Target Users)
- Be specific about user segments
- Include relevant attributes (role, experience level, context)
- Consider primary vs. secondary users

### Outcome
- Define success criteria
- What changes for users when this is built?
- Link to measurable business outcomes where possible

## Context Section

### User Segments
- Detail different user types affected
- Note if behavior differs by segment
- Consider accessibility needs

### Current Workflow
- Document how users solve this today
- Include workarounds or hacks
- Note friction points in existing flow

## Assumptions

Document unvalidated beliefs that affect the design:
- User behavior assumptions
- Technical capability assumptions
- Business/market assumptions
- Resource availability assumptions

**Mark assumptions for validation early** - these often become questions or research tasks.

## Edge Cases

Consider scenarios like:
- First-time users vs. returning users
- Empty states and data limits
- Error conditions and failure modes
- Offline/degraded performance
- Accessibility requirements
- Localization and internationalization
- Privacy and security constraints
- Mobile vs. desktop differences
- Browser/platform compatibility

## Scope

### In Scope
- What gets built in this iteration
- Core functionality and key features
- Minimum viable requirements

### Out of Scope
- Explicitly call out what's NOT included
- Future enhancements to consider later
- Related work for other teams

### Technical Considerations
- Platform constraints
- Performance requirements
- Dependencies on other systems
- Security or compliance needs

## Open Questions

### Question Types
- **User** - About user needs, behavior, preferences
- **Design** - About interface, interaction, visual design
- **Technical** - About feasibility, implementation, performance
- **Business** - About strategy, pricing, go-to-market

### Good Questions
- Specific and answerable
- Include context on why it matters
- Note who can answer it
- Track status (Open → Answered)

## Actions

**Actions are design-focused tasks for product designers.** Track concrete next steps in your design process:
- **User research tasks** - Interviews, surveys, usability tests to validate assumptions
- **Design deliverables** - Wireframes, prototypes, mockups, design specs
- **Design exploration** - Concept sketches, alternative approaches, design patterns to investigate
- **Stakeholder reviews** - Design critiques, feedback sessions, alignment meetings
- **Design decisions** - Choices that need to be made about interactions, flows, or visual direction

**Not for development tasks** - Engineering work, implementation details, or technical tickets belong elsewhere. Keep actions focused on design work needed before handoff.

Use checkboxes to track completion.

## Notes

Capture anything that doesn't fit elsewhere:
- Meeting notes or decisions
- Links to related documents
- Historical context
- Constraints or limitations
- Ideas for future consideration

## Best Practices

### Start with "Why"
Always begin by understanding the problem before jumping to solutions.

### Be Specific
Vague requirements lead to rework. Include concrete examples.

### Question Assumptions
Challenge beliefs early. Validate with users when possible.

### Consider Edge Cases
The happy path is just the beginning. Think through complications.

### Document Decisions
Capture why choices were made for future context.

### Update as You Learn
Requirements evolve. Keep the analysis current as you discover new information.

### Collaborate Early
Share analyses with stakeholders to align understanding before detailed design work.

## AI-Powered Analysis

### Using the Text Analysis Feature

1. **Paste raw content** from Jira tickets, emails, Slack threads, or documents
2. **Add GitHub token** with "models" permission for AI extraction
3. **Review extracted fields** before applying to ensure accuracy
4. **Edit any fields** that need refinement after import

### What the AI Extracts
- Feature overview and metadata
- Problem statements and user context
- Assumptions and open questions
- Action items and next steps
- Additional notes

### Tips for Better AI Results
- Include complete context in pasted text
- Keep formatting minimal (plain text works best)
- Review and refine extracted information
- Cross-check against source material

The AI accelerates initial analysis but human review ensures quality and completeness.
