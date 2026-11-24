# VSPH CRM — Contact detail UI/UX improvement

**Date:** 24 November 2026  
**Decision owner:** Ayan Khan  
**Status:** Redesign implemented on feature branch for local review; full build/browser/API validation pending.  
**Implementation owner:** ChatGPT (in collaboration with Ayan Khan). No separate coding agent is required.  
**Scope:** Contact detail workspace under /v2/contacts, not a global CRM redesign.

## 1. Context and source of truth

The existing contact detail page feels like a database record viewer rather than a customer relationship workspace. The screenshot and source review identified unused header space, clipped content, independently scrolling panels, dense bordered property rows, small uppercase labels, duplicate edit actions, inconsistent brand colors/shadows, and a narrow activity composer.

- [frontend/DESIGN.md](../frontend/DESIGN.md) is the controlling visual and accessibility specification; leave it unchanged.
- [ConDetailView.jsx](../frontend/src/components/ConDetailView.jsx) is the primary contact-detail implementation (approximately 1,295 lines at review).
- [Contacts.jsx](../frontend/src/pages/Contacts.jsx) owns the contact list and detail entry.
- [dashboardLayout.jsx](../frontend/src/components/v2/dashboardLayout.jsx) is relevant to the scroll/height contract.
- [Button.jsx](../frontend/src/components/ui/Button.jsx), [index.css](../frontend/src/index.css), and [package.json](../frontend/package.json) were reviewed for motion and dependencies.
- Source review found a Log Call shortcut without a handler, buttons nested inside the overflow trigger, duplicate Edit actions, and an email form whose mailto action discards the entered subject/body. The Email timeline currently falls back to combined call/task records. Reverify these findings against the implementation baseline before changing code.

## 2. Approved design direction

**Concept A — activity-first contact workspace.** Attio-inspired information architecture and Linear-inspired interaction quality, with VSPH's own identity. Concept B (record-first) and Concept C (three-column layout) were considered but not selected: the former retains too much of the current emphasis; the latter risks crowding laptop screens.

Design personality: professional, restrained, precise, trustworthy, enterprise-grade. The purpose is faster daily work, not cosmetic novelty.

### Visual contract

- Brand navy #00255A; core blue #0069C8; light blue #50C0E8; neutral grey #F1F2F2; white #FFFFFF. Use existing semantic tokens and verified contrast pairings. Blue is reserved for actionable elements; light blue is selective.
- Inter, weights 400/500/600/700 for ordinary application content; follow DESIGN.md typography, sentence case and hierarchy. Use an appropriate compact application hierarchy without tiny uppercase labels. Do not create new brand typography.
- 8px spacing rhythm (8/16/24/32/48/64px; 4px only for optical adjustments); disciplined 12-column desktop grid and 4-column mobile grid with 20–24px margins as appropriate.
- Flat surfaces, restrained separators, minimal borders, no decorative shadows, gradients, glassmorphism, excessive rounding or decorative pixel motifs.
- Consistent outline icons, accessible labels for unfamiliar icons, visible focus, minimum 44×44px targets, 4.5:1 normal text contrast and 3:1 qualifying large text. Never rely on color alone for state.
- Preserve existing global navigation, logo and brand identity.

### Layout and navigation

- Fix the underlying height/overflow contract, not just the screenshot: the detail workspace should use available vertical space, with one primary document/workspace scroll rather than competing nested scrollbars. Avoid hard-coded heights and clipped composer controls. Scope any shared shell changes so unrelated pages do not regress.
- Maintain a clear route/back-to-contacts interaction and existing contact entry behavior; preserve navigation context where feasible.
- Compact identity header: initials-based avatar, full name, record code, human-readable call status (e.g. Connected), and owner. Do not invent missing data. Remove the wide, repetitive highlights strip.
- Primary header action: Log call (opens/focuses the composer); secondary Edit contact; overflow holds lower-frequency actions such as Add to campaign, Copy contact ID (proposed client-side convenience) and Delete contact, subject to existing permissions. One dominant CTA per state; avoid duplicating edit or competing primary buttons. If the composer is open, the relevant save action is the primary form CTA.
- Main tabs: Overview (formerly Details) and Opportunities. Switching tabs is immediate; no theatrical page transitions. Preserve opportunity data, links and empty states.
- Desktop: contact context on the left (4/12 columns), activity workspace on the right (8/12 columns), adaptive widths and consistent gaps.
- Tablet: adaptive columns; stack when width becomes insufficient. Mobile: single column, identity and quick actions first, activity history next, expandable contact properties afterward. No horizontal overflow; long names, emails and URLs wrap or truncate accessibly.

### Contact properties

- Keep essential fields visible: professional email, mobile/phone, account, designation, contact owner and relevant campaign information. Use meaningful missing-value labels (Not provided / Not assigned as appropriate) instead of ambiguous dashes.
- Provide copy affordances for suitable values, mailto/tel links only when a usable address/number exists, and preserve account/profile navigation. A missing phone must not prevent logging a historical call.
- Group secondary fields by purpose: professional information, additional identity/communication information, address/location information, campaign and project, and specialized pickup/drop logistics as applicable. Keep secondary groups collapsible by default; allow easy access to every existing field.
- Preserve all existing field semantics: names/salutation/suffix, contact status and call/email/phone statuses, personal/alternate contact methods, role/department/industry/segment/level/company size, profile/navigator links, partner and TPID, all address/location and logistics values. Do not change data schema or silently remove fields.
- Avoid repetitive grids of bordered cells; use clear label/value grouping and subtle section separators.

### Activity composer

- Quick actions: Log a call, Create task, Compose email. Composer expands on demand; do not permanently consume space with a large form.
- Call: retain existing supported subject/outcome semantics (including custom subject where supported) and notes; verify against current API rather than inventing new outcome fields.
- Task: retain subject, description, priority, due date/time and other existing API behavior.
- Email: preserve recipient selection semantics; pass encoded subject/body into the mail client and label the action honestly as Open email client. Do not imply in-app delivery, delivery confirmation or email history without a real backend capability.
- Preserve unsaved drafts when switching modes or collapsing; reset only on explicit reset, successful save, or deliberate discard. Prevent draft leakage between contacts. Focus the relevant control on opening, retain input on failure, and avoid duplicate submissions.
- Specific validation, loading, disabled, empty and error states. Confirm successful persistence before displaying success.

### Unified activity history

- Independent of the active composer; default All activity, with Calls and Tasks filters and chronological newest-first ordering.
- Reuse actual existing call/task records and display subject, notes when available, author, real timestamp, and task priority/due/status where supported. Distinguish activity creation time from due dates. Do not fabricate timestamps, sample activity or email events.
- New confirmed records appear without full-page reload or unnecessary list reanimation. Empty and loading/error states must be distinct and useful.
- Opportunities view remains functional and visually consistent; do not introduce new data or workflows outside scope.

## 3. Motion references and adopted principles

External guidance reviewed:
- [find-animation-opportunities](https://github.com/emilkowalski/skills/tree/main/skills/find-animation-opportunities) — choose motion by frequency and purpose.
- [animate](https://github.com/emilkowalski/skills/tree/main/skills/animate) and its [recipes](https://github.com/emilkowalski/skills/blob/main/skills/animate/RECIPES.md) — duration, easing, origin, interruptibility and performance.
- [review-animations](https://github.com/emilkowalski/skills/tree/main/skills/review-animations) — final motion quality review; consult its STANDARDS.md before review.
- [pick-ui-library](https://github.com/emilkowalski/skills/tree/main/skills/pick-ui-library) — use CSS for simple transitions; evaluate dependencies only when necessary.

These are reference skills, not separate agents or installed runtime dependencies. ChatGPT will apply their guidance directly. The repository's DESIGN.md takes precedence for visual identity.

Motion must serve feedback, spatial continuity or state indication. High-frequency/keyboard navigation is instant; frequent actions receive subtle feedback; occasional overlays may use short purposeful transitions. No animation may block an interaction.

### Motion tokens (proposed scoped CSS)

| Token | Value | Use |
| --- | --- | --- |
| --motion-instant | 0ms | Navigation/keyboard shortcuts |
| --motion-fast | 100ms | Release/quick response |
| --motion-micro | 160ms | Press and confirmation |
| --motion-standard | 200ms | Popovers, accordions, composer |
| --motion-deliberate | 250ms | Dialogs |

```css
:root {
  --motion-instant: 0ms;
  --motion-fast: 100ms;
  --motion-micro: 160ms;
  --motion-standard: 200ms;
  --motion-deliberate: 250ms;
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}
```

Use these as initial budgets, not mandatory delays. Scope changes to this workspace or reusable components with verified compatibility.

### Approved micro-interactions

| Pattern | Behavior | Timing and constraints |
| --- | --- | --- |
| Tactile action buttons | Scale to 0.97 while pressed, return to 1 on release; color/focus feedback | 160ms press, 100ms release, ease-out; no bounce or lifting; keyboard focus stays visible |
| Overflow dropdown | Anchored transform origin at trigger; scale 0.95 to 1 + opacity | 200ms ease-out; smooth reversible close; no nested buttons; Escape, outside click, keyboard navigation and focus restoration |
| Contact accordions and composer | Measured height + opacity; synchronized chevron rotation for accordion | 200ms ease-out; retarget from current state on repeated toggles; handle changing content and resize; collapsed content not focusable |
| Edit/campaign/delete dialogs | Centered scale 0.96 to 1 + opacity with backdrop opacity | 250ms ease-out; focus containment/restoration, keyboard dismissal where safe, ordinary explicit delete confirmation |
| Activity saving | Immediate Saving state, duplicate-submit protection, confirmed success/check or clear error | 160ms feedback transition, no artificial network delay; preserve draft on error; update history only from confirmed data |

Use meaningful instant copy feedback and readable textual status; do not add unnecessary animation just because an action exists. No fake success, fabricated activity or delivery confirmation.

### Motion guardrails

- Prefer explicit transform/opacity transitions; no transition-all in redesigned components. Measured accordion height is a justified layout-animation exception. Avoid blanket will-change or layout thrashing.
- Respect prefers-reduced-motion: remove scaling, translation, rotation and animated height; retain immediate or gentle opacity/color feedback. Loading state remains understandable without a spinner animation.
- Gate hover-specific effects using @media (hover: hover) and (pointer: fine). Preserve touch and keyboard functionality.
- Make rapid interactions interruptible with CSS transitions or equivalent; no restarting keyframes for toggles.
- Do not animate whole-page entry, tab content on every switch, contact field stagger, avatars, status pulses, hover-lift cards, confetti, scroll reveals, or decorative bounce. Keep transitions under 300ms in this scope.
- Retain existing React Hot Toast; no new toast or motion library planned. React, Tailwind v4 and Lucide are present; Framer Motion is absent. CSS-first. Consider Base UI only if existing primitives cannot provide accessible menu/dialog behavior; document and justify any dependency before adding it.
- Current shared Button uses transition-all and stylesheet has 400ms entrance effects. Avoid those effects in this workspace; any global refactor requires regression checks.

## 4. Implementation roadmap

| Phase | Work | Priority |
| --- | --- | --- |
| 1 | Fix clipping, scrolling, responsive workspace foundation, missing shortcut handler and invalid dropdown nesting | P0 |
| 2 | Build compact identity header, 4+8 layout, property groups, composer, unified activity history | P1 |
| 3 | Introduce scoped motion tokens, focus, press states and accessibility primitives | P1 |
| 4 | Integrate the five approved motion patterns, draft handling and honest saving feedback | P1 |
| 5 | Polish Opportunities, loading/empty/error states, mobile/tablet layouts and existing workflows | P2 |
| 6 | Validate API compatibility, role permissions, responsiveness, keyboard/reduced motion and motion craft; review and document results | Required before completion |

Keep changes focused and componentized where useful; preserve existing API contracts and role/module permissions. No backend, schema, global navigation or unrelated page redesign is planned. If a real blocker demands a scope change, record the reason and impact rather than silently expanding the work.

## 5. Acceptance criteria / verification checklist

- [ ] Contact detail fills available space; all sections and controls reachable without clipping or competing vertical scroll containers.
- [ ] Desktop (including laptop-size viewport), tablet and mobile layouts work; no horizontal overflow with long names or values.
- [ ] Existing brand tokens, Inter, sentence case, flat surfaces, spacing and target/contrast requirements verified against DESIGN.md.
- [ ] Header actions work, edit is not duplicated, overflow is accessible, destructive action explicitly confirmed, existing role/module permissions preserved.
- [ ] All existing contact fields and linked-record behaviors remain accessible; correct handling of missing values.
- [ ] Call/task workflows work with real API data; draft preservation, validation, duplicate-submit prevention, failure recovery and confirmed success verified.
- [ ] Email opens the mail client with correct recipient and encoded subject/body; no false sent status or mislabeled activity history.
- [ ] Unified activity defaults to actual call/task history and filters independently of composer; no fabricated events or timestamps; Opportunities works.
- [ ] Motion timings/origins match plan; rapid open-close and mode switches work; reduced-motion, touch, focus, Escape and keyboard navigation tested.
- [ ] No new animation dependency without documented justification; no unrelated behavior regressions.
- [ ] Run frontend lint/build and relevant functional/browser tests; report actual results and limitations, not assumed passes. Check browser console and motion performance where available.
- [ ] Apply review-animations standards to implemented diff and inspect actual rendered UI, including mobile and reduced-motion state, before declaring completion.

## 6. Decision log and change control

- 2026-11-24: Ayan Khan approved Concept A, the activity-first contact workspace, and requested purposeful high-end micro-interactions.
- 2026-11-24: CSS-first motion plan adopted using Emil Kowalski's skills as guidance. No separate agent installation required.
- 2026-11-24: User requested this durable repository log for future reference. This is the approved design baseline; it is not evidence that the redesign has shipped.

Future work: reference this file together with frontend/DESIGN.md before editing the contact workspace. Record material deviations with date, reason, tradeoff and validation outcome. Update implementation status and evidence after the actual work is complete.

## 7. Implementation update — 24 November 2026

Feature branch: `feat/contact-workspace-redesign`. One organization PR after local acceptance; do not merge or deploy before review.

| Milestone | Implementation |
| --- | --- |
| M1 | Route-backed contact workspace; no overlay height trap; identity and primary navigation |
| M2 | Grouped fields, independent call/task timeline, expandable composer, honest mail-client action, opportunities |
| M3 | Scoped CSS motion, native workspace dialogs, anchored menu, focus and reduced-motion handling |
| M4 | Existing VSPH logo in navigation, source-derived 64x64 favicon, browser title |
| M5 | Repeatable utility tests and local browser/API verification checklist |

The original Add to Campaign opened a create-campaign modal and the contact editor did not load its campaign choices. The feature uses the existing contact update workflow with permission-aware campaign loading and a focused campaign selection, not a new backend mutation. Keep the standard modal path for unrelated screens. The favicon is cropped from existing brand artwork rather than a newly invented logo. No animation dependency introduced; no changes to DESIGN.md, API or schema.

Implementation commits: `c86d3cb` (workspace), `cb73b88` (motion and brand), followed by the verification/polish commit. See [contact-workspace-verification.md](contact-workspace-verification.md) for local commands, the test matrix and limitations. Seven utility tests passed using Node.js 22 against a blob-matched copy of the utility module; full Vite/lint/browser/API verification remains pending. No upstream repository changes.

## 8. Development-only preview — 24 November 2026

Added a seeded local preview using the actual contact components and shell, not a duplicate design. The Vite development-only entry injects synthetic session values and an isolated, in-memory API adapter. No credentials, backend environment, persistent data, or production auth bypass. Full, minimal and long-content contacts, reset, latency and failed-write controls. See [contact-preview.md](contact-preview.md) for local use and verification. Real backend startup troubleshooting remains outside the visual PR.

## 9. Visual reference parity — 24 November 2026

Local preview screenshots revealed divergence from the approved visual reference and a clipped full-page capture. Refined the actual shared components: reference-style breadcrumb, spacious identity card and plain status indicator, six compact label/value rows with one View all contact details disclosure, primary quick action, reference-aligned panel padding/empty activity state and 1:1.94 columns. Preserve all properties, existing VSPH artwork, accessible motion and one filled primary CTA per state (the reference showed two). Contact detail routes use normal document flow; other modules retain the existing shell. Reset scroll on contact change; remove the contact editor's orphaned body scroll lock. Added a synthetic reference scenario and clean preview URL. Full-page screenshots and browser parity remain to be verified locally; this is not a claim of pixel-perfect validation.

## 10. Activity composer refinement — 24 November 2026

Local visual feedback: required asterisks appeared on their own grid row. Wrap each required label and its indicator in one inline text element; preserve native required validation and use restrained accessible red for the indicator. Replace the composer Reset action with Cancel, and remove the redundant top-right collapse control. Cancel closes the composer, restores focus to the selected quick action, clears transient messages, and preserves the unsaved per-mode draft for reopening (no API call). Disable cancellation while a save is pending. Apply to call, task and email composer modes in the shared component, including preview. No changes to the design system or backend.

## 11. Contact summary alignment — 24 November 2026

Local feedback identified ragged right-aligned values and awkward mid-address line breaks. Use one fixed/proportional label track and one flexible left-aligned value track across every summary row. Email and phone use single-line ellipsis only when needed, with their full underlying link and copy value intact, a native title on the text, and fully readable professional email/mobile in expanded details. Non-identifier text such as account, designation and campaign wraps normally when needed; copy controls retain 44px targets. Do not alter the shared design standard or backend.

## 12. Contact identity simplification — 24 November 2026

User approved removing the Connected/call-status indicator and duplicated owner text from the identity header. This supersedes the earlier header specification for those two fields. Retain contact owner in the summary and call status in expanded Additional information. Reduce the header height to fit the name, avatar, record code and existing permitted actions; vertically center the identity and actions. No data or workflow removed.

## 13. Breadcrumb simplification — 24 November 2026

Remove the duplicate contact record code and separator from the breadcrumb. Keep only the back-to-Contacts action; retain the code in the identity header and existing copy-ID action.

## 14. Quick actions copy reduction — 24 November 2026

Remove the redundant helper sentence below quick action buttons. Preserve balanced bottom padding when the composer is closed and retain existing open-composer spacing.

## 15. Expanded contact details alignment — 24 November 2026

Apply the summary's two-column label/value grid, typography, spacing and copy-button treatment to every expanded property group using the common Property styles. Keep all values left aligned, preserve full readable expanded email/phone values, and keep external-link icons alongside single-line ellipsized URL labels with full destinations and titles intact. Long descriptive values may wrap; no fields or accordion behavior removed.
